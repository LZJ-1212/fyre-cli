const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const DB_PATH = path.join(__dirname, 'game.db');

// Initialize and connect to SQLite database
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error connecting to SQLite database:', err.message);
    } else {
        console.log('Connected to SQLite database at', DB_PATH);
        initializeDatabase();
    }
});

// Function to initialize database schema
function initializeDatabase() {
    const createGamesTableSQL = `
        CREATE TABLE IF NOT EXISTS games (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_name TEXT NOT NULL,
            score INTEGER NOT NULL DEFAULT 0,
            board_state TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;

    const createLeaderboardViewSQL = `
        CREATE VIEW IF NOT EXISTS leaderboard AS
        SELECT 
            player_name,
            MAX(score) as high_score,
            COUNT(*) as games_played,
            MAX(created_at) as last_played
        FROM games
        GROUP BY player_name
        ORDER BY high_score DESC
    `;

    db.serialize(() => {
        db.run(createGamesTableSQL, (err) => {
            if (err) {
                console.error('Error creating games table:', err.message);
            } else {
                console.log('Games table is ready.');
            }
        });

        db.run(createLeaderboardViewSQL, (err) => {
            if (err) {
                console.error('Error creating leaderboard view:', err.message);
            } else {
                console.log('Leaderboard view is ready.');
            }
        });
    });
}

// Database operation functions with error handling
const saveGameState = (playerName, score, boardState) => {
    return new Promise((resolve, reject) => {
        const sql = `INSERT INTO games (player_name, score, board_state) VALUES (?, ?, ?)`;
        const params = [playerName, score, JSON.stringify(boardState)];

        db.run(sql, params, function(err) {
            if (err) {
                console.error('Error saving game state:', err.message);
                reject(err);
            } else {
                resolve({ id: this.lastID });
            }
        });
    });
};

const getLeaderboard = (limit = 10) => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM leaderboard LIMIT ?`;
        
        db.all(sql, [limit], (err, rows) => {
            if (err) {
                console.error('Error fetching leaderboard:', err.message);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

const getPlayerGames = (playerName, limit = 20) => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT id, score, board_state, created_at 
                     FROM games 
                     WHERE player_name = ? 
                     ORDER BY created_at DESC 
                     LIMIT ?`;
        
        db.all(sql, [playerName, limit], (err, rows) => {
            if (err) {
                console.error('Error fetching player games:', err.message);
                reject(err);
            } else {
                // Parse board_state JSON string back to object
                const parsedRows = rows.map(row => ({
                    ...row,
                    board_state: JSON.parse(row.board_state)
                }));
                resolve(parsedRows);
            }
        });
    });
};

const getGameById = (gameId) => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM games WHERE id = ?`;
        
        db.get(sql, [gameId], (err, row) => {
            if (err) {
                console.error('Error fetching game by ID:', err.message);
                reject(err);
            } else if (!row) {
                resolve(null);
            } else {
                // Parse board_state JSON string back to object
                row.board_state = JSON.parse(row.board_state);
                resolve(row);
            }
        });
    });
};

// Close database connection on process termination
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});

// Named exports for database functions
module.exports = {
    db,
    saveGameState,
    getLeaderboard,
    getPlayerGames,
    getGameById
};