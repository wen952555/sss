// server/index.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const path = require('path');
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs/promises');
const mysql = require('mysql2/promise');
require('dotenv').config();


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

// --- Database Setup ---
async function setupDatabase() {
  console.log('Starting database setup check...');

  const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  };

  if (!dbConfig.host || !dbConfig.user || !dbConfig.database) {
    console.error('🔴 Error: Database configuration is missing in your .env file.');
    console.error('Please ensure DB_HOST, DB_USER, and DB_NAME are set.');
    process.exit(1);
  }

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Successfully connected to the database for setup check.');

    // Check if tables already exist to prevent resetting data
    const [tables] = await connection.query("SHOW TABLES LIKE 'users'");
    if (tables.length > 0) {
        console.log('✅ Database tables already exist. Skipping setup.');
        return;
    }

    console.log('Tables not found. Proceeding with database setup...');

    const schemaSQL = `
      CREATE TABLE games (
          id INT AUTO_INCREMENT PRIMARY KEY,
          room_id VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE player_scores (
          id INT AUTO_INCREMENT PRIMARY KEY,
          game_id INT NOT NULL,
          player_id VARCHAR(255) NOT NULL,
          player_name VARCHAR(255) NOT NULL,
          hand_front JSON,
          hand_middle JSON,
          hand_back JSON,
          score INT NOT NULL,
          special_hand_type VARCHAR(255),
          FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
      );

      CREATE TABLE users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          phone VARCHAR(20) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          display_id VARCHAR(3) NOT NULL UNIQUE,
          points INT NOT NULL DEFAULT 1000,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const statements = schemaSQL.split(';').filter(statement => statement.trim() !== '');
    for (const statement of statements) {
      await connection.query(statement);
    }

    console.log('✅ All tables created successfully!');
    console.log('Database setup is complete.');

  } catch (error) {
    console.error('🔴 An error occurred during database setup:', error.message);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        console.error('Hint: This is likely an issue with your database username or password in the .env file.');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
        console.error(`Hint: The database "${dbConfig.database}" does not seem to exist. Please create it first.`);
    }
    process.exit(1); // Exit if setup fails
  } finally {
    if (connection) {
      await connection.end();
      console.log('Setup connection closed.');
    }
  }
}


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
        origin: ["https://xxx.9525.ip-ddns.com", "http://localhost:5173", "http://localhost:5174"],
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
    const room = gameRooms[roomId];
    if (room) {
        const players = room.players;
        gameRooms[roomId] = createNewGameState();
        gameRooms[roomId].players = players;
        Object.values(gameRooms[roomId].players).forEach(p => p.isReady = false);
        console.log(`Room ${roomId} has been reset.`);
    }
}

// Function to get and broadcast the list of rooms
function broadcastRoomsUpdate(io) {
    const rooms = Object.entries(gameRooms).map(([id, room]) => ({
        id,
        playerCount: Object.keys(room.players).length,
        players: Object.values(room.players).map(p => p.name), // Add player names
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

    const finalScores = playerIds.reduce((acc, id) => {
        acc[id] = { total: 0, special: null, comparisons: {} };
        return acc;
    }, {});

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
                const { p1_score, p2_score } = comparePlayerHands(p1_id, p2_id, gameState.evaluatedHands[p1_id], gameState.evaluatedHands[p2_id]);
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
        const [gameResult] = await db.query('INSERT INTO games (room_id) VALUES (?)', [roomId]);
        const gameId = gameResult.insertId;
        for (const playerId of playerIds) {
            const { front, middle, back } = gameState.submittedHands[playerId];
            const score = finalScores[playerId].total;
            const specialHandType = finalScores[playerId].special || null;
            const playerName = players[playerId]?.name || 'Unknown';
            const dbPlayerId = players[playerId]?.id;
            if (!dbPlayerId) continue;
            await db.query(
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
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_default_secret');
            const displayId = decoded.display_id; // Use display_id from token
            const userId = decoded.id;
            currentRoomId = roomId;
            socket.join(roomId);

            if (!gameRooms[roomId]) {
                gameRooms[roomId] = createNewGameState();
                console.log(`Room ${roomId} created.`);
            }
            const room = gameRooms[roomId];
            const isHost = Object.keys(room.players).length === 0;
            // Use display_id as the player's name in the game state
            room.players[socket.id] = { id: userId, socketId: socket.id, name: displayId, isReady: false, isHost, hasSubmitted: false };

            io.to(roomId).emit('players_update', Object.values(room.players));
            console.log(`Player ${socket.id} (User ID: ${displayId}) joined room ${roomId} ${isHost ? 'as host' : ''}.`);
            broadcastRoomsUpdate(io);
        } catch (error) {
            socket.emit('error_message', '无效的认证凭证，请重新登录。');
        }
    });

    socket.on('player_ready', (isReady) => {
        if (!currentRoomId || !gameRooms[currentRoomId]?.players[socket.id]) return;
        const room = gameRooms[currentRoomId];
        room.players[socket.id].isReady = isReady;
        io.to(currentRoomId).emit('players_update', Object.values(room.players));
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
        Object.values(room.players).forEach(p => p.isReady = false); // Reset ready status for next round
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
        room.players[socket.id].hasSubmitted = true; // Set submitted status
        console.log(`Player ${socket.id} in room ${currentRoomId} submitted hand`);

        // Broadcast the updated player list with the new submitted status
        io.to(currentRoomId).emit('players_update', Object.values(room.players));

        const activePlayerIds = Object.keys(room.gameState.hands);
        if (Object.keys(room.gameState.submittedHands).length === activePlayerIds.length) {
            console.log(`All players in room ${currentRoomId} submitted. Calculating...`);
            await calculateResults(currentRoomId, io);
            broadcastRoomsUpdate(io);
        }
    });

    const handleLeaveRoom = (roomId) => {
        const room = gameRooms[roomId];
        if (!room || !room.players[socket.id]) return;

        const player = room.players[socket.id];
        console.log(`Player ${player.name} is leaving room ${roomId}`);

        const wasHost = player.isHost;
        delete room.players[socket.id];
        currentRoomId = null;

        if (Object.keys(room.players).length === 0) {
            console.log(`Room ${roomId} is empty, deleting.`);
            delete gameRooms[roomId];
        } else {
            if (wasHost) {
                const newHost = Object.values(room.players)[0];
                newHost.isHost = true;
                console.log(`Host left. New host: ${newHost.name}`);
            }
            io.to(roomId).emit('players_update', Object.values(room.players));
        }
        broadcastRoomsUpdate(io);
    };

    socket.on('leave_room', handleLeaveRoom);

    socket.on('disconnect', () => {
        if (!currentRoomId || !gameRooms[currentRoomId]) return;
        const room = gameRooms[currentRoomId];
        const player = room.players[socket.id];
        if (!player) return;

        console.log(`Player ${player.name} disconnected from room ${currentRoomId}`);
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

// --- Auth Helper Functions ---
async function generateUniqueDisplayId(db) {
    let displayId;
    let isUnique = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 100; // Prevent an infinite loop

    while (!isUnique && attempts < MAX_ATTEMPTS) {
        const randomNum = Math.floor(Math.random() * 1000);
        displayId = String(randomNum).padStart(3, '0');

        const [existingUsers] = await db.query('SELECT id FROM users WHERE display_id = ?', [displayId]);
        if (existingUsers.length === 0) {
            isUnique = true;
        }
        attempts++;
    }

    if (!isUnique) {
        throw new Error('Could not generate a unique display ID.');
    }

    return displayId;
}

// --- Auth Routes ---
app.post('/api/auth/register', async (req, res) => {
    const { phone, password } = req.body;
    if (!phone || !password) {
        return res.status(400).json({ success: false, message: 'Phone number and password are required.' });
    }

    // Basic validation for phone number format (can be improved)
    if (!/^\d{11}$/.test(phone)) {
        return res.status(400).json({ success: false, message: 'Please enter a valid 11-digit phone number.' });
    }

    try {
        const [existingUser] = await db.query('SELECT id FROM users WHERE phone = ?', [phone]);
        if (existingUser.length > 0) {
            return res.status(409).json({ success: false, message: 'This phone number is already registered.' });
        }

        const displayId = await generateUniqueDisplayId(db);
        const hashedPassword = await bcrypt.hash(password, 10);

        await db.query(
            'INSERT INTO users (phone, password, display_id) VALUES (?, ?, ?)',
            [phone, hashedPassword, displayId]
        );

        res.status(201).json({ success: true, message: 'User registered successfully.' });
    } catch (error) {
        console.error('Registration failed:', error);
        if (error.message.includes('unique display ID')) {
            return res.status(500).json({ success: false, message: 'Could not assign a unique ID. Please try again.' });
        }
        res.status(500).json({ success: false, message: 'An internal server error occurred during registration.' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { phone, password } = req.body;
    if (!phone || !password) {
        return res.status(400).json({ success: false, message: 'Phone number and password are required.' });
    }

    try {
        const [users] = await db.query('SELECT * FROM users WHERE phone = ?', [phone]);
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const user = users[0];
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        // Include the display_id in the token payload
        const token = jwt.sign(
            { id: user.id, display_id: user.display_id },
            process.env.JWT_SECRET || 'your_default_secret',
            { expiresIn: '1h' }
        );

        res.json({ success: true, message: 'Logged in successfully.', token });
    } catch (error) {
        console.error('Login failed:', error);
        res.status(500).json({ success: false, message: 'Login failed.' });
    }
});

// A middleware to verify JWT and attach user to request
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET || 'your_default_secret', (err, user) => {
        if (err) {
            console.error('JWT verification error:', err);
            return res.sendStatus(403);
        }
        req.user = user;
        next();
    });
};

// --- User & Gifting Routes ---

// Find a user by their phone number
app.post('/api/user/find', authenticateToken, async (req, res) => {
    const { phone } = req.body;
    if (!phone) {
        return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }

    try {
        const [users] = await db.query('SELECT id, display_id FROM users WHERE phone = ?', [phone]);
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        const user = users[0];
        // Ensure we don't return the user's own info if they search their number
        if (user.id === req.user.id) {
            return res.status(400).json({ success: false, message: 'You cannot search for yourself.' });
        }
        res.json({ success: true, user: { id: user.id, display_id: user.display_id } });
    } catch (error) {
        console.error('User find failed:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

// Send points from one user to another
app.post('/api/points/send', authenticateToken, async (req, res) => {
    const { recipientId, amount } = req.body;
    const senderId = req.user.id;

    if (!recipientId || !amount) {
        return res.status(400).json({ success: false, message: 'Recipient ID and amount are required.' });
    }

    const pointsAmount = parseInt(amount, 10);
    if (isNaN(pointsAmount) || pointsAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid points amount.' });
    }

    if (senderId === recipientId) {
        return res.status(400).json({ success: false, message: 'You cannot send points to yourself.' });
    }

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [senders] = await connection.query('SELECT points FROM users WHERE id = ? FOR UPDATE', [senderId]);
        if (senders.length === 0) {
            // This should not happen if the token is valid, but as a safeguard:
            throw new Error('Sender not found.');
        }
        const sender = senders[0];

        if (sender.points < pointsAmount) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Insufficient points.' });
        }

        const [recipients] = await connection.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [recipientId]);
        if (recipients.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Recipient not found.' });
        }

        await connection.query('UPDATE users SET points = points - ? WHERE id = ?', [pointsAmount, senderId]);
        await connection.query('UPDATE users SET points = points + ? WHERE id = ?', [pointsAmount, recipientId]);

        await connection.commit();

        res.json({ success: true, message: `Successfully sent ${pointsAmount} points.` });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Points transfer failed:', error);
        res.status(500).json({ success: false, message: 'An internal server error occurred during the transfer.' });
    } finally {
        if (connection) connection.release();
    }
});

// --- Fallback Route ---
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

const PORT = process.env.PORT || 14722;
const HOST = '0.0.0.0';

// --- Server Startup ---
async function startServer() {
    await setupDatabase();
    server.listen(PORT, HOST, () => {
        console.log(`✅ Server is running at http://${HOST}:${PORT}`);
    });
}

startServer();
