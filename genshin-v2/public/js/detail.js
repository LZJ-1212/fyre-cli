// public/js/detail.js
// Handles extracting character ID from URL query parameters, fetching character data, and rendering the detail view.

// Mock data fallback for defensive frontend
const MOCK_CHARACTERS = [
  { id: 1, name: 'Traveler', element: 'Anemo', weapon: 'Sword', region: 'Mondstadt', description: 'A traveler from another world who has the ability to resonate with the elements.', image_url: 'https://api.genshin.dev/characters/traveler-anemo/icon' },
  { id: 2, name: 'Amber', element: 'Pyro', weapon: 'Bow', region: 'Mondstadt', description: 'The only Outrider of the Knights of Favonius. She is always ready to help those in need.', image_url: 'https://api.genshin.dev/characters/amber/icon' },
  { id: 3, name: 'Kaeya', element: 'Cryo', weapon: 'Sword', region: 'Mondstadt', description: 'The Cavalry Captain of the Knights of Favonius. He is mysterious and cunning.', image_url: 'https://api.genshin.dev/characters/kaeya/icon' },
  { id: 4, name: 'Lisa', element: 'Electro', weapon: 'Catalyst', region: 'Mondstadt', description: 'The librarian of the Knights of Favonius. She is knowledgeable and powerful.', image_url: 'https://api.genshin.dev/characters/lisa/icon' },
  { id: 5, name: 'Jean', element: 'Anemo', weapon: 'Sword', region: 'Mondstadt', description: 'The Acting Grand Master of the Knights of Favonius. She is dedicated to protecting Mondstadt.', image_url: 'https://api.genshin.dev/characters/jean/icon' },
  { id: 6, name: 'Diluc', element: 'Pyro', weapon: 'Claymore', region: 'Mondstadt', description: 'The wealthy owner of the Dawn Winery. He fights against the Abyss Order in secret.', image_url: 'https://api.genshin.dev/characters/diluc/icon' },
  { id: 7, name: 'Venti', element: 'Anemo', weapon: 'Bow', region: 'Mondstadt', description: 'The Anemo Archon, Barbatos. He enjoys freedom and music.', image_url: 'https://api.genshin.dev/characters/venti/icon' },
  { id: 8, name: 'Xiangling', element: 'Pyro', weapon: 'Polearm', region: 'Liyue', description: 'The Head Chef of the Wanmin Restaurant. She loves to cook and experiment with new recipes.', image_url: 'https://api.genshin.dev/characters/xiangling/icon' },
  { id: 9, name: 'Zhongli', element: 'Geo', weapon: 'Polearm', region: 'Liyue', description: 'The Geo Archon, Rex Lapis. He is wise and knowledgeable about Liyue\'s history.', image_url: 'https://api.genshin.dev/characters/zhongli/icon' },
  { id: 10, name: 'Raiden Shogun', element: 'Electro', weapon: 'Polearm', region: 'Inazuma', description: 'The Electro Archon, Baal. She rules Inazuma with an iron fist.', image_url: 'https://api.genshin.dev/characters/raiden-shogun/icon' }
];

// Get element color for styling
function getElementColor(element) {
  const colors = {
    'Anemo': '#00FF87',
    'Pyro': '#FF4444',
    'Cryo': '#00BFFF',
    'Electro': '#AA44FF',
    'Geo': '#FFD700',
    'Hydro': '#00BFFF',
    'Dendro': '#00FF00'
  };
  return colors[element] || '#888888';
}

// Get character from mock data by ID
function getCharacterFromMock(id) {
  return MOCK_CHARACTERS.find(c => c.id === parseInt(id));
}

// Render character detail on the page
function renderCharacterDetail(character) {
  const container = document.getElementById('character-detail');
  if (!container) return;

  const elementColor = getElementColor(character.element);
  
  container.innerHTML = `
    <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      <div class="md:flex">
        <div class="md:flex-shrink-0">
          <img class="h-96 w-full object-cover md:w-96" src="${character.image_url}" alt="${character.name}" onerror="this.src='https://via.placeholder.com/400x600?text=${encodeURIComponent(character.name)}'">
        </div>
        <div class="p-8">
          <div class="uppercase tracking-wide text-sm text-indigo-500 font-semibold">${character.region}</div>
          <h1 class="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">${character.name}</h1>
          <div class="mt-4 flex items-center">
            <span class="inline-block px-3 py-1 rounded-full text-sm font-semibold text-white" style="background-color: ${elementColor}">
              ${character.element}
            </span>
            <span class="ml-2 inline-block px-3 py-1 rounded-full text-sm font-semibold bg-gray-200 text-gray-700">
              ${character.weapon}
            </span>
          </div>
          <p class="mt-6 text-gray-500 text-lg leading-relaxed">${character.description}</p>
          <div class="mt-8">
            <a href="/characters.html" class="inline-block px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors duration-200">
              Back to Characters
            </a>
            <a href="/index.html" class="ml-4 inline-block px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors duration-200">
              Home
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Show error message
function showError(message) {
  const container = document.getElementById('character-detail');
  if (!container) return;
  
  container.innerHTML = `
    <div class="max-w-4xl mx-auto bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
      <strong class="font-bold">Error!</strong>
      <span class="block sm:inline"> ${message}</span>
      <div class="mt-4">
        <a href="/characters.html" class="inline-block px-4 py-2 bg-red-600 text-white font-medium rounded hover:bg-red-700 transition-colors duration-200">
          Back to Characters
        </a>
      </div>
    </div>
  `;
}

// Initialize the detail page
function initDetailPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const characterId = urlParams.get('id');
  
  if (!characterId) {
    showError('No character ID provided. Please select a character from the gallery.');
    return;
  }

  // Try to fetch from API first
  fetch(`/api/characters/${characterId}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch character data');
      }
      return response.json();
    })
    .then(character => {
      renderCharacterDetail(character);
    })
    .catch(error => {
      console.warn('API fetch failed, falling back to mock data:', error.message);
      const mockCharacter = getCharacterFromMock(characterId);
      if (mockCharacter) {
        renderCharacterDetail(mockCharacter);
      } else {
        showError('Character not found. Please try again.');
      }
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initDetailPage);