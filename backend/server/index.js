require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const path = require('path');
const dbPromise = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

let userDb, gameDb;

const {
    dealCards,
    isValidHand,
    evaluate13CardHand,
    evaluate5CardHand,
    evaluate3CardHand,
    comparePlayerHands,
    SPECIAL_HAND_TYPES
} = require('./gameLogic');

async function setupGameDatabase() {
    console.log('Starting SQLite game database setup check...');
    const rawDb = gameDb.getRawDb();
    try {
        const tableExists = await rawDb.get("SELECT name FROM sqlite_master WHERE type='table' AND name='games'");
        if (tableExists) {
            console.log('✅ Game database tables already exist. Skipping setup.');
            return;
        }
        console.log('Game tables not found. Proceeding with database setup...');
        const schemaSQL = `
          CREATE TABLE games (id INTEGER PRIMARY KEY AUTOINCREMENT, room_id TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
          CREATE TABLE player_scores (id INTEGER PRIMARY KEY AUTOINCREMENT, game_id INTEGER NOT NULL, player_id TEXT NOT NULL, player_name TEXT NOT NULL, hand_front TEXT, hand_middle TEXT, hand_back TEXT, score INTEGER NOT NULL, special_hand_type TEXT, FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE);
        `;
        await rawDb.exec(schemaSQL);
        console.log('✅ Game-related tables created successfully for SQLite!');
    } catch (error) {
        console.error('🔴 An error occurred during SQLite game database setup:', error.message);
        process.exit(1);
    }
}

const app = express();
app.use(cors());
app.use(express.json());

// --- Auth API Routes ---
const apiRouter = express.Router();

apiRouter.post('/register', async (req, res) => {
    const { phone, password } = req.body;
    if (!phone || !password) {
        return res.status(400).json({ success: false, message: 'Phone number and password are required.' });
    }
    if (!/^\d{11}$/.test(phone)) {
        return res.status(400).json({ success: false, message: 'Please enter a valid 11-digit phone number.' });
    }
    if (password.length < 8) {
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
    }

    try {
        const existingUser = await userDb.get('SELECT id FROM users WHERE phone = ?', [phone]);
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'This phone number is already registered.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        let displayId;
        let isUnique = false;
        while (!isUnique) {
            displayId = Math.random().toString().slice(2, 5).padStart(3, '0');
            const existingDisplayId = await userDb.get('SELECT id FROM users WHERE display_id = ?', [displayId]);
            if (!existingDisplayId) {
                isUnique = true;
            }
        }

        await userDb.run('INSERT INTO users (phone, password, display_id) VALUES (?, ?, ?)', [phone, hashedPassword, displayId]);
        res.status(201).json({ success: true, message: 'User registered successfully.' });
    } catch (error) {
        console.error('Registration failed:', error);
        res.status(500).json({ success: false, message: 'Registration failed: ' + error.message });
    }
});

apiRouter.post('/login', async (req, res) => {
    const { phone, password } = req.body;
    if (!phone || !password) {
        return res.status(400).json({ success: false, message: 'Phone and password are required.' });
    }

    try {
        const user = await userDb.get('SELECT * FROM users WHERE phone = ?', [phone]);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const tokenPayload = {
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7), // 7 days
            data: { id: user.id, display_id: user.display_id, phone: user.phone }
        };

        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'a_secure_secret_for_development');
        res.json({ success: true, token });
    } catch (error) {
        console.error('Login failed:', error);
        res.status(500).json({ success: false, message: 'Server error during login.' });
    }
});

apiRouter.post('/forgot-password', async (req, res) => {
    const { phone } = req.body;
    if (!phone) {
        return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }

    try {
        const user = await userDb.get('SELECT id FROM users WHERE phone = ?', [phone]);
        if (user) {
            const token = crypto.randomBytes(20).toString('hex');
            const expires = Date.now() + 3600000; // 1 hour
            await userDb.run('UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?', [token, expires, user.id]);
            // In a real app, you'd email this token. Here we return it for testing.
            return res.json({ success: true, message: 'Password reset token generated.', reset_token: token });
        }
        // Always return a success-like message to prevent user enumeration
        res.json({ success: true, message: 'If a user with that phone number exists, a reset token has been generated.' });
    } catch (error) {
        console.error('Forgot password failed:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

apiRouter.post('/reset-password', async (req, res) => {
    const { phone, token, newPassword } = req.body;
    if (!phone || !token || !newPassword) {
        return res.status(400).json({ success: false, message: 'Phone, token, and new password are required.' });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
    }

    try {
        const user = await userDb.get('SELECT * FROM users WHERE phone = ? AND reset_token = ? AND reset_expires > ?', [phone, token, Date.now()]);
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await userDb.run('UPDATE users SET password = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?', [hashedPassword, user.id]);

        res.json({ success: true, message: 'Password has been reset successfully.' });
    } catch (error) {
        console.error('Reset password failed:', error);
        res.status(500).json({ success: false, message: 'Server error during password reset.' });
    }
});

app.use('/api', apiRouter);


// --- Game API Routes ---
app.get('/games', async (req, res) => {
  try {
    const [games] = await gameDb.query('SELECT * FROM games ORDER BY created_at DESC LIMIT 10');
    for (let game of games) {
      const [scores] = await gameDb.query('SELECT * FROM player_scores WHERE game_id = ?', [game.id]);
      game.players = scores;
    }
    res.json({ success: true, data: games });
  } catch (error) {
    console.error('Failed to retrieve game history:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve game history.' });
  }
});

const frontendDistPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDistPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:8000"],
        methods: ["GET", "POST"]
    }
});

const gameRooms = {};

function createNewGameState() {
    return {
        players: {},
        gameState: {
            hands: {}, submittedHands: {}, evaluatedHands: {},
            specialHands: {}, results: null, status: 'waiting'
        }
    };
}

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
            }
        }
    }

    gameState.results = { scores: finalScores, hands: gameState.submittedHands, evals: gameState.evaluatedHands, playerDetails: players };
    gameState.status = 'finished';
    io.to(roomId).emit('game_over', gameState.results);

    try {
        const [gameResult] = await gameDb.query('INSERT INTO games (room_id) VALUES (?)', [roomId]);
        const gameId = gameResult.insertId;
        for (const playerId of playerIds) {
            const { front, middle, back } = gameState.submittedHands[playerId];
            const score = finalScores[playerId].total;
            const specialHandType = finalScores[playerId].special || null;
            const playerName = players[playerId]?.name || 'Unknown';
            const dbPlayerId = players[playerId]?.id; // This is the user ID from the JWT
            if (!dbPlayerId) continue;
            await gameDb.query(
                'INSERT INTO player_scores (game_id, player_id, player_name, hand_front, hand_middle, hand_back, score, special_hand_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [gameId, dbPlayerId, playerName, JSON.stringify(front), JSON.stringify(middle), JSON.stringify(back), score, specialHandType]
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

    socket.on('join_room', (roomId, token) => {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'a_secure_secret_for_development');
            const userData = decoded.data;
            const displayId = userData.display_id;
            const userId = userData.id;

            currentRoomId = roomId;
            socket.join(roomId);

            if (!gameRooms[roomId]) {
                gameRooms[roomId] = createNewGameState();
            }
            const room = gameRooms[roomId];
            const isHost = Object.keys(room.players).length === 0;
            room.players[socket.id] = { id: userId, socketId: socket.id, name: displayId, isReady: false, isHost, hasSubmitted: false };

            io.to(roomId).emit('players_update', Object.values(room.players));
            console.log(`Player ${socket.id} (User ID: ${displayId}) joined room ${roomId}.`);
            broadcastRoomsUpdate(io);
        } catch (error) {
            console.error("JWT verification failed:", error.message);
            socket.emit('error_message', '无效的认证凭证，请重新登录。');
        }
    });

    socket.on('player_ready', (isReady) => {
        if (currentRoomId && gameRooms[currentRoomId]?.players[socket.id]) {
            gameRooms[currentRoomId].players[socket.id].isReady = isReady;
            io.to(currentRoomId).emit('players_update', Object.values(gameRooms[currentRoomId].players));
        }
    });

    socket.on('start_game', () => {
        if (!currentRoomId || !gameRooms[currentRoomId]) return;
        const room = gameRooms[currentRoomId];
        const player = room.players[socket.id];
        if (!player?.isHost) return socket.emit('error_message', '只有房主才能开始游戏');
        const playersInRoom = Object.values(room.players);
        if (playersInRoom.length < 2) return socket.emit('error_message', '需要至少2位玩家才能开始游戏');
        if (!playersInRoom.every(p => p.isHost || p.isReady)) return socket.emit('error_message', '所有玩家都准备好后才能开始游戏');

        room.gameState.status = 'playing';
        const dealtCards = dealCards();
        Object.keys(room.players).forEach((socketId, i) => {
            room.gameState.hands[socketId] = dealtCards[`player${i + 1}`];
            io.to(socketId).emit('deal_hand', dealtCards[`player${i + 1}`]);
        });

        io.to(currentRoomId).emit('game_started');
        broadcastRoomsUpdate(io);
    });

    socket.on('submit_hand', async (hand) => {
        if (!currentRoomId || !gameRooms[currentRoomId] || gameRooms[currentRoomId].gameState.status !== 'playing') return;
        if (!isValidHand(hand.front, hand.middle, hand.back)) return socket.emit('error_message', '牌型不合法 (倒水)');

        const room = gameRooms[currentRoomId];
        room.gameState.submittedHands[socket.id] = hand;
        room.players[socket.id].hasSubmitted = true;
        io.to(currentRoomId).emit('players_update', Object.values(room.players));

        if (Object.keys(room.gameState.submittedHands).length === Object.keys(room.gameState.hands).length) {
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
            delete gameRooms[currentRoomId];
        } else {
            if (wasHost) {
                Object.values(room.players)[0].isHost = true;
            }
            if (wasInGame) {
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

async function startServer() {
    try {
        const dbs = await dbPromise;
        userDb = dbs.userDb;
        gameDb = dbs.gameDb;
        await setupGameDatabase();
        server.listen(PORT, HOST, () => {
            console.log(`✅ Node.js game server is running at http://${HOST}:${PORT}`);
        });
    } catch (err) {
        console.error("🔴 Failed to start Node.js server:", err);
        process.exit(1);
    }
}

startServer();