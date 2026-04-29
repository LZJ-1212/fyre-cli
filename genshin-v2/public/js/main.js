// Main JavaScript file with utility functions for fetching data from the backend API,
// handling navigation, and rendering dynamic content for the Genshin Impact Wiki.

// =============================================================================
// Mock Data (Fallback when API is unavailable)
// =============================================================================
const MOCK_CHARACTERS = [
  {
    id: 1,
    name: "Traveler (Anemo)",
    element: "Anemo",
    weapon: "Sword",
    region: "Mondstadt",
    description: "A traveler from another world who has the ability to resonate with the elements. Their Anemo form allows them to control wind and create powerful gusts.",
    image_url: "https://api.genshin.dev/characters/traveler-anemo/icon"
  },
  {
    id: 2,
    name: "Amber",
    element: "Pyro",
    weapon: "Bow",
    region: "Mondstadt",
    description: "The only remaining Outrider of the Knights of Favonius. She is always ready to help those in need and is an expert in gliding.",
    image_url: "https://api.genshin.dev/characters/amber/icon"
  },
  {
    id: 3,
    name: "Kaeya",
    element: "Cryo",
    weapon: "Sword",
    region: "Mondstadt",
    description: "The Cavalry Captain of the Knights of Favonius. He is known for his mysterious demeanor and strategic mind.",
    image_url: "https://api.genshin.dev/characters/kaeya/icon"
  },
  {
    id: 4,
    name: "Lisa",
    element: "Electro",
    weapon: "Catalyst",
    region: "Mondstadt",
    description: "The librarian of the Knights of Favonius. She is a powerful mage who prefers to take things easy.",
    image_url: "https://api.genshin.dev/characters/lisa/icon"
  },
  {
    id: 5,
    name: "Xiangling",
    element: "Pyro",
    weapon: "Polearm",
    region: "Liyue",
    description: "The Head Chef of the Wanmin Restaurant. She is passionate about cooking and always looking for new ingredients.",
    image_url: "https://api.genshin.dev/characters/xiangling/icon"
  },
  {
    id: 6,
    name: "Beidou",
    element: "Electro",
    weapon: "Claymore",
    region: "Liyue",
    description: "The captain of the Crux Fleet. She is a fearless warrior who commands respect on the high seas.",
    image_url: "https://api.genshin.dev/characters/beidou/icon"
  },
  {
    id: 7,
    name: "Xingqiu",
    element: "Hydro",
    weapon: "Sword",
    region: "Liyue",
    description: "A young man from the Feiyun Commerce Guild. He is a skilled swordsman and a lover of literature.",
    image_url: "https://api.genshin.dev/characters/xingqiu/icon"
  },
  {
    id: 8,
    name: "Fischl",
    element: "Electro",
    weapon: "Bow",
    region: "Mondstadt",
    description: "A mysterious girl who calls herself the 'Prinzessin der Verurteilung'. She travels with her familiar, Oz.",
    image_url: "https://api.genshin.dev/characters/fischl/icon"
  },
  {
    id: 9,
    name: "Bennett",
    element: "Pyro",
    weapon: "Sword",
    region: "Mondstadt",
    description: "The leader of Bennett's Adventure Team. Despite his terrible luck, he remains optimistic and brave.",
    image_url: "https://api.genshin.dev/characters/bennett/icon"
  },
  {
    id: 10,
    name: "Noelle",
    element: "Geo",
    weapon: "Claymore",
    region: "Mondstadt",
    description: "A maid in the service of the Knights of Favonius. She dreams of becoming a knight and works tirelessly to achieve her goal.",
    image_url: "https://api.genshin.dev/characters/noelle/icon"
  },
  {
    id: 11,
    name: "Chongyun",
    element: "Cryo",
    weapon: "Claymore",
    region: "Liyue",
    description: "An exorcist from a family of exorcists. He has a pure yang constitution that makes him naturally resistant to evil spirits.",
    image_url: "https://api.genshin.dev/characters/chongyun/icon"
  },
  {
    id: 12,
    name: "Sucrose",
    element: "Anemo",
    weapon: "Catalyst",
    region: "Mondstadt",
    description: "An alchemist who specializes in bio-alchemy. She is shy but incredibly talented in her field.",
    image_url: "https://api.genshin.dev/characters/sucrose/icon"
  }
];

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Fetches all characters from the backend API.
 * Falls back to mock data if the API is unavailable.
 * @returns {Promise<Array>} Array of character objects
 */
async function fetchCharacters() {
  try {
    const response = await fetch('/api/characters');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('API unavailable, using mock data:', error.message);
    return MOCK_CHARACTERS;
  }
}

/**
 * Fetches a single character by ID from the backend API.
 * Falls back to mock data if the API is unavailable.
 * @param {number|string} id - Character ID
 * @returns {Promise<Object|null>} Character object or null if not found
 */
async function fetchCharacter(id) {
  try {
    const response = await fetch(`/api/characters/${id}`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('API unavailable, searching mock data:', error.message);
    const character = MOCK_CHARACTERS.find(c => c.id === parseInt(id));
    return character || null;
  }
}

/**
 * Searches characters by query string from the backend API.
 * Falls back to mock data filtering if the API is unavailable.
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of matching character objects
 */
async function searchCharacters(query) {
  try {
    const response = await fetch(`/api/characters/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('API unavailable, filtering mock data:', error.message);
    const lowerQuery = query.toLowerCase();
    return MOCK_CHARACTERS.filter(character => {
      return (
        character.name.toLowerCase().includes(lowerQuery) ||
        character.element.toLowerCase().includes(lowerQuery) ||
        character.weapon.toLowerCase().includes(lowerQuery) ||
        character.region.toLowerCase().includes(lowerQuery) ||
        character.description.toLowerCase().includes(lowerQuery)
      );
    });
  }
}

/**
 * Returns the CSS class for a given element type.
 * @param {string} element - Element type (e.g., 'Pyro', 'Hydro')
 * @returns {string} CSS class name
 */
function getElementColor(element) {
  const elementColors = {
    'Pyro': 'bg-red-500',
    'Hydro': 'bg-blue-500',
    'Anemo': 'bg-green-500',
    'Electro': 'bg-purple-500',
    'Dendro': 'bg-emerald-500',
    'Cryo': 'bg-cyan-500',
    'Geo': 'bg-yellow-500'
  };
  return elementColors[element] || 'bg-gray-500';
}

/**
 * Renders a single character card as an HTML element.
 * @param {Object} character - Character object
 * @returns {HTMLElement} Character card element
 */
function renderCharacterCard(character) {
  const card = document.createElement('div');
  card.className = 'character-card bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-300 hover:scale-105 cursor-pointer';
  card.dataset.characterId = character.id;
  
  const elementColor = getElementColor(character.element);
  
  card.innerHTML = `
    <div class="relative">
      <img src="${character.image_url || 'https://via.placeholder.com/300x200?text=No+Image'}" 
           alt="${character.name}" 
           class="w-full h-48 object-cover"
           onerror="this.src='https://via.placeholder.com/300x200?text=Image+Not+Available'">
      <span class="absolute top-2 right-2 ${elementColor} text-white px-2 py-1 rounded-full text-xs font-semibold">
        ${character.element}
      </span>
    </div>
    <div class="p-4">
      <h3 class="text-lg font-bold text-gray-800 mb-2">${character.name}</h3>
      <div class="space-y-1 text-sm text-gray-600">
        <p><span class="font-semibold">Weapon:</span> ${character.weapon}</p>
        <p><span class="font-semibold">Region:</span> ${character.region}</p>
      </div>
      <p class="mt-2 text-sm text-gray-500 line-clamp-2">${character.description}</p>
    </div>
  `;
  
  // Add click event to navigate to detail page
  card.addEventListener('click', () => {
    window.location.href = `/detail.html?id=${character.id}`;
  });
  
  return card;
}

/**
 * Renders an array of characters into a container element.
 * @param {Array} characters - Array of character objects
 * @param {HTMLElement} container - Container element to render into
 */
function renderCharacters(characters, container) {
  if (!container) {
    console.error('Container element not found');
    return;
  }
  
  // Clear existing content
  container.innerHTML = '';
  
  if (!characters || characters.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-12">
        <p class="text-gray-500 text-lg">No characters found.</p>
      </div>
    `;
    return;
  }
  
  // Create a document fragment for better performance
  const fragment = document.createDocumentFragment();
  
  characters.forEach(character => {
    const card = renderCharacterCard(character);
    fragment.appendChild(card);
  });
  
  container.appendChild(fragment);
}

/**
 * Initializes navigation highlighting based on current page.
 */
function initNavigation() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('nav a');
  
  navLinks.forEach(link => {
    const linkPage = link.getAttribute('href');
    if (linkPage === currentPage) {
      link.classList.add('text-blue-600', 'font-semibold');
      link.classList.remove('text-gray-600', 'hover:text-blue-600');
    }
  });
}

/**
 * Initializes search functionality if search input exists.
 */
function initSearch() {
  const searchInput = document.getElementById('search-input');
  const searchButton = document.getElementById('search-button');
  const charactersContainer = document.getElementById('characters-container');
  
  if (!searchInput || !searchButton || !charactersContainer) {
    return; // Search elements not found on this page
  }
  
  async function performSearch() {
    const query = searchInput.value.trim();
    if (!query) {
      // If search is empty, load all characters
      const characters = await fetchCharacters();
      renderCharacters(characters, charactersContainer);
      return;
    }
    
    // Show loading state
    charactersContainer.innerHTML = `
      <div class="col-span-full text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p class="mt-4 text-gray-500">Searching...</p>
      </div>
    `;
    
    const results = await searchCharacters(query);
    renderCharacters(results, charactersContainer);
  }
  
  // Search on button click
  searchButton.addEventListener('click', performSearch);
  
  // Search on Enter key press
  searchInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      performSearch();
    }
  });
  
  // Debounced search as user types (optional)
  let debounceTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(performSearch, 300);
  });
}

/**
 * Initializes the featured characters section on the homepage.
 */
async function initFeaturedCharacters() {
  const featuredContainer = document.getElementById('featured-characters');
  if (!featuredContainer) {
    return; // Not on homepage
  }
  
  try {
    const characters = await fetchCharacters();
    // Show first 4 characters as featured
    const featured = characters.slice(0, 4);
    renderCharacters(featured, featuredContainer);
  } catch (error) {
    console.error('Failed to load featured characters:', error);
    featuredContainer.innerHTML = `
      <div class="col-span-full text-center py-12">
        <p class="text-red-500">Failed to load featured characters. Please try again later.</p>
      </div>
    `;
  }
}

/**
 * Initializes the characters gallery on the characters page.
 */
async function initCharactersGallery() {
  const galleryContainer = document.getElementById('characters-container');
  if (!galleryContainer) {
    return; // Not on characters page
  }
  
  // Show loading state
  galleryContainer.innerHTML = `
    <div class="col-span-full text-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p class="mt-4 text-gray-500">Loading characters...</p>
    </div>
  `;
  
  try {
    const characters = await fetchCharacters();
    renderCharacters(characters, galleryContainer);
  } catch (error) {
    console.error('Failed to load characters:', error);
    galleryContainer.innerHTML = `
      <div class="col-span-full text-center py-12">
        <p class="text-red-500">Failed to load characters. Please try again later.</p>
      </div>
    `;
  }
}

// =============================================================================
// Initialize on DOM Content Loaded
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initSearch();
  initFeaturedCharacters();
  initCharactersGallery();
});

// Export functions for use in other scripts (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    fetchCharacters,
    fetchCharacter,
    searchCharacters,
    getElementColor,
    renderCharacterCard,
    renderCharacters
  };
}