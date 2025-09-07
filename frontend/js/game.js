document.addEventListener('DOMContentLoaded', () => {
    // The server will serve the socket.io client library at this path.
    // We connect to the same server that serves the page.
    const socket = io();

    // --- Connection Events ---
    socket.on('connect', () => {
        console.log('Connected to the server!', 'My Socket ID:', socket.id);
        const gameInfo = document.getElementById('game-info');
        if (gameInfo) {
            gameInfo.textContent = '连接成功！等待其他玩家...';
        }
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from the server.');
        const gameInfo = document.getElementById('game-info');
        if (gameInfo) {
            gameInfo.textContent = '连接已断开';
        }
    });

    // --- Game Logic ---
    socket.on('hand', (hand) => {
        console.log('Received hand:', hand);
        renderHand(hand);
    });

    socket.on('gameStart', ({ turn }) => {
        console.log('Game is starting!', 'First turn:', turn);
        const gameInfo = document.getElementById('game-info');
        if (gameInfo) {
            gameInfo.textContent = `游戏开始！轮到 ${turn}行动`;
        }
    });

    function renderHand(cards) {
        const myHandContainer = document.getElementById('my-hand');
        myHandContainer.innerHTML = ''; // Clear current hand

        cards.forEach(card => {
            const cardDiv = document.createElement('div');
            cardDiv.classList.add('card');

            const rankSpan = document.createElement('span');
            rankSpan.classList.add('rank');
            rankSpan.textContent = card.rank;

            const suitSpan = document.createElement('span');
            suitSpan.classList.add('suit');
            suitSpan.innerHTML = card.suit || ''; // Jokers have no suit symbol

            // Color jokers differently
            if (!card.suit) {
                cardDiv.classList.add(card.rank.includes('Red') ? 'red-joker' : 'black-joker');
            } else if (['♥', '♦'].includes(card.suit)) {
                cardDiv.classList.add('red-card');
            }

            cardDiv.appendChild(rankSpan);
            cardDiv.appendChild(suitSpan);
            myHandContainer.appendChild(cardDiv);
        });
    }
});
