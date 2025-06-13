const db = require('./db');

const CrawlerJob = {
  getAll: (callback) => {
    db.query('SELECT *, TIMESTAMPDIFF(SECOND, started_at, finished_at) as duration FROM crawler_jobs ORDER BY id DESC', callback);
  },

  getById: (id, callback) => {
    db.query('SELECT *, TIMESTAMPDIFF(SECOND, started_at, finished_at) as duration FROM crawler_jobs WHERE id = ?', [id], callback);
  },

  create: (job, callback) => {
    const sql = `INSERT INTO crawler_jobs (source, ort, searchTerm, leadLimit, umkreis, status, started_at) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const values = [job.source, job.ort, job.searchTerm, job.leadLimit, job.umkreis, job.status || 'pending', job.started_at || null];
    db.query(sql, values, callback);
  },

  updateStatus: (id, status, callback) => {
    const sql = `UPDATE crawler_jobs SET status=?, finished_at=IF(? IN ('finished','error'), NOW(), finished_at) WHERE id=?`;
    db.query(sql, [status, status, id], callback);
  },

  delete: (id, callback) => {
    db.query('DELETE FROM crawler_jobs WHERE id = ?', [id], callback);
  }
};

module.exports = CrawlerJob; 