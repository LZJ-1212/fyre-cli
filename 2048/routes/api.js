const express = require('express');
const router = express.Router();
const db = require('../database');

// POST /api/game - Save current game state
router.post('/game', async (req, res) => {
    try {
        const { userId, score, boardState, gameStatus } = req.body;

        // Basic validation
        if (!userId || typeof score !== 'number' || !Array.isArray(boardState)) {
            return res.status(400).json({ error: 'Invalid request data. userId, score (number), and boardState (array) are required.' });
        }

        const sql = `
            INSERT INTO game_sessions (user_id, score, board_state, game_status, saved_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;
        const params = [userId, score, JSON.stringify(boardState), gameStatus || 'active'];

        db.run(sql, params, function(err) {
            if (err) {
                console.error('Database error saving game:', err);
                return res.status(500).json({ error: 'Failed to save game state.' });
            }
            res.status(201).json({
                message: 'Game state saved successfully.',
                sessionId: this.lastID
            });
        });
    } catch (error) {
        console.error('Unexpected error in POST /api/game:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// GET /api/game/:userId - Retrieve latest game state for a user
router.get('/game/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const sql = `
            SELECT session_id, score, board_state, game_status, saved_at
            FROM game_sessions
            WHERE user_id = ?
            ORDER BY saved_at DESC
            LIMIT 1
        `;

        db.get(sql, [userId], (err, row) => {
            if (err) {
                console.error('Database error fetching game:', err);
                return res.status(500).json({ error: 'Failed to retrieve game state.' });
            }

            if (!row) {
                return res.status(404).json({ message: 'No saved game found for this user.' });
            }

            // Parse the board_state JSON string back to an array
            const gameState = {
                sessionId: row.session_id,
                score: row.score,
                boardState: JSON.parse(row.board_state),
                gameStatus: row.game_status,
                savedAt: row.saved_at
            };

            res.json(gameState);
        });
    } catch (error) {
        console.error('Unexpected error in GET /api/game/:userId:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// GET /api/leaderboard - Fetch top scores for the leaderboard
router.get('/leaderboard', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const validLimit = Math.min(Math.max(limit, 1), 100); // Clamp between 1 and 100

        const sql = `
            SELECT user_id, MAX(score) as high_score, saved_at
            FROM game_sessions
            WHERE game_status = 'won' OR game_status = 'lost'
            GROUP BY user_id
            ORDER BY high_score DESC
            LIMIT ?
        `;

        db.all(sql, [validLimit], (err, rows) => {
            if (err) {
                console.error('Database error fetching leaderboard:', err);
                return res.status(500).json({ error: 'Failed to retrieve leaderboard.' });
            }

            const leaderboard = rows.map(row => ({
                userId: row.user_id,
                highScore: row.high_score,
                lastPlayed: row.saved_at
            }));

            res.json(leaderboard);
        });
    } catch (error) {
        console.error('Unexpected error in GET /api/leaderboard:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// POST /api/score - Submit a final score (e.g., when game ends)
router.post('/score', async (req, res) => {
    try {
        const { userId, finalScore } = req.body;

        if (!userId || typeof finalScore !== 'number' || finalScore < 0) {
            return res.status(400).json({ error: 'Invalid request data. userId and finalScore (non-negative number) are required.' });
        }

        // This endpoint could be used to update a specific session or create a summary record.
        // For simplicity, we log it. In a full implementation, you might update the game_status of the latest session.
        const sql = `
            UPDATE game_sessions
            SET game_status = 'completed', score = ?
            WHERE session_id = (
                SELECT session_id FROM game_sessions
                WHERE user_id = ? AND game_status = 'active'
                ORDER BY saved_at DESC
                LIMIT 1
            )
        `;

        db.run(sql, [finalScore, userId], function(err) {
            if (err) {
                console.error('Database error submitting score:', err);
                return res.status(500).json({ error: 'Failed to submit final score.' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ message: 'No active game session found to update.' });
            }

            res.json({ message: 'Final score submitted successfully.' });
        });
    } catch (error) {
        console.error('Unexpected error in POST /api/score:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

module.exports = router;