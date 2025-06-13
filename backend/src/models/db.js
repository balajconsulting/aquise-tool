require('dotenv').config();
const mysql = require('mysql2');

// Erstelle eine MySQL-Datenbankverbindung
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'aquise_tool'
});

// Verbinde zur Datenbank
db.connect((err) => {
    if (err) {
        console.error('Fehler bei der Verbindung zur Datenbank:', err);
        return;
    }
    console.log('Mit der Datenbank verbunden.');
});

module.exports = db;
