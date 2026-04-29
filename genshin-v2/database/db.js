const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const DB_PATH = path.join(__dirname, '..', process.env.DB_PATH || 'genshin_wiki.db');

let db = null;

function getDatabase() {
    if (db) {
        return db;
    }

    db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error('Failed to connect to database:', err.message);
            throw err;
        }
        console.log('Connected to SQLite database at:', DB_PATH);
    });

    db.configure('busyTimeout', 5000);

    db.on('error', (err) => {
        console.error('Database error:', err.message);
    });

    return db;
}

function closeDatabase() {
    if (db) {
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err.message);
            } else {
                console.log('Database connection closed');
                db = null;
            }
        });
    }
}

module.exports = {
    getDatabase,
    closeDatabase
};