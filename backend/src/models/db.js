const mysql = require('mysql2');

// Erstelle eine MySQL-Datenbankverbindung
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bc_crawler'
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