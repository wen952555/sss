const newGameBtn = document.getElementById('newGameBtn');
const getStateBtn = document.getElementById('getStateBtn');
const gameArea = document.getElementById('gameArea');

// IMPORTANT: Update this URL to your Serv00 PHP backend API endpoint
const API_BASE_URL = 'http://YOUR_SERV00_USERNAME.serv00.net/thirteen_waters_api/api/game.php';

newGameBtn.addEventListener('click', async () => {
    try {
        const response = await fetch(`${API_BASE_URL}?action=new_game&players=2`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('New Game:', data);
        if (data.status === 'success') {
            renderGameState(data.gameState);
        } else {
            alert('Error starting new game: ' + data.message);
        }
    } catch (error) {
        console.error('Error fetching new game:', error);
        alert('Failed to start new game. Check console for details.');
    }
});

getStateBtn.addEventListener('click', async () => {
    try {
        const response = await fetch(`${API_BASE_URL}?action=get_state`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Game State:', data);
        if (data.status === 'success') {
            renderGameState(data.gameState);
        } else {
            alert('Error getting game state: ' + data.message);
        }
    } catch (error) {
        console.error('Error fetching game state:', error);
        alert('Failed to get game state. Check console for details.');
    }
});

function renderGameState(gameState) {
    gameArea.innerHTML = ''; // Clear previous state
    if (!gameState) {
        gameArea.textContent = 'No game data available.';
        return;
    }

    for (const playerId in gameState) {
        const player = gameState[playerId];
        const playerDiv = document.createElement('div');
        playerDiv.classList.add('player-hand');
        playerDiv.innerHTML = `<h3>${playerId} (Score: ${player.score})</h3>`;

        const handDiv = document.createElement('div');
        if (player.hand && player.hand.length > 0) {
            player.hand.forEach(cardStr => {
                const cardEl = document.createElement('span');
                cardEl.classList.add('card');
                cardEl.textContent = cardStr;
                handDiv.appendChild(cardEl);
            });
        } else {
            handDiv.textContent = 'No cards dealt yet.';
        }
        playerDiv.appendChild(handDiv);

        // TODO: Display played hands if available
        // if(player.played_hands) { ... }

        gameArea.appendChild(playerDiv);
    }
}

// Initial state load (optional)
// getStateBtn.click();
