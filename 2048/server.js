const express = require('express');
const path = require('path');
const cors = require('cors');
const apiRoutes = require('./routes/api');
const { initializeDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Connect to database
try {
    initializeDatabase();
    console.log('Database initialized successfully.');
} catch (error) {
    console.error('Failed to initialize database:', error.message);
    process.exit(1);
}

// Mount API routes
app.use('/api', apiRoutes);

// Serve frontend for any other route (for SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;