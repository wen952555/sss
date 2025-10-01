// server/index.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const { dealCards, isValidHand, compareHands } = require('./gameLogic');

const app = express();
// 生产环境的 CORS 精确配置
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? 'https://xxx.9525.ip-ddns.com' // 你的前端域名
    : 'http://localhost:5173', // 开发环境的前端地址
  methods: ["GET", "POST"]
};
app.use(cors(corsOptions));

const server = http.createServer(app);

const io = new Server(server, {
  cors: corsOptions
});

// --- Game State ---
// 在生产环境中, 你可能需要使用更健壮的状态管理方案, 例如 Redis
let players = {};
let gameState = {
    hands: {}, // 'socket.id': [cards]
    submittedHands: {}, // 'socket.id': { front, middle, back }
    results: {}, // 'socket.id': { scores }
    status: 'waiting' // 'waiting', 'playing', 'finished'
};

function resetGame() {
    gameState = {
        hands: {},
        submittedHands: {},
        results: {},
        status: 'waiting'
    };
    console.log("游戏已重置");
}

function calculateResults() {
    const playerIds = Object.keys(gameState.submittedHands);
    if (playerIds.length < 2) return; // 需要至少两位玩家

    const scores = playerIds.reduce((acc, id) => ({ ...acc, [id]: { front: 0, middle: 0, back: 0, total: 0 } }), {});

    for (let i = 0; i < playerIds.length; i++) {
        for (let j = i + 1; j < playerIds.length; j++) {
            const p1_id = playerIds[i];
            const p2_id = playerIds[j];
            const p1_hands = gameState.submittedHands[p1_id];
            const p2_hands = gameState.submittedHands[p2_id];

            // Compare front
            const frontResult = compareHands(p1_hands.front, p2_hands.front);
            if (frontResult > 0) { scores[p1_id].front++; scores[p2_id].front--; }
            else if (frontResult < 0) { scores[p1_id].front--; scores[p2_id].front++; }

            // Compare middle
            const middleResult = compareHands(p1_hands.middle, p2_hands.middle);
            if (middleResult > 0) { scores[p1_id].middle++; scores[p2_id].middle--; }
            else if (middleResult < 0) { scores[p1_id].middle--; scores[p2_id].middle++; }

            // Compare back
            const backResult = compareHands(p1_hands.back, p2_hands.back);
            if (backResult > 0) { scores[p1_id].back++; scores[p2_id].back--; }
            else if (backResult < 0) { scores[p1_id].back--; scores[p2_id].back++; }
        }
    }

    // Calculate total
    for(const id of playerIds) {
        scores[id].total = scores[id].front + scores[id].middle + scores[id].back;
    }

    gameState.results = scores;
    gameState.status = 'finished';

    io.emit('game_over', {
        hands: gameState.submittedHands,
        results: gameState.results
    });

    console.log("游戏结束，结果已公布:", gameState.results);
}


app.get('/', (req, res) => {
  res.send('<h1>十三水后端服务器 v1.0</h1>');
});

io.on('connection', (socket) => {
  console.log('玩家连接:', socket.id);
  players[socket.id] = { id: socket.id };
  io.emit('players_update', Object.values(players));


  socket.on('start_game', () => {
    // 需要至少2个玩家才能开始游戏
    if (Object.keys(players).length < 2) {
        socket.emit('error_message', '需要至少2位玩家才能开始游戏');
        console.log('游戏开始失败: 玩家不足');
        return;
    }

    console.log(`玩家 ${socket.id} 请求开始新游戏`);
    resetGame();
    const dealtCards = dealCards();
    const playerIds = Object.keys(players);
    
    // For simplicity, we deal to the first 4 connected players
    const activePlayerIds = playerIds.slice(0, 4);

    let i = 1;
    for(const playerId of activePlayerIds) {
        const hand = dealtCards[`player${i}`];
        gameState.hands[playerId] = hand;
        io.to(playerId).emit('deal_hand', hand);
        console.log(`已向玩家 ${playerId} 发送手牌`);
        i++;
    }
    gameState.status = 'playing';
    io.emit('game_started');
  });

  socket.on('submit_hand', (hand) => {
    const { front, middle, back } = hand;
    if (!isValidHand(front, middle, back)) {
        socket.emit('error_message', '牌型不合法 (前墩 > 中墩 或 中墩 > 后墩)');
        return;
    }

    gameState.submittedHands[socket.id] = hand;
    console.log(`玩家 ${socket.id} 已提交牌型`);
    io.emit('player_submitted', socket.id);

    // Check if all players have submitted
    const activePlayerIds = Object.keys(gameState.hands);
    if (Object.keys(gameState.submittedHands).length === activePlayerIds.length && activePlayerIds.length > 0) {
        console.log("所有玩家已提交, 开始计算结果...");
        calculateResults();
    }
  });

  socket.on('disconnect', () => {
    console.log('玩家断开:', socket.id);
    delete players[socket.id];
    // If a player disconnects mid-game, we should handle that. For now, we just remove them.
    // A more robust solution would be to handle game state changes.
    if (gameState.status !== 'waiting') {
        // Simple reset if a player leaves mid-game
        console.log("有玩家在游戏中途断开, 重置游戏。");
        resetGame();
        io.emit('game_reset');
    }
    io.emit('players_update', Object.values(players));
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`服务器正在 http://localhost:${PORT} 上运行`);
});