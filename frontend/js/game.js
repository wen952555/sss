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

    // --- Game Logic Placeholder ---
    // More game event listeners will go here, e.g.:
    // socket.on('gameState', (state) => { ... });
    // socket.on('newHand', (cards) => { ... });
});
