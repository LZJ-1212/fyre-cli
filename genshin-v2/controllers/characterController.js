const Character = require('../models/Character');

/**
 * Controller function to get all characters
 * GET /api/characters
 */
async function getAllCharacters(req, res) {
    try {
        const characters = await Character.getAll();
        
        if (!characters || characters.length === 0) {
            return res.status(200).json({
                success: true,
                data: [],
                message: 'No characters found in the database'
            });
        }

        return res.status(200).json({
            success: true,
            count: characters.length,
            data: characters
        });
    } catch (error) {
        console.error('Error fetching all characters:', error.message);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch characters',
            message: error.message
        });
    }
}

/**
 * Controller function to get a single character by ID
 * GET /api/characters/:id
 */
async function getCharacterById(req, res) {
    try {
        const id = parseInt(req.params.id, 10);

        if (isNaN(id) || id < 1) {
            return res.status(400).json({
                success: false,
                error: 'Invalid character ID',
                message: 'Character ID must be a positive integer'
            });
        }

        const character = await Character.getById(id);

        if (!character) {
            return res.status(404).json({
                success: false,
                error: 'Character not found',
                message: `No character found with ID ${id}`
            });
        }

        return res.status(200).json({
            success: true,
            data: character
        });
    } catch (error) {
        console.error(`Error fetching character ${req.params.id}:`, error.message);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch character',
            message: error.message
        });
    }
}

/**
 * Controller function to search characters by query
 * GET /api/characters/search?q=query
 */
async function searchCharacters(req, res) {
    try {
        const query = req.query.q;

        if (!query || query.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Search query required',
                message: 'Please provide a search query using the "q" parameter'
            });
        }

        const sanitizedQuery = query.trim();
        const characters = await Character.search(sanitizedQuery);

        if (!characters || characters.length === 0) {
            return res.status(200).json({
                success: true,
                count: 0,
                data: [],
                message: `No characters found matching "${sanitizedQuery}"`
            });
        }

        return res.status(200).json({
            success: true,
            count: characters.length,
            query: sanitizedQuery,
            data: characters
        });
    } catch (error) {
        console.error(`Error searching characters with query "${req.query.q}":`, error.message);
        return res.status(500).json({
            success: false,
            error: 'Failed to search characters',
            message: error.message
        });
    }
}

module.exports = {
    getAllCharacters,
    getCharacterById,
    searchCharacters
};