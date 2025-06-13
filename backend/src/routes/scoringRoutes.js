const express = require('express');
const router = express.Router();
const { runScoring } = require('../services/scoringWorker');
const db = require('../models/db');
const socketService = require('../services/socketService');

// Neuen Scoring-Job anlegen und Worker triggern
router.post('/run', async (req, res) => {
  try {
    // Job anlegen
    db.query('INSERT INTO crawler_jobs (type, status, started_at) VALUES (?, ?, NOW())', ['Scoring', 'pending'], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      const jobId = result.insertId;
      // Worker wird automatisch durch polling auf pending Jobs starten
      res.json({ success: true, jobId });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Live-Status-Endpunkt beibehalten für Fallback (wenn WebSockets nicht funktionieren)
router.get('/live-status', (req, res) => {
  db.query('SELECT COUNT(*) AS total FROM leads WHERE domain IS NOT NULL AND domain != ""', (err, totalRows) => {
    if (err) return res.status(500).json({ error: err.message });
    const total = totalRows[0].total;
    const batchSize = 8;
    const findBatch = (offset = 0) => {
      db.query('SELECT * FROM leads WHERE domain IS NOT NULL AND domain != "" ORDER BY id ASC LIMIT ? OFFSET ?', [batchSize, offset], (err2, leads) => {
        if (err2) return res.status(500).json({ error: err2.message });
        if (leads.length === 0) {
          const emptyResponse = { queue: [], current: null, results: [], progress: { processed: null, total } };
          // Sende auch das leere Ergebnis als WebSocket-Update
          socketService.broadcastScoringStatus(emptyResponse);
          return res.json(emptyResponse);
        }
        // Prüfe, ob in diesem Batch noch ein unbewerteter Lead ist
        const firstUnscoredIdx = leads.findIndex(l => l.score === null || l.score === 0);
        if (firstUnscoredIdx === -1) {
          // Alle in diesem Batch bewertet, prüfe nächsten Batch
          return findBatch(offset + batchSize);
        }
        // Prüfe, ob nach dem ersten unbewerteten noch bewertete kommen (das darf nicht sein)
        const afterCurrent = leads.slice(firstUnscoredIdx + 1);
        const hasScoredAfter = afterCurrent.some(l => l.score !== null && l.score !== 0);
        if (hasScoredAfter) {
          // Diesen Batch überspringen, prüfe nächsten Batch
          return findBatch(offset + batchSize);
        }
        // Ergebnisse für die aktuellen 8 (falls schon bewertet)
        const ids = leads.map(l => l.id);
        db.query('SELECT id, score FROM leads WHERE id IN (?) AND score IS NOT NULL AND score > 0', [ids], (err3, results) => {
          if (err3) return res.status(500).json({ error: err3.message });
          db.query('SELECT COUNT(*) AS processed FROM leads WHERE score IS NOT NULL AND score > 0 AND domain IS NOT NULL AND domain != ""', (err4, processedRows) => {
            if (err4) return res.status(500).json({ error: err4.message });
            const response = {
              queue: leads,
              current: leads[firstUnscoredIdx],
              results: results || [],
              progress: { processed: processedRows[0].processed, total }
            };
            
            // Sende das Ergebnis auch als WebSocket-Update
            socketService.broadcastScoringStatus(response);
            
            res.json(response);
          });
        });
      });
    };
    findBatch(0);
  });
});

module.exports = router; 