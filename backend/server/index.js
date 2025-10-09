require('dotenv').config();
// server/index.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const path = require('path');
const dbPromise = require('../db');

let db; // Will be initialized after the promise resolves

const {
    dealCards,
    isValidHand,
    evaluate13CardHand,
    evaluate5CardHand,
    evaluate3CardHand,
    comparePlayerHands,
    SPECIAL_HAND_TYPES
} = require('./gameLogic');

// --- Database Setup (SQLite compatible) ---
async function setupDatabase() {
    console.log('Starting SQLite database setup check...');
    const rawDb = db.getRawDb();

    try {
        const tableExists = await rawDb.get("SELECT name FROM sqlite_master WHERE type='table' AND name='games'");
        if (tableExists) {
            console.log('✅ Database tables already exist. Skipping setup.');
            return;
        }

        console.log('Tables not found. Proceeding with database setup...');

        // Simplified schema without users table
        const schemaSQL = `
          CREATE TABLE games (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              room_id TEXT NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE player_scores (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              game_id INTEGER NOT NULL,
              player_id TEXT NOT NULL, -- Will store socket.id
              player_name TEXT NOT NULL,
              hand_front TEXT,
              hand_middle TEXT,
              hand_back TEXT,
              score INTEGER NOT NULL,
              special_hand_type TEXT,
              FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
          );
        `;

        await rawDb.exec(schemaSQL);
        console.log('✅ All tables created successfully for SQLite!');
    } catch (error) {
        console.error('🔴 An error occurred during SQLite database setup:', error.message);
        process.exit(1);
    }
}

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- API Routes ---
app.get('/games', async (req, res) => {
  try {
    const games = await db.all('SELECT * FROM games ORDER BY created_at DESC LIMIT 10');
    for (let game of games) {
      const scores = await db.all('SELECT * FROM player_scores WHERE game_id = ?', [game.id]);
      game.players = scores;
    }
    res.json({ success: true, data: games });
  } catch (error) {
    console.error('Failed to retrieve game history:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve game history.' });
  }
});

// --- Auth and User routes are removed ---

// Serve static files from the React frontend app
const frontendDistPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDistPath));

// --- Fallback Route ---
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "http://localhost:5174"],
        methods: ["GET", "POST"]
    }
});

// --- Game State ---
const gameRooms = {};

const createNewGameState = () => ({
    players: {},
    gameState: {
        hands: {},
        submittedHands: {},
        evaluatedHands: {},
        specialHands: {},
        results: null,
        status: 'waiting'
    }
});

function resetGame(roomId) {
    const room = gameRooms[roomId];
    if (room) {
        const players = room.players;
        gameRooms[roomId] = createNewGameState();
        gameRooms[roomId].players = players;
        Object.values(gameRooms[roomId].players).forEach(p => p.isReady = false);
        console.log(`Room ${roomId} has been reset.`);
    }
}

function broadcastRoomsUpdate(io) {
    const rooms = Object.entries(gameRooms).map(([id, room]) => ({
        id,
        playerCount: Object.keys(room.players).length,
        players: Object.values(room.players).map(p => p.name),
        status: room.gameState.status,
    }));
    io.emit('rooms_update', rooms);
}

// --- Scoring Logic ---
async function calculateResults(roomId, io) {
    const room = gameRooms[roomId];
    if (!room) return;
    const { players, gameState } = room;
    const playerIds = Object.keys(gameState.submittedHands);
    if (playerIds.length === 0) return;

    playerIds.forEach(id => {
        const { front, middle, back } = gameState.submittedHands[id];
        gameState.evaluatedHands[id] = {
            front: evaluate3CardHand(front),
            middle: evaluate5CardHand(middle),
            back: evaluate5CardHand(back),
        };
        const allCards = [...front, ...middle, ...back];
        gameState.specialHands[id] = evaluate13CardHand(allCards);
    });

    const finalScores = playerIds.reduce((acc, id) => ({ ...acc, [id]: { total: 0, special: null, comparisons: {} } }), {});

    const specialPlayerId = playerIds.find(id => gameState.specialHands[id].value > SPECIAL_HAND_TYPES.NONE.value);
    if (specialPlayerId) {
        const specialHand = gameState.specialHands[specialPlayerId];
        const score = specialHand.score;
        finalScores[specialPlayerId].special = specialHand.name;
        playerIds.forEach(id => {
            finalScores[id].total = (id === specialPlayerId) ? score * (playerIds.length - 1) : -score;
        });
    } else {
        for (let i = 0; i < playerIds.length; i++) {
            for (let j = i + 1; j < playerIds.length; j++) {
                const p1_id = playerIds[i];
                const p2_id = playerIds[j];
                const { p1_score, p2_score } = comparePlayerHands(gameState.evaluatedHands[p1_id], gameState.evaluatedHands[p2_id]);
                finalScores[p1_id].total += p1_score;
                finalScores[p2_id].total += p2_score;
                finalScores[p1_id].comparisons[p2_id] = p1_score;
                finalScores[p2_id].comparisons[p1_id] = p2_score;
            }
        }
    }

    gameState.results = { scores: finalScores, hands: gameState.submittedHands, evals: gameState.evaluatedHands, playerDetails: players };
    gameState.status = 'finished';
    io.to(roomId).emit('game_over', gameState.results);
    console.log(`Room ${roomId} game over. Results sent.`);

    try {
        const { lastID } = await db.run('INSERT INTO games (room_id) VALUES (?)', [roomId]);
        const gameId = lastID;
        for (const playerId of playerIds) {
            const { front, middle, back } = gameState.submittedHands[playerId];
            const score = finalScores[playerId].total;
            const specialHandType = finalScores[playerId].special || null;
            const playerName = players[playerId]?.name || 'Unknown';
            await db.run(
                'INSERT INTO player_scores (game_id, player_id, player_name, hand_front, hand_middle, hand_back, score, special_hand_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [gameId, playerId, playerName, JSON.stringify(front), JSON.stringify(middle), JSON.stringify(back), score, specialHandType]
            );
        }
        console.log(`Game ${gameId} results for room ${roomId} saved.`);
    } catch (error) {
        console.error(`Failed to save game results for room ${roomId}:`, error);
    }
}

// --- Socket Handlers ---
io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);
    let currentRoomId = null;

    socket.on('get_rooms', () => {
        const rooms = Object.entries(gameRooms).map(([id, room]) => ({
            id,
            playerCount: Object.keys(room.players).length,
            status: room.gameState.status,
        }));
        socket.emit('rooms_update', rooms);
    });

    socket.on('join_room', (roomId) => {
        const guestName = `Guest-${socket.id.substring(0, 4)}`;
        currentRoomId = roomId;
        socket.join(roomId);

        if (!gameRooms[roomId]) {
            gameRooms[roomId] = createNewGameState();
            console.log(`Room ${roomId} created.`);
        }
        const room = gameRooms[roomId];
        const isHost = Object.keys(room.players).length === 0;
        room.players[socket.id] = { id: socket.id, socketId: socket.id, name: guestName, isReady: false, isHost, hasSubmitted: false };

        io.to(roomId).emit('players_update', Object.values(room.players));
        console.log(`Player ${socket.id} (${guestName}) joined room ${roomId} ${isHost ? 'as host' : ''}.`);
        broadcastRoomsUpdate(io);
    });

    socket.on('player_ready', (isReady) => {
        if (!currentRoomId || !gameRooms[currentRoomId]?.players[socket.id]) return;
        gameRooms[currentRoomId].players[socket.id].isReady = isReady;
        io.to(currentRoomId).emit('players_update', Object.values(gameRooms[currentRoomId].players));
    });

    socket.on('start_game', () => {
        if (!currentRoomId || !gameRooms[currentRoomId]) return;
        const room = gameRooms[currentRoomId];
        const player = room.players[socket.id];
        if (!player?.isHost) return socket.emit('error_message', '只有房主才能开始游戏');

        const playersInRoom = Object.values(room.players);
        if (playersInRoom.length < 2) return socket.emit('error_message', '需要至少2位玩家才能开始游戏');

        const allReady = playersInRoom.every(p => p.isHost || p.isReady);
        if (!allReady) return socket.emit('error_message', '所有玩家都准备好后才能开始游戏');

        console.log(`Game started in room ${currentRoomId} by host ${player.name}`);
        Object.values(room.players).forEach(p => p.isReady = false);
        room.gameState.status = 'playing';
        const dealtCards = dealCards();
        const playerIds = Object.keys(room.players);
        playerIds.forEach((socketId, i) => {
            const hand = dealtCards[`player${i + 1}`];
            if (hand) {
                room.gameState.hands[socketId] = hand;
                io.to(socketId).emit('deal_hand', hand);
            }
        });

        io.to(currentRoomId).emit('game_started');
        broadcastRoomsUpdate(io);
    });

    socket.on('submit_hand', async (hand) => {
        if (!currentRoomId || !gameRooms[currentRoomId]) return;
        const room = gameRooms[currentRoomId];
        if (room.gameState.status !== 'playing') return;
        if (!isValidHand(hand.front, hand.middle, hand.back)) return socket.emit('error_message', '牌型不合法 (倒水)');

        room.gameState.submittedHands[socket.id] = hand;
        room.players[socket.id].hasSubmitted = true;
        console.log(`Player ${socket.id} in room ${currentRoomId} submitted hand`);

        io.to(currentRoomId).emit('players_update', Object.values(room.players));

        const activePlayerIds = Object.keys(room.gameState.hands);
        if (Object.keys(room.gameState.submittedHands).length === activePlayerIds.length) {
            console.log(`All players in room ${currentRoomId} submitted. Calculating...`);
            await calculateResults(currentRoomId, io);
            broadcastRoomsUpdate(io);
        }
    });

    const handleLeaveOrDisconnect = () => {
        if (!currentRoomId || !gameRooms[currentRoomId]) return;
        const room = gameRooms[currentRoomId];
        const player = room.players[socket.id];
        if (!player) return;

        console.log(`Player ${player.name} left/disconnected from room ${currentRoomId}`);
        const wasHost = player.isHost;
        const wasInGame = room.gameState.status === 'playing' && room.gameState.hands[socket.id];

        delete room.players[socket.id];

        if (Object.keys(room.players).length === 0) {
            console.log(`Room ${currentRoomId} is empty, deleting.`);
            delete gameRooms[currentRoomId];
        } else {
            if (wasHost) {
                const newHost = Object.values(room.players)[0];
                newHost.isHost = true;
                console.log(`Host left. New host: ${newHost.name}`);
            }
            if (wasInGame) {
                console.log(`Player left mid-game. Resetting room ${currentRoomId}.`);
                resetGame(currentRoomId);
                io.to(currentRoomId).emit('game_reset');
            }
            io.to(currentRoomId).emit('players_update', Object.values(room.players));
        }
        broadcastRoomsUpdate(io);
        currentRoomId = null;
    };

    socket.on('leave_room', handleLeaveOrDisconnect);
    socket.on('disconnect', handleLeaveOrDisconnect);
});

const PORT = process.env.PORT || 14722;
const HOST = '0.0.0.0';

// --- Server Startup ---
async function startServer() {
    try {
        const dbWrapper = await dbPromise;
        // Simplified DB interaction for this file
        db = {
            run: (sql, params) => dbWrapper.query(sql, params),
            get: (sql, params) => dbWrapper.query(sql, params).then(res => res[0]?.[0]),
            all: (sql, params) => dbWrapper.query(sql, params).then(res => res[0]),
            exec: (sql) => dbWrapper.getRawDb().exec(sql),
            getRawDb: () => dbWrapper.getRawDb()
        };
        await setupDatabase();
        server.listen(PORT, HOST, () => {
            console.log(`✅ Server is running at http://${HOST}:${PORT}`);
        });
    } catch (err) {
        console.error("🔴 Failed to start server:", err);
        process.exit(1);
    }
}

startServer();