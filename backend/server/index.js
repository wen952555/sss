// server/index.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const path = require('path'); // Import path module
const {
    dealCards,
    isValidHand,
    evaluate13CardHand,
    evaluate5CardHand,
    evaluate3CardHand,
    compareEvaluatedHands,
    SEGMENT_SCORES,
    SPECIAL_HAND_TYPES
} = require('./gameLogic');

const app = express();

// --- Middleware ---
// Use CORS for all routes. For a production environment, you might want to
// restrict the origin to your actual domain.
app.use(cors());

// Serve static files from the React frontend app
const frontendDistPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDistPath));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for Socket.IO
        methods: ["GET", "POST"]
    }
});

// --- Game State ---
let players = {};
let gameState = {
    hands: {},
    submittedHands: {},
    evaluatedHands: {},
    specialHands: {},
    results: null,
    status: 'waiting'
};

function resetGame() {
    gameState = {
        hands: {},
        submittedHands: {},
        evaluatedHands: {},
        specialHands: {},
        results: null,
        status: 'waiting'
    };
    console.log("游戏已重置");
}

// --- Scoring Logic ---
function comparePlayerHands(p1_id, p2_id, p1_evals, p2_evals) {
    let p1_score = 0;
    let p2_score = 0;
    let p1_wins_count = 0;
    const segments = ['front', 'middle', 'back'];
    for (const segment of segments) {
        const comparison = compareEvaluatedHands(p1_evals[segment], p2_evals[segment]);
        const p1Type = p1_evals[segment]?.type?.name;
        const p2Type = p2_evals[segment]?.type?.name;
        if (comparison > 0) {
            const baseScore = SEGMENT_SCORES[segment]?.[p1Type] || 1;
            p1_score += baseScore;
            p2_score -= baseScore;
            p1_wins_count++;
        } else if (comparison < 0) {
            const baseScore = SEGMENT_SCORES[segment]?.[p2Type] || 1;
            p1_score -= baseScore;
            p2_score += baseScore;
        }
    }
    if (p1_wins_count === 3) { p1_score *= 2; p2_score *= 2; }
    else if (p1_wins_count === 0 && (p1_evals.front && p2_evals.front)) { p1_score *= 2; p2_score *= 2; }
    return { p1_score, p2_score };
}

function calculateResults() {
    const playerIds = Object.keys(gameState.submittedHands);
    if (playerIds.length === 0) return;
    const finalScores = playerIds.reduce((acc, id) => ({ ...acc, [id]: { total: 0, special: null } }), {});
    for (const id of playerIds) {
        const { front, middle, back } = gameState.submittedHands[id];
        gameState.evaluatedHands[id] = {
            front: evaluate3CardHand(front),
            middle: evaluate5CardHand(middle),
            back: evaluate5CardHand(back)
        };
        const allCards = [...front, ...middle, ...back];
        gameState.specialHands[id] = evaluate13CardHand(allCards);
    }
    const specialPlayer = playerIds.find(id => gameState.specialHands[id].value > SPECIAL_HAND_TYPES.NONE.value);
    if (specialPlayer) {
        const specialHand = gameState.specialHands[specialPlayer];
        console.log(`玩家 ${specialPlayer} 有特殊牌型: ${specialHand.name}!`);
        const score = specialHand.score;
        let totalScoreReceived = 0;
        for (const id of playerIds) {
            if (id === specialPlayer) continue;
            finalScores[id].total = -score;
            totalScoreReceived += score;
        }
        finalScores[specialPlayer].total = totalScoreReceived;
        finalScores[specialPlayer].special = specialHand.name;
    } else {
        const playerScores = playerIds.reduce((acc, id) => ({ ...acc, [id]: 0 }), {});
        for (let i = 0; i < playerIds.length; i++) {
            for (let j = i + 1; j < playerIds.length; j++) {
                const p1_id = playerIds[i];
                const p2_id = playerIds[j];
                const { p1_score, p2_score } = comparePlayerHands(p1_id, p2_id, gameState.evaluatedHands[p1_id], gameState.evaluatedHands[p2_id]);
                playerScores[p1_id] += p1_score;
                playerScores[p2_id] += p2_score;
            }
        }
        for (const id of playerIds) { finalScores[id].total = playerScores[id]; }
    }
    gameState.results = { scores: finalScores, hands: gameState.submittedHands, evals: gameState.evaluatedHands };
    gameState.status = 'finished';
    io.emit('game_over', gameState.results);
    console.log("游戏结束，结果已公布:", JSON.stringify(gameState.results, null, 2));
}

// --- Socket Handlers ---
io.on('connection', (socket) => {
  console.log('玩家连接:', socket.id);
  players[socket.id] = { id: socket.id, name: `Player #${Object.keys(players).length + 1}` };
  io.emit('players_update', Object.values(players));
  socket.on('start_game', () => {
    if (Object.keys(players).length < 2) return socket.emit('error_message', '需要至少2位玩家才能开始游戏');
    console.log(`玩家 ${socket.id} 请求开始新游戏`);
    resetGame();
    const dealtCards = dealCards();
    const playerIds = Object.keys(players).slice(0, 4);
    let i = 1;
    for(const playerId of playerIds) {
        const hand = dealtCards[`player${i++}`];
        gameState.hands[playerId] = hand;
        io.to(playerId).emit('deal_hand', hand);
    }
    gameState.status = 'playing';
    io.emit('game_started');
  });
  socket.on('submit_hand', (hand) => {
    if (gameState.status !== 'playing') return;
    const { front, middle, back } = hand;
    if (!isValidHand(front, middle, back)) return socket.emit('error_message', '牌型不合法 (前墩>中墩 或 中墩>后墩)');
    gameState.submittedHands[socket.id] = hand;
    console.log(`玩家 ${socket.id} 已提交牌型`);
    io.emit('player_submitted', {id: socket.id, name: players[socket.id].name });
    const activePlayerIds = Object.keys(gameState.hands);
    if (Object.keys(gameState.submittedHands).length === activePlayerIds.length) {
        console.log("所有玩家已提交, 开始计算结果...");
        calculateResults();
    }
  });
  socket.on('disconnect', () => {
    console.log('玩家断开:', socket.id);
    const wasInGame = !!gameState.hands[socket.id];
    delete players[socket.id];
    delete gameState.hands[socket.id];
    delete gameState.submittedHands[socket.id];
    if (wasInGame && gameState.status !== 'waiting') {
        console.log("有玩家在游戏中途断开, 重置游戏。");
        resetGame();
        io.emit('game_reset');
    }
    io.emit('players_update', Object.values(players));
  });
});

// --- Fallback Route ---
// This will serve the main index.html file for any request that doesn't match the static files
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`服务器正在 http://localhost:${PORT} 上运行`);
});
