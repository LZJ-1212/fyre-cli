const { getDatabase } = require('../database/db');

class Character {
    /**
     * Retrieves all characters from the database
     * @returns {Promise<Array>} Array of character objects
     */
    static getAll() {
        return new Promise((resolve, reject) => {
            const db = getDatabase();
            if (!db) {
                reject(new Error('Database connection not available'));
                return;
            }

            db.all(
                'SELECT id, name, element, weapon, region, description, image_url FROM characters ORDER BY name ASC',
                [],
                (err, rows) => {
                    if (err) {
                        console.error('Error fetching all characters:', err.message);
                        reject(err);
                    } else {
                        resolve(rows || []);
                    }
                }
            );
        });
    }

    /**
     * Retrieves a single character by its ID
     * @param {number} id - The character ID
     * @returns {Promise<Object|null>} Character object or null if not found
     */
    static getById(id) {
        return new Promise((resolve, reject) => {
            const db = getDatabase();
            if (!db) {
                reject(new Error('Database connection not available'));
                return;
            }

            const characterId = parseInt(id, 10);
            if (isNaN(characterId)) {
                reject(new Error('Invalid character ID'));
                return;
            }

            db.get(
                'SELECT id, name, element, weapon, region, description, image_url FROM characters WHERE id = ?',
                [characterId],
                (err, row) => {
                    if (err) {
                        console.error(`Error fetching character with ID ${characterId}:`, err.message);
                        reject(err);
                    } else {
                        resolve(row || null);
                    }
                }
            );
        });
    }

    /**
     * Searches for characters by name, element, weapon, or region
     * @param {string} query - The search query string
     * @returns {Promise<Array>} Array of matching character objects
     */
    static search(query) {
        return new Promise((resolve, reject) => {
            const db = getDatabase();
            if (!db) {
                reject(new Error('Database connection not available'));
                return;
            }

            if (!query || typeof query !== 'string' || query.trim().length === 0) {
                resolve([]);
                return;
            }

            const searchTerm = `%${query.trim()}%`;
            
            db.all(
                `SELECT id, name, element, weapon, region, description, image_url 
                 FROM characters 
                 WHERE name LIKE ? 
                    OR element LIKE ? 
                    OR weapon LIKE ? 
                    OR region LIKE ? 
                 ORDER BY name ASC`,
                [searchTerm, searchTerm, searchTerm, searchTerm],
                (err, rows) => {
                    if (err) {
                        console.error('Error searching characters:', err.message);
                        reject(err);
                    } else {
                        resolve(rows || []);
                    }
                }
            );
        });
    }
}

module.exports = Character;