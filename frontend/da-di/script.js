document.addEventListener('DOMContentLoaded', () => {
    const playerHandElement = document.getElementById('player-hand');

    // Define suits and ranks for creating cards
    const suits = {
        'H': { symbol: '♥', color: 'red' },
        'D': { symbol: '♦', color: 'red' },
        'C': { symbol: '♣', color: 'black' },
        'S': { symbol: '♠', color: 'black' }
    };

    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

    // Define a static hand of 13 cards (e.g., a sample Big Two hand)
    // Format: { rank: 'A', suit: 'S' }
    const staticHand = [
        { rank: 'A', suit: 'S' },
        { rank: 'K', suit: 'S' },
        { rank: 'Q', suit: 'D' },
        { rank: 'J', suit: 'H' },
        { rank: '10', suit: 'C' },
        { rank: '9', suit: 'S' },
        { rank: '8', suit: 'D' },
        { rank: '7', suit: 'C' },
        { rank: '6', suit: 'H' },
        { rank: '5', suit: 'S' },
        { rank: '4', suit: 'D' },
        { rank: '3', suit: 'C' },
        { rank: '2', suit: 'H' }
    ];

    /**
     * Creates and returns a single card HTML element.
     * @param {{rank: string, suit: string}} card - The card to create.
     * @returns {HTMLElement} The card element.
     */
    function createCardElement(card) {
        const cardDiv = document.createElement('div');
        const suitInfo = suits[card.suit];

        cardDiv.className = `card ${suitInfo.color}`;

        const rankSpan = document.createElement('span');
        rankSpan.className = 'rank';
        rankSpan.textContent = card.rank;

        const suitSpan = document.createElement('span');
        suitSpan.className = 'suit';
        suitSpan.innerHTML = suitInfo.symbol;

        cardDiv.appendChild(rankSpan);
        cardDiv.appendChild(suitSpan);

        return cardDiv;
    }

    /**
     * Renders a given hand of cards to the player's hand container.
     * @param {Array<{rank: string, suit: string}>} hand - The hand to render.
     */
    function renderHand(hand) {
        playerHandElement.innerHTML = ''; // Clear existing hand
        hand.forEach(card => {
            const cardElement = createCardElement(card);
            playerHandElement.appendChild(cardElement);
        });
    }

    // Initial render of the static hand
    renderHand(staticHand);
});
