const Lead = require('../models/lead');

exports.getAllLeads = (req, res) => {
  const options = {
    limit: req.query.limit,
    offset: req.query.offset,
    manual_status: req.query.manual_status // z.B. 'MGG' oder 'MGR'
  };
  Lead.getAll(options, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
};

exports.getLeadById = (req, res) => {
  Lead.getById(req.params.id, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    if (results.length === 0) return res.status(404).json({ error: 'Lead nicht gefunden' });
    res.json(results[0]);
  });
};

exports.createLead = (req, res) => {
  Lead.create(req.body, (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.status(201).json({ id: result.insertId, ...req.body });
  });
};

exports.updateLead = (req, res) => {
  Lead.update(req.params.id, req.body, (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Lead aktualisiert' });
  });
};

exports.deleteLead = (req, res) => {
  Lead.delete(req.params.id, (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Lead gelöscht' });
  });
};

exports.getStats = (req, res) => {
  const db = require('../models/db');
  // Anzahl aller Leads
  const totalLeadsQuery = 'SELECT COUNT(*) AS total FROM leads';
  // Durchschnittlicher Score
  const avgScoreQuery = 'SELECT AVG(score) AS avg_score FROM leads';
  // Neue Leads (Demo: letzte 7 Tage)
  const newLeadsQuery = `SELECT COUNT(*) AS new_leads FROM leads WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`;
  // Aktionen (Demo: Anzahl Notizen)
  const actionsQuery = 'SELECT COUNT(*) AS actions FROM notes';

  db.query(totalLeadsQuery, (err, totalRes) => {
    if (err) return res.status(500).json({ error: err });
    db.query(avgScoreQuery, (err, avgRes) => {
      if (err) return res.status(500).json({ error: err });
      db.query(newLeadsQuery, (err, newLeadsRes) => {
        if (err) return res.status(500).json({ error: err });
        db.query(actionsQuery, (err, actionsRes) => {
          if (err) return res.status(500).json({ error: err });
          res.json({
            totalLeads: totalRes[0].total,
            avgScore: Math.round(avgRes[0].avg_score || 0),
            newLeads: newLeadsRes[0].new_leads,
            actions: actionsRes[0].actions
          });
        });
      });
    });
  });
};

exports.getNextLead = (req, res) => {
  const db = require('../models/db');
  db.query(
    "SELECT * FROM leads WHERE (manual_status IS NULL OR manual_status = '' OR manual_status = 'undefined') AND domain IS NOT NULL AND domain != '' ORDER BY id DESC LIMIT 1",
    (err, results) => {
      if (err) return res.status(500).json({ error: err });
      if (!results.length) return res.status(404).json({ error: 'Lead nicht gefunden' });
      res.json(results[0]);
    }
  );
};

// Liefert die Anzahl der swipebaren Leads
exports.getSwipeableCount = (req, res) => {
  const db = require('../models/db');
  db.query(
    "SELECT COUNT(*) AS count FROM leads WHERE domain IS NOT NULL AND domain != '' AND (manual_status IS NULL OR manual_status = '')",
    (err, results) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ count: results[0].count });
    }
  );
};

exports.getStatsTimeseries = (req, res) => {
  const db = require('../models/db');
  let { period } = req.query;
  if (!period) period = '7d';
  let days = 7;
  let dateFormat = '%Y-%m-%d';
  if (period === '1d') days = 1;
  if (period === '30d') days = 30;

  // Leads pro Tag
  const leadsPerDayQuery = `
    SELECT DATE_FORMAT(created_at, '${dateFormat}') as date, COUNT(*) as count
    FROM leads
    WHERE created_at IS NOT NULL AND created_at >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY)
    GROUP BY DATE_FORMAT(created_at, '${dateFormat}')
    ORDER BY date ASC
  `;
  // Neue Leads pro Tag (identisch zu leadsPerDay)
  const newLeadsPerDayQuery = leadsPerDayQuery;
  // Durchschnittlicher Score pro Tag
  const avgScorePerDayQuery = `
    SELECT DATE_FORMAT(created_at, '${dateFormat}') as date, ROUND(AVG(score),1) as avgScore
    FROM leads
    WHERE created_at IS NOT NULL AND created_at >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY) AND score IS NOT NULL
    GROUP BY DATE_FORMAT(created_at, '${dateFormat}')
    ORDER BY date ASC
  `;
  // Fehlerhafte Jobs pro Tag
  const failedJobsPerDayQuery = `
    SELECT DATE_FORMAT(started_at, '${dateFormat}') as date, COUNT(*) as count
    FROM crawler_jobs
    WHERE started_at IS NOT NULL AND started_at >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY) AND status = 'error'
    GROUP BY DATE_FORMAT(started_at, '${dateFormat}')
    ORDER BY date ASC
  `;

  db.query(leadsPerDayQuery, (err, leadsPerDay) => {
    if (err) return res.status(500).json({ error: err.message });
    db.query(avgScorePerDayQuery, (err2, avgScorePerDay) => {
      if (err2) return res.status(500).json({ error: err2.message });
      db.query(newLeadsPerDayQuery, (err3, newLeadsPerDay) => {
        if (err3) return res.status(500).json({ error: err3.message });
        db.query(failedJobsPerDayQuery, (err4, failedJobsPerDay) => {
          if (err4) return res.status(500).json({ error: err4.message });
          res.json({
            leadsPerDay,
            avgScorePerDay,
            newLeadsPerDay,
            failedJobsPerDay
          });
        });
      });
    });
  });
}; 