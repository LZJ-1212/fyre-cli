const express = require('express');
const router = express.Router();
const { getAllCharacters, getCharacterById, searchCharacters } = require('../controllers/characterController');

// GET /api/characters - Get all characters
router.get('/', getAllCharacters);

// GET /api/characters/search?q= - Search characters by query
router.get('/search', searchCharacters);

// GET /api/characters/:id - Get a single character by ID
router.get('/:id', getCharacterById);

module.exports = router;