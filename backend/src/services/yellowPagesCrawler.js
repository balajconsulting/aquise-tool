const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const antiBot = require('./antiBot');
const { solveRecaptchaAudio } = require('./antiBot');
puppeteer.use(StealthPlugin());

function decodeBase64(str) {
  try {
    return Buffer.from(str, 'base64').toString('utf-8');
  } catch {
    return '';
  }
}

/**
 * Crawlt Gelbe Seiten nach Leads.
 * @param {Object} options
 * @param {string} options.suchbegriff - Suchbegriff/Branche
 * @param {string} options.stadt - PLZ oder Stadt
 * @param {number|null} [options.limit=null] - Maximale Anzahl Leads (null/0 = alle)
 * @param {number} [options.umkreis=50000] - Umkreis in Metern (z.B. 999999 für ganz Deutschland)
 * @param {function} [options.log] - Logging-Funktion
 * @param {function} [options.onBatch] - Callback für Batch-Verarbeitung
 * @param {number} [options.startPage=1] - Startseite
 * @returns {Promise<Array>} Gefundene Leads
 */
async function scrapeYellowPages({ suchbegriff, stadt, limit = null, umkreis = 50000, log = () => {}, onBatch = null, startPage = 1 }) {
  return antiBot.withRetries(async () => {
    const browser = await puppeteer.launch({ headless: true, args: [] });
    const page = await browser.newPage();
    await page.setUserAgent(antiBot.getRandomUserAgent());
    const url = `https://www.gelbeseiten.de/suche/${encodeURIComponent(suchbegriff)}/${encodeURIComponent(stadt)}?umkreis=${umkreis}`;
    log(`Starte Crawl: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    let results = [];
    let pageNum = startPage;
    let hasNext = true;
    let totalFetched = 0;

    // Korrigierte Logik: Wenn limit null oder 0, dann unbegrenzt crawlen
    const unlimited = !limit || limit === 0;

    // 1. Initiale Einträge scrapen und speichern
    let lastCount = 0;
    let entries = await page.$$eval('article.mod-Treffer', nodes => nodes.map(node => {
      const name = node.querySelector('h2.mod-Treffer__name')?.innerText?.trim() || '';
      const adresse = node.querySelector('div.mod-AdresseKompakt__adress-text')?.innerText?.replace(/\s+/g, ' ').trim() || '';
      const telefon = node.querySelector('div.mod-TelefonnummerKompakt a')?.innerText?.trim() || '';
      let webseite = '';
      const webEl = node.querySelector('div.mod-WebseiteKompakt span');
      if (webEl && webEl.getAttribute('data-webseitelink')) {
        webseite = webEl.getAttribute('data-webseitelink');
      }
      const bewertung = node.querySelector('span.mod-BewertungKompakt__number')?.innerText?.trim() || '';
      const branche = node.querySelector('p.mod-Treffer--besteBranche')?.innerText?.trim() || '';
      return { name, adresse, telefon, webseite, bewertung, branche };
    }));
    log(`Initial gescrapte Einträge: ${entries.length}`);
    for (const entry of entries) {
      if (entry.webseite) entry.webseite = decodeBase64(entry.webseite);
    }
    // Speichere initiale Einträge
    for (const lead of entries) {
      await new Promise((resolve, reject) => {
        require('../models/lead').exists({ firm_name: lead.name, domain: lead.webseite, phone: lead.telefon }, (err, exists) => {
          if (err) return reject(err);
          if (exists) {
            log(`Duplikat gefunden, wird übersprungen: ${lead.name} (${lead.webseite || lead.telefon})`);
            return resolve();
          }
          log(`Speichere Lead: ${JSON.stringify(lead)}`);
          require('../models/db').query(
            'INSERT INTO leads (firm_name, domain, phone, score, category, last_checked) VALUES (?, ?, ?, ?, ?, NOW())',
            [lead.name, lead.webseite, lead.telefon, 0, lead.branche || 'Crawler'],
            (err2) => {
              if (err2) log(`Insert-Fehler: ${err2.message}`);
              resolve();
            }
          );
        });
      });
    }
    lastCount = entries.length;
    // 2. Mehr Anzeigen Schleife
    let loadMoreBtn = await page.$('#mod-LoadMore--button');
    let noNewEntriesTries = 0;
    while (loadMoreBtn && (unlimited || lastCount < limit) && noNewEntriesTries < 3) {
      log('Klicke auf "Mehr Anzeigen" ...');
      await page.evaluate(() => document.querySelector('#mod-LoadMore--button').click());
      await new Promise(res => setTimeout(res, 1800));
      let newCount = await page.$$eval('article.mod-Treffer', nodes => nodes.length);
      if (newCount > lastCount) {
        // Nur die neuen Einträge scrapen und speichern!
        let newEntries = await page.$$eval(
          `article.mod-Treffer:nth-child(n+${lastCount + 1})`,
          nodes => nodes.map(node => {
            const name = node.querySelector('h2.mod-Treffer__name')?.innerText?.trim() || '';
            const adresse = node.querySelector('div.mod-AdresseKompakt__adress-text')?.innerText?.replace(/\s+/g, ' ').trim() || '';
            const telefon = node.querySelector('div.mod-TelefonnummerKompakt a')?.innerText?.trim() || '';
            let webseite = '';
            const webEl = node.querySelector('div.mod-WebseiteKompakt span');
            if (webEl && webEl.getAttribute('data-webseitelink')) {
              webseite = webEl.getAttribute('data-webseitelink');
            }
            const bewertung = node.querySelector('span.mod-BewertungKompakt__number')?.innerText?.trim() || '';
            const branche = node.querySelector('p.mod-Treffer--besteBranche')?.innerText?.trim() || '';
            return { name, adresse, telefon, webseite, bewertung, branche };
          })
        );
        log(`Neue gescrapte Einträge: ${newEntries.length}`);
        for (const entry of newEntries) {
          if (entry.webseite) entry.webseite = decodeBase64(entry.webseite);
        }
        for (const lead of newEntries) {
          await new Promise((resolve, reject) => {
            require('../models/lead').exists({ firm_name: lead.name, domain: lead.webseite, phone: lead.telefon }, (err, exists) => {
              if (err) return reject(err);
              if (exists) {
                log(`Duplikat gefunden, wird übersprungen: ${lead.name} (${lead.webseite || lead.telefon})`);
                return resolve();
              }
              log(`Speichere Lead: ${JSON.stringify(lead)}`);
              require('../models/db').query(
                'INSERT INTO leads (firm_name, domain, phone, score, category, last_checked) VALUES (?, ?, ?, ?, ?, NOW())',
                [lead.name, lead.webseite, lead.telefon, 0, lead.branche || 'Crawler'],
                (err2) => {
                  if (err2) log(`Insert-Fehler: ${err2.message}`);
                  resolve();
                }
              );
            });
          });
        }
        lastCount = newCount;
        noNewEntriesTries = 0;
      } else {
        noNewEntriesTries++;
        log(`Kein Zuwachs an Einträgen (${noNewEntriesTries}/3)`);
      }
      loadMoreBtn = await page.$('#mod-LoadMore--button');
    }

    await browser.close();
    log(`Crawl abgeschlossen. Gefundene Einträge: ${results.length}`);
    return results.slice(0, unlimited ? undefined : limit);
  }, 3, log);
}

module.exports = { scrapeYellowPages }; 