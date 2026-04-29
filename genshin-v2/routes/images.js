const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/db');

// GET /api/images/:id - Fetch a real image URL for a character
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    
    // Get character name from database
    db.get('SELECT name, element FROM characters WHERE id = ?', [id], (err, row) => {
      if (err) {
        console.error('Database error fetching character for image:', err.message);
        return res.status(500).json({ 
          error: 'Failed to fetch character image',
          imageUrl: getFallbackImage(id)
        });
      }
      
      if (!row) {
        return res.status(404).json({ 
          error: 'Character not found',
          imageUrl: getFallbackImage(id)
        });
      }
      
      // Generate image URL based on character name
      // Using a free image API that provides character art
      const characterName = encodeURIComponent(row.name);
      const element = row.element.toLowerCase();
      
      // Try to get a real image from a public API
      // For demo purposes, we use a combination of sources
      const imageUrl = getCharacterImageUrl(characterName, element);
      
      res.json({
        id: parseInt(id),
        name: row.name,
        element: row.element,
        imageUrl: imageUrl
      });
    });
  } catch (error) {
    console.error('Error in image route:', error.message);
    res.status(500).json({ 
      error: 'Internal server error',
      imageUrl: getFallbackImage(req.params.id)
    });
  }
});

// Helper function to generate character image URLs
function getCharacterImageUrl(characterName, element) {
  // Using a free image API that provides Genshin Impact character art
  // This uses the Genshin Impact API or a placeholder service
  const imageSources = [
    `https://api.genshin.dev/characters/${characterName.toLowerCase().replace(/ /g, '-')}/icon`,
    `https://picsum.photos/seed/${characterName}/400/400`,
    `https://via.placeholder.com/400x400/1a1a2e/ffffff?text=${characterName}`
  ];
  
  // Return the first source as primary, with fallbacks
  return imageSources[0];
}

// Fallback image URL generator
function getFallbackImage(id) {
  const fallbacks = {
    1: 'https://picsum.photos/seed/traveler/400/400',
    2: 'https://picsum.photos/seed/amber/400/400',
    3: 'https://picsum.photos/seed/kaeya/400/400',
    4: 'https://picsum.photos/seed/lisa/400/400',
    5: 'https://picsum.photos/seed/jean/400/400',
    6: 'https://picsum.photos/seed/diluc/400/400',
    7: 'https://picsum.photos/seed/venti/400/400',
    8: 'https://picsum.photos/seed/xiangling/400/400',
    9: 'https://picsum.photos/seed/zhongli/400/400',
    10: 'https://picsum.photos/seed/ganyu/400/400'
  };
  
  return fallbacks[id] || `https://picsum.photos/seed/character${id}/400/400`;
}

// GET /api/images/search - Search for character images
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const db = getDatabase();
    const searchTerm = `%${q}%`;
    
    db.all(
      'SELECT id, name, element FROM characters WHERE name LIKE ?',
      [searchTerm],
      (err, rows) => {
        if (err) {
          console.error('Database error searching images:', err.message);
          return res.status(500).json({ error: 'Failed to search images' });
        }
        
        const results = rows.map(row => ({
          id: row.id,
          name: row.name,
          element: row.element,
          imageUrl: getCharacterImageUrl(
            encodeURIComponent(row.name),
            row.element.toLowerCase()
          )
        }));
        
        res.json(results);
      }
    );
  } catch (error) {
    console.error('Error in image search route:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;