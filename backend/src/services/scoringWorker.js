const db = require('../models/db');
const axios = require('axios');
const { exec } = require('child_process');
const chromeLauncher = require('chrome-launcher');

// Hilfsfunktionen für Checks
async function checkSSL(domain) {
  try {
    const url = domain.startsWith('http') ? domain : `https://${domain}`;
    const res = await axios.get(url, { timeout: 5000 });
    return res.request.protocol === 'https:';
  } catch {
    return false;
  }
}

// Verbesserter Impressum-Check (Link-Text, href, Pattern)
async function checkImpressum(domain) {
  try {
    const url = domain.startsWith('http') ? domain : `https://${domain}`;
    const res = await axios.get(url, { timeout: 5000 });
    const html = res.data.toLowerCase();
    // Patterns für Impressum/Imprint/Legal Notice
    const impressumPatterns = [
      'impressum', 'imprint', 'legal notice', 'legal', 'legal-notice', 'mentions légales', 'mentions-legales'
    ];
    // Suche nach Link-Texten
    for (const pattern of impressumPatterns) {
      if (html.includes(`>${pattern}<`)) return true;
    }
    // Suche nach hrefs
    for (const pattern of impressumPatterns) {
      if (html.includes(`href="/${pattern}`) || html.includes(`href='/${pattern}`)) return true;
    }
    // Fallback: Pattern im HTML
    return impressumPatterns.some(pattern => html.includes(pattern));
  } catch {
    return false;
  }
}

async function checkSocialMedia(domain) {
  try {
    const url = domain.startsWith('http') ? domain : `https://${domain}`;
    const res = await axios.get(url, { timeout: 5000 });
    return /facebook|instagram|linkedin|twitter|youtube/i.test(res.data);
  } catch {
    return false;
  }
}

// Lighthouse-Integration (dynamischer Import, mit Fehlerbehandlung)
async function runLighthouse(domain) {
  if (!domain) return {
    mobile: true,
    performance: 80,
    seo: 80,
    bestPractices: 80,
    accessibility: 80,
    outdatedCMS: false,
    designOld: false,
    builtWithJimdoWix: false,
    lighthouse: null,
    lighthouseError: 'Keine Domain angegeben.'
  };
  const url = domain.startsWith('http') ? domain : `https://${domain}`;
  let chrome = null;
  let lighthouse;
  try {
    lighthouse = (await import('lighthouse')).default;
    chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
    const options = { logLevel: 'error', output: 'json', onlyCategories: ['performance', 'seo', 'best-practices', 'accessibility'], port: chrome.port };
    const runnerResult = await lighthouse(url, options);
    const lhr = runnerResult.lhr;
    return {
      mobile: lhr.categories['performance'].score > 0.5,
      performance: Math.round((lhr.categories['performance'].score || 0) * 100),
      seo: Math.round((lhr.categories['seo'].score || 0) * 100),
      bestPractices: Math.round((lhr.categories['best-practices'].score || 0) * 100),
      accessibility: Math.round((lhr.categories['accessibility'].score || 0) * 100),
      lighthouse: lhr,
      lighthouseError: null
    };
  } catch (e) {
    console.log('Lighthouse-Fehler:', e.message);
    // Fallback: Werte auf neutral setzen, damit das Scoring nicht zu hart ist
    return {
      mobile: true,
      performance: 80,
      seo: 80,
      bestPractices: 80,
      accessibility: 80,
      outdatedCMS: false,
      designOld: false,
      builtWithJimdoWix: false,
      lighthouse: null,
      lighthouseError: e.message
    };
  } finally {
    if (chrome) await chrome.kill();
  }
}

// Neues, faireres Punktesystem
const scoringRules = [
  { key: 'ssl', label: 'HTTPS + Zertifikat', points: 10, check: async (lead) => lead.domain ? await checkSSL(lead.domain) : false },
  { key: 'modernCMS', label: 'Modernes CMS', points: 10, check: async (lead, lh) => !lh.outdatedCMS },
  { key: 'perfBonus', label: 'Sehr gute Performance (>90)', points: 10, check: async (lead, lh) => lh.performance > 90 },
  { key: 'seoBonus', label: 'Sehr gutes SEO (>90)', points: 10, check: async (lead, lh) => lh.seo > 90 },
  { key: 'accessBonus', label: 'Sehr gute Barrierefreiheit (>90)', points: 10, check: async (lead, lh) => lh.accessibility > 90 },
  { key: 'bpBonus', label: 'Sehr gute Best Practices (>90)', points: 10, check: async (lead, lh) => lh.bestPractices > 90 },
  { key: 'impressum', label: 'Impressum vorhanden', points: 10, check: async (lead) => lead.domain ? await checkImpressum(lead.domain) : false },
  { key: 'social', label: 'Social Media vorhanden', points: 5, check: async (lead) => lead.domain ? await checkSocialMedia(lead.domain) : false },
  // Abzüge
  { key: 'noImpressum', label: 'Fehlendes Impressum', points: -20, check: async (lead) => lead.domain ? !(await checkImpressum(lead.domain)) : false },
  { key: 'noSSL', label: 'Kein HTTPS', points: -20, check: async (lead) => lead.domain ? !(await checkSSL(lead.domain)) : false },
  { key: 'outdatedCMS', label: 'Veraltetes CMS', points: -15, check: async (lead, lh) => lh.outdatedCMS },
  { key: 'performance', label: 'Performance < 50', points: -10, check: async (lead, lh) => lh.performance < 50 },
  { key: 'seo', label: 'SEO < 50', points: -10, check: async (lead, lh) => lh.seo < 50 },
  { key: 'accessibility', label: 'Barrierefreiheit < 50', points: -10, check: async (lead, lh) => lh.accessibility < 50 },
  { key: 'bestPractices', label: 'Best Practices < 50', points: -10, check: async (lead, lh) => lh.bestPractices < 50 },
];

async function detectCMS(domain) {
  if (!domain) return { name: null, version: null };
  const url = domain.startsWith('http') ? domain : `https://${domain}`;
  try {
    const res = await axios.get(url, { timeout: 5000 });
    const html = res.data;

    // WordPress
    if (/wp-content|wp-includes|wordpress/i.test(html)) {
      const match = html.match(/<meta name=["']generator["'] content=["']WordPress\s*([0-9.]+)?/i);
      return { name: 'WordPress', version: match ? match[1] : null };
    }
    // Joomla
    if (/Joomla!|joomla/i.test(html)) {
      const match = html.match(/<meta name=["']generator["'] content=["']Joomla!\s*-?\s*([0-9.]+)?/i);
      return { name: 'Joomla', version: match ? match[1] : null };
    }
    // Drupal
    if (/Drupal|drupal/i.test(html)) {
      const match = html.match(/<meta name=["']generator["'] content=["']Drupal\s*([0-9.]+)?/i);
      return { name: 'Drupal', version: match ? match[1] : null };
    }
    // Typo3
    if (/typo3/i.test(html)) {
      return { name: 'Typo3', version: null };
    }
    // Jimdo
    if (/jimdo/i.test(html)) {
      return { name: 'Jimdo', version: null };
    }
    // Wix
    if (/wix\.com|wix-code|wixsite/i.test(html)) {
      return { name: 'Wix', version: null };
    }
    // ... weitere Checks nach Bedarf

    return { name: null, version: null };
  } catch {
    return { name: null, version: null };
  }
}

function isOutdatedCMS(name, version) {
  if (!name || !version) return false;
  const v = parseFloat(version);
  if (name.toLowerCase().includes('wordpress')) return v < 5;
  if (name.toLowerCase().includes('joomla')) return v < 4;
  if (name.toLowerCase().includes('drupal')) return v < 9;
  return false;
}

async function scoreLead(lead) {
  if (!lead.domain || lead.domain.trim() === '') {
    return { score: 'none', category: 'None', details: ['Keine Website vorhanden – keine Bewertung durchgeführt.'] };
  }
  let score = 0;
  let details = [];
  let lh = await runLighthouse(lead.domain); // Lighthouse-Analyse
  const cmsInfo = await detectCMS(lead.domain);
  if (cmsInfo.name) {
    details.push(`CMS: ${cmsInfo.name}${cmsInfo.version ? ' ' + cmsInfo.version : ''}${isOutdatedCMS(cmsInfo.name, cmsInfo.version) ? ' (veraltet)' : ' (modern)'}`);
  } else {
    details.push('CMS: Nicht erkannt');
  }
  for (const rule of scoringRules) {
    let passed = false;
    try {
      if (rule.key === 'outdatedCMS') {
        passed = isOutdatedCMS(cmsInfo.name, cmsInfo.version);
      } else if (rule.key === 'modernCMS') {
        passed = cmsInfo.name && !isOutdatedCMS(cmsInfo.name, cmsInfo.version);
      } else {
        passed = await rule.check(lead, lh);
      }
    } catch {}
    details.push(`${rule.label}: ${passed ? 'JA' : 'NEIN'} (${passed ? rule.points : 0})`);
    if (passed) {
      score += rule.points;
    }
  }
  if (score < 0) score = 0;
  if (score > 100) score = 100;
  let category = 'Grün';
  if (score < 30) category = 'Rot';
  else if (score < 60) category = 'Gelb';
  return { score, category, details };
}

module.exports = { scoreLead }; 