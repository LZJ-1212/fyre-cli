// public/script.js - Frontend logic for the 2048 game
// Handles game mechanics, rendering, and communication with the backend API.

// Game state variables
let board = [];
let score = 0;
let gameOver = false;
let gameId = null; // For tracking saved games

// DOM elements
const gridContainer = document.getElementById('grid-container');
const scoreElement = document.getElementById('score');
const gameOverElement = document.getElementById('game-over');
const newGameButton = document.getElementById('new-game');
const saveGameButton = document.getElementById('save-game');
const loadGameButton = document.getElementById('load-game');
const leaderboardButton = document.getElementById('leaderboard');
const leaderboardModal = document.getElementById('leaderboard-modal');
const closeModalButton = document.querySelector('.close-button');
const leaderboardList = document.getElementById('leaderboard-list');

// Constants
const GRID_SIZE = 4;
const WINNING_TILE = 2048;

// Initialize the game
function initGame() {
    board = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
    score = 0;
    gameOver = false;
    gameId = null;
    updateScore();
    gameOverElement.style.display = 'none';
    generateRandomTile();
    generateRandomTile();
    renderBoard();
}

// Generate a random tile (2 or 4) in an empty cell
function generateRandomTile() {
    const emptyCells = [];
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (board[r][c] === 0) {
                emptyCells.push({ r, c });
            }
        }
    }
    if (emptyCells.length > 0) {
        const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        board[r][c] = Math.random() < 0.9 ? 2 : 4;
    }
}

// Render the board to the DOM
function renderBoard() {
    gridContainer.innerHTML = '';
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const tileValue = board[r][c];
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.textContent = tileValue !== 0 ? tileValue : '';
            tile.style.backgroundColor = getTileColor(tileValue);
            tile.style.color = tileValue > 4 ? '#f9f6f2' : '#776e65';
            tile.style.fontSize = tileValue < 100 ? '55px' : tileValue < 1000 ? '45px' : '35px';
            tile.style.gridRow = r + 1;
            tile.style.gridColumn = c + 1;
            gridContainer.appendChild(tile);
        }
    }
}

// Get background color based on tile value
function getTileColor(value) {
    const colors = {
        0: '#cdc1b4',
        2: '#eee4da',
        4: '#ede0c8',
        8: '#f2b179',
        16: '#f59563',
        32: '#f67c5f',
        64: '#f65e3b',
        128: '#edcf72',
        256: '#edcc61',
        512: '#edc850',
        1024: '#edc53f',
        2048: '#edc22e'
    };
    return colors[value] || '#3c3a32';
}

// Update the score display
function updateScore() {
    scoreElement.textContent = score;
}

// Check if the game is over (no moves left)
function checkGameOver() {
    // Check for any empty cell
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (board[r][c] === 0) return false;
        }
    }
    // Check for possible merges horizontally and vertically
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE - 1; c++) {
            if (board[r][c] === board[r][c + 1]) return false;
        }
    }
    for (let c = 0; c < GRID_SIZE; c++) {
        for (let r = 0; r < GRID_SIZE - 1; r++) {
            if (board[r][c] === board[r + 1][c]) return false;
        }
    }
    return true;
}

// Check if the player has won (reached 2048)
function checkWin() {
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (board[r][c] === WINNING_TILE) return true;
        }
    }
    return false;
}

// Move tiles in a given direction
function move(direction) {
    if (gameOver) return false;

    let moved = false;
    const oldBoard = board.map(row => [...row]);

    // Helper to rotate board for consistent leftward processing
    function rotateBoard(times) {
        let newBoard = board.map(row => [...row]);
        for (let t = 0; t < times; t++) {
            newBoard = newBoard[0].map((_, colIndex) => newBoard.map(row => row[colIndex]).reverse());
        }
        board = newBoard;
    }

    // Rotate board so we always process leftward moves
    let rotations = 0;
    switch (direction) {
        case 'up': rotations = 1; break;
        case 'right': rotations = 2; break;
        case 'down': rotations = 3; break;
        default: rotations = 0; // left
    }
    if (rotations > 0) rotateBoard(rotations);

    // Process each row for leftward movement
    for (let r = 0; r < GRID_SIZE; r++) {
        // Remove zeros and merge tiles
        let row = board[r].filter(cell => cell !== 0);
        for (let i = 0; i < row.length - 1; i++) {
            if (row[i] === row[i + 1]) {
                row[i] *= 2;
                score += row[i];
                row.splice(i + 1, 1);
            }
        }
        // Pad with zeros
        while (row.length < GRID_SIZE) row.push(0);
        board[r] = row;
    }

    // Rotate back
    if (rotations > 0) rotateBoard(4 - rotations);

    // Check if board changed
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (oldBoard[r][c] !== board[r][c]) {
                moved = true;
                break;
            }
        }
        if (moved) break;
    }

    if (moved) {
        generateRandomTile();
        updateScore();
        renderBoard();

        if (checkWin()) {
            setTimeout(() => alert('Congratulations! You reached 2048!'), 100);
        } else if (checkGameOver()) {
            gameOver = true;
            gameOverElement.style.display = 'block';
        }
    }

    return moved;
}

// Event listener for keyboard input
document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'ArrowUp':
            event.preventDefault();
            move('up');
            break;
        case 'ArrowDown':
            event.preventDefault();
            move('down');
            break;
        case 'ArrowLeft':
            event.preventDefault();
            move('left');
            break;
        case 'ArrowRight':
            event.preventDefault();
            move('right');
            break;
    }
});

// Save game state to backend
async function saveGame() {
    const gameState = {
        board,
        score,
        timestamp: new Date().toISOString()
    };

    try {
        const response = await fetch('/api/game', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(gameState)
        });
        const data = await response.json();
        if (data.success) {
            gameId = data.gameId;
            alert('Game saved successfully!');
        } else {
            alert('Failed to save game.');
        }
    } catch (error) {
        console.error('Error saving game:', error);
        alert('Network error. Could not save game.');
    }
}

// Load game state from backend
async function loadGame() {
    try {
        const response = await fetch('/api/game');
        const data = await response.json();
        if (data.success && data.game) {
            board = data.game.board;
            score = data.game.score;
            gameId = data.game.id;
            gameOver = false;
            gameOverElement.style.display = 'none';
            updateScore();
            renderBoard();
            alert('Game loaded successfully!');
        } else {
            alert('No saved game found.');
        }
    } catch (error) {
        console.error('Error loading game:', error);
        alert('Network error. Could not load game.');
    }
}

// Fetch and display leaderboard
async function showLeaderboard() {
    try {
        const response = await fetch('/api/leaderboard');
        const data = await response.json();
        if (data.success) {
            leaderboardList.innerHTML = '';
            data.leaderboard.forEach((entry, index) => {
                const li = document.createElement('li');
                li.textContent = `${index + 1}. Score: ${entry.score} - ${new Date(entry.timestamp).toLocaleString()}`;
                leaderboardList.appendChild(li);
            });
            leaderboardModal.style.display = 'block';
        } else {
            alert('Failed to load leaderboard.');
        }
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        alert('Network error. Could not load leaderboard.');
    }
}

// Event listeners for buttons
newGameButton.addEventListener('click', initGame);
saveGameButton.addEventListener('click', saveGame);
loadGameButton.addEventListener('click', loadGame);
leaderboardButton.addEventListener('click', showLeaderboard);
closeModalButton.addEventListener('click', () => {
    leaderboardModal.style.display = 'none';
});
window.addEventListener('click', (event) => {
    if (event.target === leaderboardModal) {
        leaderboardModal.style.display = 'none';
    }
});

// Initialize the game on page load
window.addEventListener('DOMContentLoaded', initGame);