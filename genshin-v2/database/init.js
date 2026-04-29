const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'genshin_wiki.db');

const SAMPLE_CHARACTERS = [
  {
    name: 'Traveler (Anemo)',
    element: 'Anemo',
    weapon: 'Sword',
    region: 'Teyvat',
    description: 'A traveler from another world who has the power to resonate with the elements. Their journey across Teyvat begins with the power of wind.',
    image_url: 'https://api.genshin.dev/characters/traveler-anemo/icon'
  },
  {
    name: 'Amber',
    element: 'Pyro',
    weapon: 'Bow',
    region: 'Mondstadt',
    description: 'The only Outrider of the Knights of Favonius. She is always ready to help the citizens of Mondstadt with any problems they may have.',
    image_url: 'https://api.genshin.dev/characters/amber/icon'
  },
  {
    name: 'Kaeya',
    element: 'Cryo',
    weapon: 'Sword',
    region: 'Mondstadt',
    description: 'The Cavalry Captain of the Knights of Favonius. He is a mysterious figure who keeps many secrets close to his chest.',
    image_url: 'https://api.genshin.dev/characters/kaeya/icon'
  },
  {
    name: 'Lisa',
    element: 'Electro',
    weapon: 'Catalyst',
    region: 'Mondstadt',
    description: 'The librarian of the Knights of Favonius. She is a powerful mage who prefers a quiet life over adventure.',
    image_url: 'https://api.genshin.dev/characters/lisa/icon'
  },
  {
    name: 'Jean',
    element: 'Anemo',
    weapon: 'Sword',
    region: 'Mondstadt',
    description: 'The Acting Grand Master of the Knights of Favonius. She is dedicated to protecting Mondstadt and its people.',
    image_url: 'https://api.genshin.dev/characters/jean/icon'
  },
  {
    name: 'Diluc',
    element: 'Pyro',
    weapon: 'Claymore',
    region: 'Mondstadt',
    description: 'The wealthy owner of the Dawn Winery. He fights against the corruption in Mondstadt under the cover of darkness.',
    image_url: 'https://api.genshin.dev/characters/diluc/icon'
  },
  {
    name: 'Venti',
    element: 'Anemo',
    weapon: 'Bow',
    region: 'Mondstadt',
    description: 'The bard of Mondstadt who is actually the Anemo Archon, Barbatos. He enjoys freedom and music above all else.',
    image_url: 'https://api.genshin.dev/characters/venti/icon'
  },
  {
    name: 'Xiangling',
    element: 'Pyro',
    weapon: 'Polearm',
    region: 'Liyue',
    description: 'The Head Chef of the Wanmin Restaurant. She is always experimenting with new recipes and ingredients.',
    image_url: 'https://api.genshin.dev/characters/xiangling/icon'
  },
  {
    name: 'Zhongli',
    element: 'Geo',
    weapon: 'Polearm',
    region: 'Liyue',
    description: 'The Geo Archon who has retired from his divine duties. He now works as a consultant for the Wangsheng Funeral Parlor.',
    image_url: 'https://api.genshin.dev/characters/zhongli/icon'
  },
  {
    name: 'Raiden Shogun',
    element: 'Electro',
    weapon: 'Polearm',
    region: 'Inazuma',
    description: 'The Electro Archon who rules over Inazuma. She seeks eternity and has closed her nation off from the outside world.',
    image_url: 'https://api.genshin.dev/characters/raiden-shogun/icon'
  },
  {
    name: 'Ganyu',
    element: 'Cryo',
    weapon: 'Bow',
    region: 'Liyue',
    description: 'A half-qilin Adeptus who works as a secretary at the Liyue Qixing. She is known for her diligence and kindness.',
    image_url: 'https://api.genshin.dev/characters/ganyu/icon'
  },
  {
    name: 'Hu Tao',
    element: 'Pyro',
    weapon: 'Polearm',
    region: 'Liyue',
    description: 'The 77th Director of the Wangsheng Funeral Parlor. She has a playful personality but takes her work very seriously.',
    image_url: 'https://api.genshin.dev/characters/hu-tao/icon'
  }
];

function initDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        reject(err);
        return;
      }
      console.log('Connected to the SQLite database.');
    });

    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS characters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        element TEXT,
        weapon TEXT,
        region TEXT,
        description TEXT,
        image_url TEXT
      )`, (err) => {
        if (err) {
          console.error('Error creating table:', err.message);
          reject(err);
          return;
        }
        console.log('Characters table created successfully.');
      });

      const insertStmt = db.prepare(`INSERT OR IGNORE INTO characters (name, element, weapon, region, description, image_url) VALUES (?, ?, ?, ?, ?, ?)`);

      SAMPLE_CHARACTERS.forEach(character => {
        insertStmt.run(
          character.name,
          character.element,
          character.weapon,
          character.region,
          character.description,
          character.image_url,
          (err) => {
            if (err) {
              console.error(`Error inserting ${character.name}:`, err.message);
            } else {
              console.log(`Inserted character: ${character.name}`);
            }
          }
        );
      });

      insertStmt.finalize((err) => {
        if (err) {
          console.error('Error finalizing insert statement:', err.message);
          reject(err);
          return;
        }
        console.log('All sample characters inserted successfully.');
      });
    });

    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
        reject(err);
        return;
      }
      console.log('Database connection closed.');
      resolve();
    });
  });
}

module.exports = { initDatabase };