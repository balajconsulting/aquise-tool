const db = require('./db');

class User {
  static async create({ username, password_hash, role }) {
    return new Promise((resolve, reject) => {
      db.query(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
        [username, password_hash, role],
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      );
    });
  }

  static async findByUsername(username) {
    return new Promise((resolve, reject) => {
      db.query(
        'SELECT * FROM users WHERE username = ?',
        [username],
        (err, results) => {
          if (err) return reject(err);
          resolve(results[0]);
        }
      );
    });
  }

  static async findById(id) {
    return new Promise((resolve, reject) => {
      db.query(
        'SELECT * FROM users WHERE id = ?',
        [id],
        (err, results) => {
          if (err) return reject(err);
          resolve(results[0]);
        }
      );
    });
  }

  static async updatePassword(id, password_hash) {
    return new Promise((resolve, reject) => {
      db.query(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [password_hash, id],
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      );
    });
  }

  static async getAll() {
    return new Promise((resolve, reject) => {
      db.query('SELECT id, username, role FROM users', [], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  }

  static async updateRole(id, role) {
    return new Promise((resolve, reject) => {
      db.query(
        'UPDATE users SET role = ? WHERE id = ?',
        [role, id],
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      );
    });
  }
}

module.exports = User; 