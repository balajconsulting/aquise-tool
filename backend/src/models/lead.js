const db = require('./db');

const Lead = {
  getAll: (options = {}, callback) => {
    let sql = 'SELECT * FROM leads';
    const params = [];
    const filters = [];
    // Filter für manual_status (MGG/MGR)
    if (options.manual_status) {
      filters.push('manual_status = ?');
      params.push(options.manual_status);
    }
    if (filters.length > 0) {
      sql += ' WHERE ' + filters.join(' AND ');
    }
    sql += ' ORDER BY id DESC';
    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(Number(options.limit));
    }
    if (options.offset) {
      sql += ' OFFSET ?';
      params.push(Number(options.offset));
    }
    db.query(sql, params, callback);
  },

  getById: (id, callback) => {
    db.query('SELECT * FROM leads WHERE id = ?', [id], callback);
  },

  create: (lead, callback) => {
    const sql = `INSERT INTO leads (firm_name, domain, phone, email, score, category, impressum_url, last_checked, is_duplicate)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [
      lead.firm_name,
      lead.domain,
      lead.phone,
      lead.email,
      lead.score || 0,
      lead.category,
      lead.impressum_url,
      lead.last_checked,
      lead.is_duplicate || false
    ];
    db.query(sql, values, callback);
  },

  update: (id, lead, callback) => {
    // Nur manual_status aktualisieren, wenn nur das Feld kommt
    if (lead.manual_status !== undefined) {
      const sql = `UPDATE leads SET manual_status=? WHERE id=?`;
      db.query(sql, [lead.manual_status, id], callback);
      return;
    }
    // Sonst alle Felder wie bisher
    const sql = `UPDATE leads SET firm_name=?, domain=?, phone=?, email=?, score=?, category=?, impressum_url=?, last_checked=?, is_duplicate=? WHERE id=?`;
    const values = [
      lead.firm_name,
      lead.domain,
      lead.phone,
      lead.email,
      lead.score,
      lead.category,
      lead.impressum_url,
      lead.last_checked,
      lead.is_duplicate,
      id
    ];
    db.query(sql, values, callback);
  },

  delete: (id, callback) => {
    db.query('DELETE FROM leads WHERE id = ?', [id], callback);
  },

  exists: (lead, callback) => {
    // Prüfe auf Duplikat: gleiche Domain (wenn vorhanden), sonst Name+Adresse
    if (lead.domain) {
      db.query('SELECT id FROM leads WHERE domain = ?', [lead.domain], (err, res) => {
        if (err) return callback(err);
        if (res.length > 0) return callback(null, true);
        callback(null, false);
      });
    } else {
      db.query('SELECT id FROM leads WHERE firm_name = ? AND phone = ?', [lead.firm_name, lead.phone], (err, res) => {
        if (err) return callback(err);
        if (res.length > 0) return callback(null, true);
        callback(null, false);
      });
    }
  }
};

module.exports = Lead; 