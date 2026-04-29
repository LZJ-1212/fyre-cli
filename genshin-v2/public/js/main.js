// Main JavaScript file for Genshin Impact Wiki
// Handles navigation highlighting, fetches character data from backend API,
// and renders character cards on characters.html

// Utility function to get image URL from LoremFlickr
function getCharacterImageUrl(keyword) {
  return `/api/get-image?q=genshin,${keyword},character`;
}

// Mock data fallback in case API fails
const MOCK_CHARACTERS = [
  {
    id: 1,
    name: 'Traveler',
    element: 'Anemo',
    weapon: 'Sword',
    region: 'Mondstadt',
    description: 'A traveler from another world who has the power to resonate with the elements.',
    image_url: getCharacterImageUrl('traveler,anemo')
  },
  {
    id: 2,
    name: 'Amber',
    element: 'Pyro',
    weapon: 'Bow',
    region: 'Mondstadt',
    description: 'The only remaining Outrider of the Knights of Favonius. She is always ready to help those in need.',
    image_url: getCharacterImageUrl('amber,pyro')
  },
  {
    id: 3,
    name: 'Kaeya',
    element: 'Cryo',
    weapon: 'Sword',
    region: 'Mondstadt',
    description: 'The Cavalry Captain of the Knights of Favonius. He is mysterious and cunning.',
    image_url: getCharacterImageUrl('kaeya,cryo')
  },
  {
    id: 4,
    name: 'Lisa',
    element: 'Electro',
    weapon: 'Catalyst',
    region: 'Mondstadt',
    description: 'The librarian of the Knights of Favonius. She is knowledgeable and powerful.',
    image_url: getCharacterImageUrl('lisa,electro')
  },
  {
    id: 5,
    name: 'Jean',
    element: 'Anemo',
    weapon: 'Sword',
    region: 'Mondstadt',
    description: 'The Acting Grand Master of the Knights of Favonius. She is dedicated to protecting Mondstadt.',
    image_url: getCharacterImageUrl('jean,anemo')
  },
  {
    id: 6,
    name: 'Diluc',
    element: 'Pyro',
    weapon: 'Claymore',
    region: 'Mondstadt',
    description: 'The wealthy owner of the Dawn Winery. He fights against the Abyss Order in secret.',
    image_url: getCharacterImageUrl('diluc,pyro')
  },
  {
    id: 7,
    name: 'Venti',
    element: 'Anemo',
    weapon: 'Bow',
    region: 'Mondstadt',
    description: 'The bard of Mondstadt who is actually the Anemo Archon, Barbatos.',
    image_url: getCharacterImageUrl('venti,anemo')
  },
  {
    id: 8,
    name: 'Zhongli',
    element: 'Geo',
    weapon: 'Polearm',
    region: 'Liyue',
    description: 'The consultant of the Wangsheng Funeral Parlor who is actually the Geo Archon, Morax.',
    image_url: getCharacterImageUrl('zhongli,geo')
  },
  {
    id: 9,
    name: 'Raiden Shogun',
    element: 'Electro',
    weapon: 'Polearm',
    region: 'Inazuma',
    description: 'The Electro Archon who rules over Inazuma with an iron fist.',
    image_url: getCharacterImageUrl('raiden,shogun,electro')
  },
  {
    id: 10,
    name: 'Ganyu',
    element: 'Cryo',
    weapon: 'Bow',
    region: 'Liyue',
    description: 'A half-qilin Adeptus who works as a secretary at the Liyue Qixing.',
    image_url: getCharacterImageUrl('ganyu,cryo')
  }
];

// Function to highlight current page in navigation
function highlightCurrentPage() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('nav a');
  
  navLinks.forEach(link => {
    const linkHref = link.getAttribute('href');
    if (linkHref === currentPage) {
      link.classList.add('text-yellow-400', 'font-bold', 'border-b-2', 'border-yellow-400');
    } else {
      link.classList.remove('text-yellow-400', 'font-bold', 'border-b-2', 'border-yellow-400');
    }
  });
}

// Function to fetch characters from API with fallback to mock data
async function fetchCharacters(element = null) {
  try {
    let url = '/api/characters';
    if (element) {
      url += `?element=${encodeURIComponent(element)}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const characters = await response.json();
    return characters;
  } catch (error) {
    console.warn('API fetch failed, using mock data:', error.message);
    
    // Filter mock data if element filter is applied
    if (element) {
      return MOCK_CHARACTERS.filter(char => 
        char.element.toLowerCase() === element.toLowerCase()
      );
    }
    return MOCK_CHARACTERS;
  }
}

// Function to render character cards
function renderCharacters(characters) {
  const container = document.getElementById('character-grid');
  if (!container) return;
  
  if (!characters || characters.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-12">
        <p class="text-gray-400 text-xl">No characters found matching your filter.</p>
        <button onclick="resetFilter()" class="mt-4 px-6 py-2 bg-yellow-500 text-gray-900 rounded-lg hover:bg-yellow-400 transition-colors">
          Reset Filter
        </button>
      </div>
    `;
    return;
  }
  
  container.innerHTML = characters.map(character => `
    <div class="character-card bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
      <div class="relative h-64 overflow-hidden">
        <img 
          src="${character.image_url || getCharacterImageUrl(character.name.toLowerCase().replace(/\s+/g, ','))}" 
          alt="${character.name}" 
          class="w-full h-full object-cover"
          onerror="this.onerror=null; this.src='https://via.placeholder.com/800x600/1a1a2e/e94560?text=${encodeURIComponent(character.name)}'"
        >
        <div class="absolute top-2 right-2">
          <span class="element-badge px-3 py-1 rounded-full text-sm font-semibold bg-gray-900/80 text-white">
            ${character.element}
          </span>
        </div>
      </div>
      <div class="p-5">
        <h3 class="text-xl font-bold text-white mb-2">${character.name}</h3>
        <div class="flex items-center gap-2 mb-3">
          <span class="text-sm text-gray-400">${character.weapon}</span>
          <span class="text-gray-600">|</span>
          <span class="text-sm text-gray-400">${character.region || 'Unknown'}</span>
        </div>
        <p class="text-gray-400 text-sm leading-relaxed">${character.description || 'No description available.'}</p>
      </div>
    </div>
  `).join('');
}

// Function to filter characters by element
function filterCharacters(element) {
  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(btn => {
    btn.classList.remove('bg-yellow-500', 'text-gray-900');
    btn.classList.add('bg-gray-700', 'text-gray-300');
  });
  
  if (element) {
    const activeButton = document.querySelector(`[data-element="${element}"]`);
    if (activeButton) {
      activeButton.classList.remove('bg-gray-700', 'text-gray-300');
      activeButton.classList.add('bg-yellow-500', 'text-gray-900');
    }
  }
  
  fetchCharacters(element).then(characters => {
    renderCharacters(characters);
  });
}

// Function to apply filter from button click
function applyFilter(element) {
  filterCharacters(element);
}

// Function to reset filter
function resetFilter() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(btn => {
    btn.classList.remove('bg-yellow-500', 'text-gray-900');
    btn.classList.add('bg-gray-700', 'text-gray-300');
  });
  
  // Activate "All" button
  const allButton = document.querySelector('[data-element="all"]');
  if (allButton) {
    allButton.classList.remove('bg-gray-700', 'text-gray-300');
    allButton.classList.add('bg-yellow-500', 'text-gray-900');
  }
  
  fetchCharacters().then(characters => {
    renderCharacters(characters);
  });
}

// Function to setup filter buttons
function setupFilterButtons() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  
  filterButtons.forEach(button => {
    button.addEventListener('click', function() {
      const element = this.getAttribute('data-element');
      if (element === 'all') {
        resetFilter();
      } else {
        applyFilter(element);
      }
    });
  });
}

// Function to initialize the page
function init() {
  // Highlight current page in navigation
  highlightCurrentPage();
  
  // Setup filter buttons if on characters page
  if (document.getElementById('character-grid')) {
    setupFilterButtons();
    
    // Fetch and render all characters on load
    fetchCharacters().then(characters => {
      renderCharacters(characters);
    });
  }
  
  // Add smooth scroll behavior
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export functions for use in other scripts if needed
window.getCharacterImageUrl = getCharacterImageUrl;
window.renderCharacters = renderCharacters;
window.filterCharacters = filterCharacters;
window.applyFilter = applyFilter;
window.resetFilter = resetFilter;
window.setupFilterButtons = setupFilterButtons;
window.init = init;