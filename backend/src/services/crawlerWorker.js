const db = require('../models/db');
const { scrapeYellowPages } = require('./yellowPagesCrawler');
const Lead = require('../models/lead');
// Import des Socket-Service statt direkter Abhängigkeit von index.js
const socketService = require('./socketService');

// Nicht-rekursive Batch-Status-Funktion für den Worker
async function sendCurrentBatchStatusNonRecursive() {
  return new Promise((resolve, reject) => {
    db.query('SELECT COUNT(*) AS total FROM leads WHERE domain IS NOT NULL AND domain != ""', (err, totalRows) => {
      if (err) return reject(err);
      const total = totalRows[0].total;
      const batchSize = 8;
      db.query('SELECT * FROM leads WHERE domain IS NOT NULL AND domain != "" ORDER BY id ASC LIMIT ?', [batchSize], (err2, leads) => {
        if (err2) return reject(err2);
        if (leads.length === 0) {
          const emptyResponse = { queue: [], current: null, results: [], progress: { processed: 0, total } };
          socketService.broadcastScoringStatus(emptyResponse);
          return resolve();
        }
        const firstUnscoredIdx = leads.findIndex(l => l.score === null || l.score === 0);
        const ids = leads.map(l => l.id);
        db.query('SELECT id, score FROM leads WHERE id IN (?) AND score IS NOT NULL AND score > 0', [ids], (err3, results) => {
          if (err3) return reject(err3);
          db.query('SELECT COUNT(*) AS processed FROM leads WHERE score IS NOT NULL AND score > 0 AND domain IS NOT NULL AND domain != ""', (err4, processedRows) => {
            if (err4) return reject(err4);
            const response = {
              queue: leads,
              current: leads[firstUnscoredIdx],
              results: results || [],
              progress: { processed: processedRows[0].processed, total }
            };
            socketService.broadcastScoringStatus(response);
            resolve();
          });
        });
      });
    });
  });
}

async function runCrawlerWorker() {
  while (true) {
    // Suche einen pending Job (egal ob Crawling oder Scoring)
    const [job] = await new Promise((resolve, reject) => {
      db.query("SELECT * FROM crawler_jobs WHERE status = 'pending' ORDER BY id ASC LIMIT 1", (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
    if (!job) {
      await new Promise(r => setTimeout(r, 5000)); // 5s warten, wenn kein Job
      continue;
    }
    // Setze Job auf running
    await new Promise((resolve, reject) => {
      db.query('UPDATE crawler_jobs SET status = ?, started_at = NOW() WHERE id = ?', ['running', job.id], (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
    let logLines = [];
    const log = (msg) => {
      const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
      logLines.push(line);
      console.log(line);
    };
    try {
      if (job.type === 'Scoring') {
        log('Starte Scoring-Job...');
        // Hole alle Leads ohne Score oder mit Score = 0
        await new Promise((resolve, reject) => {
          db.query('SELECT * FROM leads WHERE score IS NULL OR score = 0', async (err, leads) => {
            if (err) return reject(err);
            let scored = 0;
            const total = leads.length;
            // Setze total_leads im Job
            await new Promise((res2, rej2) => {
              db.query('UPDATE crawler_jobs SET total_leads=? WHERE id=?', [total, job.id], (e) => e ? rej2(e) : res2());
            });

            // Verarbeite Leads in 8er-Batches für die Queue-Ansicht
            for (let i = 0; i < leads.length; i += 8) {
              // Hole die nächsten 8 Leads (oder weniger, falls am Ende)
              const batchLeads = leads.slice(i, i + 8);
              console.log('[Worker] Sende Batch:', batchLeads.map(l => l.id));
              
              // Sende initialen Batch-Status (nicht-rekursiv)
              await sendCurrentBatchStatusNonRecursive();
              
              // Verarbeite jeden Lead im aktuellen Batch
              for (let j = 0; j < batchLeads.length; j++) {
                const lead = batchLeads[j];
                console.log(`[Worker] Starte Bewertung für Lead: ${lead.id}, ${lead.firm_name}`);
                
                // Markiere den aktuellen Lead als "wird bewertet"
                socketService.broadcastScoringStatus({
                  queue: batchLeads,
                  current: lead,
                  progress: { processed: scored, total }
                });
                
                // Führe das Scoring für den aktuellen Lead durch
                const { scoreLead } = require('./scoringWorker');
                const result = await scoreLead(lead);
                console.log(`[Worker] Lead bewertet: ${lead.id}, Score: ${result.score}`);
                
                // Aktualisiere die Datenbank
                await new Promise((res3, rej3) => {
                  db.query('UPDATE leads SET score=?, category=?, last_checked=NOW(), scoring_details=? WHERE id=?', 
                    [result.score, result.category, JSON.stringify(result.details), lead.id], 
                    (err2) => err2 ? rej3(err2) : res3()
                  );
                });
                
                // Inkrementiere den Zähler
                scored++;
                
                // Hole die neuesten Ergebnisse für alle Leads im aktuellen Batch
                const batchIds = batchLeads.map(l => l.id);
                const batchResults = await new Promise((res4, rej4) => {
                  db.query('SELECT id, score FROM leads WHERE id IN (?)', [batchIds], 
                    (err3, results) => err3 ? rej4(err3) : res4(results)
                  );
                });
                
                // Aktualisiere den Fortschritt und sende ein Update via WebSocket
                await new Promise((res2, rej2) => {
                  db.query('UPDATE crawler_jobs SET processed_leads=? WHERE id=?', [scored, job.id], (e) => e ? rej2(e) : res2());
                });
                
                // Sende nach jedem Lead den aktuellen Batch-Status (nicht-rekursiv)
                await sendCurrentBatchStatusNonRecursive();
              }
            }
            
            log(`Bewertete Leads: ${scored}`);
            resolve();
          });
        });
        await new Promise((resolve, reject) => {
          db.query('UPDATE crawler_jobs SET status = ?, finished_at = NOW(), error = NULL, lead_count = (SELECT COUNT(*) FROM leads WHERE score IS NOT NULL AND score > 0) WHERE id = ?', ['finished', job.id], (err) => {
            if (err) return reject(err);
            resolve();
          });
        });
        log('Scoring-Job abgeschlossen!');
        // Abschließendes Update senden
        socketService.broadcastScoringStatus({
          queue: [],
          current: null,
          results: [],
          progress: { processed: 0, total: 0 }
        });
      } else if (job.source === 'Gelbe Seiten') {
        // Parameter extrahieren (Suchbegriff und Ort/PLZ aus Job)
        const suchbegriff = job.searchTerm;
        const ort = job.ort;
        const limit = (job.leadLimit === undefined || job.leadLimit === null) ? 20 : job.leadLimit;
        const umkreis = job.umkreis || 50000;
        if (!suchbegriff || !ort) {
          log(`Fehler: Suchbegriff und Ort/PLZ müssen im Job gesetzt sein!`);
          await new Promise((resolve, reject) => {
            db.query('UPDATE crawler_jobs SET status = ?, finished_at = NOW(), error = ? WHERE id = ?', ['error', 'Fehlende Parameter', job.id], (err2) => {
              if (err2) return reject(err2);
              resolve();
            });
          });
          continue;
        }
        log(`Starte Crawl für: Gelbe Seiten`);
        log(`Parameter: Suchbegriff='${suchbegriff}', Ort/PLZ='${ort}', Lead-Limit=${limit}, Umkreis=${umkreis}`);
        // Versuche, die Gesamtanzahl der Treffer vorab zu ermitteln (aus der Seite)
        let totalLeads = null;
        try {
          const browser = await require('puppeteer').launch({ headless: true, args: [] });
          const page = await browser.newPage();
          await page.goto(`https://www.gelbeseiten.de/suche/${encodeURIComponent(suchbegriff)}/${encodeURIComponent(ort)}?umkreis=${umkreis}`, { waitUntil: 'domcontentloaded' });
          totalLeads = await page.$eval('#mod-TrefferlisteInfo', el => {
            const match = el.innerText.match(/\((\d+) Treffer\)/);
            return match ? parseInt(match[1], 10) : null;
          });
          await browser.close();
        } catch (e) {
          log('Konnte Gesamtanzahl der Treffer nicht ermitteln: ' + e.message);
        }
        if (totalLeads) {
          await new Promise((resolve, reject) => {
            db.query('UPDATE crawler_jobs SET total_leads=? WHERE id=?', [totalLeads, job.id], (err) => err ? reject(err) : resolve());
          });
        }
        let leads = await scrapeYellowPages({ suchbegriff, stadt: ort, limit, umkreis, log });
        log(`Gefundene Leads: ${leads.length}`);
        // Leads als Batch speichern (ohne vorherige Duplikatsprüfung)
        if (leads.length > 0) {
          const values = leads.map(lead => [
            lead.name, lead.webseite, lead.telefon, 0, lead.branche || 'Crawler'
          ]);
          const sql = `
            INSERT INTO leads (firm_name, domain, phone, score, category, last_checked)
            VALUES ?
            ON DUPLICATE KEY UPDATE last_checked = NOW()`;
          await new Promise((resolve, reject) => {
            db.query(sql, [values], (err, result) => {
              if (err) return reject(err);
              log(`Batch-Insert abgeschlossen: ${result.affectedRows} Zeilen verarbeitet.`);
              resolve();
            });
          });
        }
        // Job abschließen
        await new Promise((resolve, reject) => {
          db.query('UPDATE crawler_jobs SET status = ?, finished_at = NOW(), error = NULL WHERE id = ?', ['finished', job.id], (err) => {
            if (err) return reject(err);
            resolve();
          });
        });
        log(`Job abgeschlossen!`);
      }
    } catch (err) {
      console.error('[Worker] Fehler:', err.message);
      console.error(err.stack);
      await new Promise((resolve, reject) => {
        db.query('UPDATE crawler_jobs SET status = ?, finished_at = NOW(), error = ? WHERE id = ?', ['error', err.message, job.id], (err2) => {
          if (err2) return reject(err2);
          resolve();
        });
      });
    }
    // Log in DB speichern (optional: eigene Tabelle)
    await new Promise((resolve, reject) => {
      db.query('UPDATE crawler_jobs SET error = ? WHERE id = ?', [logLines.join('\n'), job.id], (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
}

if (require.main === module) {
  runCrawlerWorker();
}

module.exports = { runCrawlerWorker }; 