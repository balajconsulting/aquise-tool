const CrawlerJob = require('../models/crawlerJob');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

exports.getAllJobs = (req, res) => {
  CrawlerJob.getAll((err, results) => {
    if (err) return res.status(500).json({ error: err });
    // Mapping für das Frontend
    const jobs = results.map(j => ({
      id: j.id,
      type: j.type || j.source || 'Crawling',
      status: j.status,
      started: j.started_at ? new Date(j.started_at).toLocaleString('de-DE') : '',
      duration: j.duration !== null ? new Date(j.duration * 1000).toISOString().substr(11, 8) : '',
      result: j.lead_count ? `${j.lead_count} Leads` : '-',
      error: j.error || null,
      processedLeads: j.processed_leads || 0,
      totalLeads: j.total_leads || 0
    }));
    res.json(jobs);
  });
};

exports.getJobById = (req, res) => {
  CrawlerJob.getById(req.params.id, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    if (results.length === 0) return res.status(404).json({ error: 'Job nicht gefunden' });
    const j = results[0];
    res.json({
      id: j.id,
      type: j.type || j.source || 'Crawling',
      status: j.status,
      started: j.started_at ? new Date(j.started_at).toLocaleString('de-DE') : '',
      duration: j.duration !== null ? new Date(j.duration * 1000).toISOString().substr(11, 8) : '',
      result: j.lead_count ? `${j.lead_count} Leads` : '-',
      error: j.error || null,
      processedLeads: j.processed_leads || 0,
      totalLeads: j.total_leads || 0
    });
  });
};

exports.createJob = (req, res) => {
  const job = {
    source: req.body.source,
    ort: req.body.ort,
    searchTerm: req.body.searchTerm,
    leadLimit: req.body.leadLimit,
    umkreis: req.body.umkreis,
    status: 'pending',
    started_at: new Date()
  };
  CrawlerJob.create(job, (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.status(201).json({ id: result.insertId, ...job });
  });
};

exports.updateJobStatus = (req, res) => {
  const { status } = req.body;
  CrawlerJob.updateStatus(req.params.id, status, (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Status aktualisiert' });
  });
};

exports.deleteJob = (req, res) => {
  CrawlerJob.delete(req.params.id, (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Job gelöscht' });
  });
};

exports.restartJob = (req, res) => {
  CrawlerJob.updateStatus(req.params.id, 'pending', (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Job neu gestartet' });
  });
};

exports.previewGelbeSeitenTreffer = async (req, res) => {
  const { source, searchTerm, ort, umkreis } = req.query;
  if (source !== 'Gelbe Seiten') return res.status(400).json({ error: 'Nur Gelbe Seiten unterstützt' });
  try {
    const url = `https://www.gelbeseiten.de/suche/${encodeURIComponent(searchTerm)}/${encodeURIComponent(ort)}?umkreis=${umkreis}`;
    console.log('[Preview] URL:', url);
    console.log('[Preview] Params:', { source, searchTerm, ort, umkreis });
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const count = await page.$eval('#mod-TrefferlisteInfo', el => parseInt(el.innerText, 10));
    await browser.close();
    res.json({ count });
  } catch (e) {
    console.error('Fehler bei der Treffer-Vorschau:', e);
    res.status(500).json({ error: 'Fehler beim Abrufen der Trefferzahl', details: e.message, stack: e.stack });
  }
}; 