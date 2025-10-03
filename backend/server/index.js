// server/index.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const path = require('path');
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
app.use(cors());
app.use(express.json());

// Serve static files from the React frontend app
const frontendDistPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDistPath));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["https://xxx.9525.ip-ddns.com", "http://localhost:5173"],
        methods: ["GET", "POST"]
    }
});

// --- Game State ---
const gameRooms = {};

function createNewGameState() {
    return {
        players: {},
        gameState: {
            hands: {},
            submittedHands: {},
            evaluatedHands: {},
            specialHands: {},
            results: null,
            status: 'waiting'
        }
    };
}

function resetGame(roomId) {
    if (gameRooms[roomId]) {
        gameRooms[roomId] = createNewGameState();
        console.log(`Room ${roomId} has been reset.`);
    }
}

// Function to get and broadcast the list of rooms
function broadcastRoomsUpdate(io) {
    const rooms = Object.entries(gameRooms).map(([id, room]) => ({
        id,
        playerCount: Object.keys(room.players).length,
        status: room.gameState.status,
    }));
    io.emit('rooms_update', rooms);
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

async function calculateResults(roomId, io) {
    const room = gameRooms[roomId];
    if (!room) return;

    const { players, gameState } = room;
    const playerIds = Object.keys(gameState.submittedHands); // These are socket.ids
    if (playerIds.length === 0) return;

    // 1. Evaluate all hands first
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

    // 2. Initialize scores and detailed comparison report
    const finalScores = playerIds.reduce((acc, id) => {
        acc[id] = { total: 0, special: null, comparisons: {} };
        return acc;
    }, {});

    // 3. Handle special hands (these override normal scoring)
    const specialPlayerId = playerIds.find(id => gameState.specialHands[id].value > SPECIAL_HAND_TYPES.NONE.value);
    if (specialPlayerId) {
        const specialHand = gameState.specialHands[specialPlayerId];
        const score = specialHand.score;
        finalScores[specialPlayerId].special = specialHand.name;

        playerIds.forEach(id => {
            if (id === specialPlayerId) {
                finalScores[id].total = score * (playerIds.length - 1);
            } else {
                finalScores[id].total = -score;
            }
        });
    } else {
        // 4. Standard scoring if no special hands
        for (let i = 0; i < playerIds.length; i++) {
            for (let j = i + 1; j < playerIds.length; j++) {
                const p1_id = playerIds[i];
                const p2_id = playerIds[j];

                const p1_evals = gameState.evaluatedHands[p1_id];
                const p2_evals = gameState.evaluatedHands[p2_id];

                const { p1_score, p2_score } = comparePlayerHands(p1_id, p2_id, p1_evals, p2_evals);

                finalScores[p1_id].total += p1_score;
                finalScores[p2_id].total += p2_score;

                // Store detailed comparison for the UI
                finalScores[p1_id].comparisons[p2_id] = p1_score;
                finalScores[p2_id].comparisons[p1_id] = p2_score;
            }
        }
    }

    // 5. Finalize results object and emit
    gameState.results = {
        scores: finalScores,
        hands: gameState.submittedHands,
        evals: gameState.evaluatedHands,
        playerDetails: players // Send player details for name mapping on client
    };
    gameState.status = 'finished';
    io.to(roomId).emit('game_over', gameState.results);
    console.log(`Room ${roomId} game over. Results:`, JSON.stringify(gameState.results, null, 2));

    // 6. Persist to Database
    try {
        const [gameResult] = await db.query('INSERT INTO games (room_id) VALUES (?)', [roomId]);
        const gameId = gameResult.insertId;

        for (const playerId of playerIds) {
            const { front, middle, back } = gameState.submittedHands[playerId];
            const score = finalScores[playerId].total;
            const specialHandType = finalScores[playerId].special || null;
            const playerName = players[playerId]?.name || 'Unknown';
            const dbPlayerId = players[playerId]?.id; // The actual user ID from the database

            if (!dbPlayerId) continue; // Don't save if player doesn't have a DB id

            await db.query(
                'INSERT INTO player_scores (game_id, player_id, player_name, hand_front, hand_middle, hand_back, score, special_hand_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [gameId, dbPlayerId, playerName, JSON.stringify(front), JSON.stringify(middle), JSON.stringify(back), score, specialHandType]
            );
        }
        console.log(`Game ${gameId} results for room ${roomId} saved to database.`);
    } catch (error) {
        console.error(`Failed to save game results for room ${roomId} to database:`, error);
    }
}

// --- Socket Handlers ---
io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);
    let currentRoomId = null;

    // Send the initial list of rooms to the newly connected client
    socket.on('get_rooms', () => {
        const rooms = Object.entries(gameRooms).map(([id, room]) => ({
            id,
            playerCount: Object.keys(room.players).length,
            status: room.gameState.status,
        }));
        socket.emit('rooms_update', rooms);
    });

    socket.on('join_room', (roomId, token) => {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_default_secret');
            const username = decoded.username;
            const userId = decoded.id;

            currentRoomId = roomId;
            socket.join(roomId);

            if (!gameRooms[roomId]) {
                gameRooms[roomId] = createNewGameState();
                console.log(`Room ${roomId} created.`);
            }

            const room = gameRooms[roomId];
            // Use the real user data for the player, and add a ready status
            room.players[socket.id] = { id: userId, socketId: socket.id, name: username, isReady: false };

            io.to(roomId).emit('players_update', Object.values(room.players));
            console.log(`Player ${socket.id} (User: ${username}, ID: ${userId}) joined room ${roomId}`);

            // Broadcast the updated room list to everyone
            broadcastRoomsUpdate(io);

        } catch (error) {
            console.error('Authentication error on join_room:', error.message);
            socket.emit('error_message', '无效的认证凭证，请重新登录。');
        }
    });

    socket.on('player_ready', (isReady) => {
        if (!currentRoomId || !gameRooms[currentRoomId] || !gameRooms[currentRoomId].players[socket.id]) return;

        const room = gameRooms[currentRoomId];
        room.players[socket.id].isReady = isReady;

        io.to(currentRoomId).emit('players_update', Object.values(room.players));
        console.log(`Player ${room.players[socket.id].name} in room ${currentRoomId} is now ${isReady ? 'ready' : 'not ready'}`);
    });

    socket.on('start_game', () => {
        if (!currentRoomId || !gameRooms[currentRoomId]) return;

        const room = gameRooms[currentRoomId];
        const playersInRoom = Object.values(room.players);

        if (playersInRoom.length < 2) {
            return socket.emit('error_message', '需要至少2位玩家才能开始游戏');
        }

        const allReady = playersInRoom.every(p => p.isReady);
        if (!allReady) {
            return socket.emit('error_message', '所有玩家都准备好后才能开始游戏');
        }

        console.log(`Player ${socket.id} started game in room ${currentRoomId}`);
        room.gameState.status = 'playing';

        const dealtCards = dealCards();
        const playerIds = Object.keys(room.players);
        let i = 0;
        for (const socketId of playerIds) {
            const hand = dealtCards[`player${++i}`];
            if (!hand) continue;
            room.gameState.hands[socketId] = hand;
            io.to(socketId).emit('deal_hand', hand);
        }

        io.to(currentRoomId).emit('game_started');
        broadcastRoomsUpdate(io); // Update room status to 'playing'
    });

    socket.on('submit_hand', async (hand) => {
        if (!currentRoomId || !gameRooms[currentRoomId]) return;

        const room = gameRooms[currentRoomId];
        if (room.gameState.status !== 'playing') return;

        const { front, middle, back } = hand;
        if (!isValidHand(front, middle, back)) {
            return socket.emit('error_message', '牌型不合法 (前墩>中墩 或 中墩>后墩)');
        }

        room.gameState.submittedHands[socket.id] = hand;
        console.log(`Player ${socket.id} in room ${currentRoomId} submitted hand`);
        io.to(currentRoomId).emit('player_submitted', { id: room.players[socket.id].id, name: room.players[socket.id].name });

        const activePlayerIds = Object.keys(room.gameState.hands);
        if (Object.keys(room.gameState.submittedHands).length === activePlayerIds.length) {
            console.log(`All players in room ${currentRoomId} have submitted. Calculating results...`);
            await calculateResults(currentRoomId, io);
            broadcastRoomsUpdate(io); // Update room status to 'finished'
        }
    });

    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        if (!currentRoomId || !gameRooms[currentRoomId]) return;

        const room = gameRooms[currentRoomId];
        const wasInGame = !!room.gameState.hands[socket.id];
        delete room.players[socket.id];
        delete room.gameState.hands[socket.id];
        delete room.gameState.submittedHands[socket.id];

        if (Object.keys(room.players).length === 0) {
            console.log(`Room ${currentRoomId} is now empty and will be deleted.`);
            delete gameRooms[currentRoomId];
        } else if (wasInGame && room.gameState.status !== 'waiting') {
            console.log(`A player disconnected mid-game in room ${currentRoomId}. Resetting room.`);
            resetGame(currentRoomId);
            io.to(currentRoomId).emit('game_reset');
        }

        io.to(currentRoomId).emit('players_update', Object.values(room.players));
        broadcastRoomsUpdate(io);
    });
});


// --- API Routes ---
app.get('/api/test-db', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS solution');
    res.json({ success: true, message: 'Database connection successful!', data: rows[0] });
  } catch (error) {
    console.error('Database query failed:', error);
    res.status(500).json({ success: false, message: 'Database query failed.' });
  }
});

app.get('/api/games', async (req, res) => {
  try {
    const [games] = await db.query('SELECT * FROM games ORDER BY created_at DESC LIMIT 10');
    for (let game of games) {
      const [scores] = await db.query('SELECT * FROM player_scores WHERE game_id = ?', [game.id]);
      game.players = scores;
    }
    res.json({ success: true, data: games });
  } catch (error) {
    console.error('Failed to retrieve game history:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve game history.' });
  }
});

// --- Auth Routes ---
app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    try {
        const [existingUser] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (existingUser.length > 0) {
            return res.status(409).json({ success: false, message: 'Username already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);

        res.status(201).json({ success: true, message: 'User registered successfully.' });
    } catch (error) {
        console.error('Registration failed:', error);
        res.status(500).json({ success: false, message: 'Registration failed.' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    try {
        const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const user = users[0];
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || 'your_default_secret', {
            expiresIn: '1h'
        });

        res.json({ success: true, message: 'Logged in successfully.', token });
    } catch (error) {
        console.error('Login failed:', error);
        res.status(500).json({ success: false, message: 'Login failed.' });
    }
});

// --- Fallback Route ---
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

const PORT = process.env.PORT || 14722;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`服务器正在 http://${HOST}:${PORT} 上运行`);
});