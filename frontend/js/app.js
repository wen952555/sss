// ... (之前的代码，API_BASE_URL等保持不变) ...

function getCardImagePath(cardImageString) {
    // cardImageString is now like "spades_ace", "clubs_10", etc.
    if (!cardImageString || typeof cardImageString !== 'string') {
        console.warn('Invalid cardImageString:', cardImageString);
        // Return a path to a placeholder or default back image if needed
        return `images/cards/red_joker.svg`; // Or some other default/error image
    }
    return `images/cards/${cardImageString.toLowerCase()}.svg`; // Ensure lowercase and add .svg extension
}

function renderGameState(gameState) {
    gameArea.innerHTML = ''; // Clear previous state
    if (!gameState) {
        gameArea.textContent = 'No game data available.';
        return;
    }

    for (const playerId in gameState) {
        if (gameState.hasOwnProperty(playerId)) { // Good practice for iterating objects
            const player = gameState[playerId];
            const playerDiv = document.createElement('div');
            playerDiv.classList.add('player-hand-container');
            playerDiv.innerHTML = `<h3>${playerId} (Score: ${player.score})</h3>`;

            const handDiv = document.createElement('div');
            handDiv.classList.add('player-hand');

            if (player.hand && Array.isArray(player.hand) && player.hand.length > 0) {
                player.hand.forEach(cardStr => {
                    const cardImg = document.createElement('img'); // Still using <img> for SVG
                    cardImg.classList.add('card-image');
                    cardImg.src = getCardImagePath(cardStr);
                    cardImg.alt = cardStr.replace('_', ' '); // e.g., "spades ace" for alt text
                    cardImg.title = cardStr.replace('_', ' ');
                    handDiv.appendChild(cardImg);
                });
            } else {
                handDiv.textContent = 'No cards dealt yet or hand is empty.';
            }
            playerDiv.appendChild(handDiv);

            // TODO: Display played hands if available
            // if(player.played_hands) { ... }

            gameArea.appendChild(playerDiv);
        }
    }
}

// ... (事件监听器等代码保持不变) ...

// Example of how to display a card back (if you want to show face-down cards)
// function renderFaceDownCard() {
//     const cardImg = document.createElement('img');
//     cardImg.classList.add('card-image');
//     cardImg.src = 'images/cards/red_joker.svg'; // Your card back image
//     cardImg.alt = 'Card Back';
//     return cardImg;
// }
