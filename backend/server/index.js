require('dotenv').config();
// server/index.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const path = require('path');
const dbPromise = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs/promises');

let db; // Will be initialized after the promise resolves

const {
    dealCards,
    isValidHand,
    evaluate13CardHand,
    evaluate5CardHand,
    evaluate3CardHand,
    comparePlayerHands,
    SEGMENT_SCORES,
    SPECIAL_HAND_TYPES
} = require('./gameLogic');

// --- Database Setup (SQLite compatible) ---
async function setupDatabase() {
    console.log('Starting SQLite database setup check...');
    const rawDb = db.getRawDb(); // Get the raw sqlite3 db object

    try {
        // Check if the 'users' table already exists
        const tableExists = await rawDb.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
        if (tableExists) {
            console.log('✅ Database tables already exist. Skipping setup.');
            return;
        }

        console.log('Tables not found. Proceeding with database setup...');

        // SQLite-compatible schema
        const schemaSQL = `
          CREATE TABLE games (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              room_id TEXT NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE player_scores (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              game_id INTEGER NOT NULL,
              player_id TEXT NOT NULL,
              player_name TEXT NOT NULL,
              hand_front TEXT, -- Storing JSON as TEXT
              hand_middle TEXT,
              hand_back TEXT,
              score INTEGER NOT NULL,
              special_hand_type TEXT,
              FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
          );

          CREATE TABLE users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              phone TEXT NOT NULL UNIQUE,
              password TEXT NOT NULL,
              display_id TEXT NOT NULL UNIQUE,
              points INTEGER NOT NULL DEFAULT 1000,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `;

        // Execute the entire schema as a single script
        await rawDb.exec(schemaSQL);

        console.log('✅ All tables created successfully for SQLite!');
        console.log('Database setup is complete.');

    } catch (error) {
        console.error('🔴 An error occurred during SQLite database setup:', error.message);
        console.error('Stack Trace:', error.stack);
        process.exit(1); // Exit if setup fails
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
            const hand = dealtCards[`player'${i + 1}'`];
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
app.get('/test-db', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS solution');
    res.json({ success: true, message: 'Database connection successful!', data: rows[0] });
  } catch (error) {
    console.error('Database query failed:', error);
    res.status(500).json({ success: false, message: 'Database query failed.' });
  }
});

app.get('/games', async (req, res) => {
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

// --- Auth Routes (Refactored with Transactions) ---
app.post('/auth/register', async (req, res) => {
    const { phone, password } = req.body;

    if (!phone || !password) {
        return res.status(400).json({ success: false, message: 'Phone number and password are required.' });
    }
    if (!/^\d{11}$/.test(phone)) {
        return res.status(400).json({ success: false, message: 'Please enter a valid 11-digit phone number.' });
    }

    let connection;
    try {
        // 1. Get a connection from the pool
        connection = await db.getConnection();
        await connection.beginTransaction();

        // 2. Check for existing user. NOTE: 'FOR UPDATE' is removed for SQLite compatibility.
        const [existingUser] = await connection.query('SELECT id FROM users WHERE phone = ?', [phone]);
        if (existingUser.length > 0) {
            await connection.rollback();
            return res.status(409).json({ success: false, message: 'This phone number is already registered.' });
        }

        // 3. Hash password once before the loop
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 4. Attempt to insert the new user, retrying on display_id collision
        let attempts = 0;
        const maxAttempts = 100; // A safe limit to prevent infinite loops
        let userCreated = false;

        while (attempts < maxAttempts && !userCreated) {
            const displayId = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
            try {
                await connection.query(
                    'INSERT INTO users (phone, password, display_id) VALUES (?, ?, ?)',
                    [phone, hashedPassword, displayId]
                );
                userCreated = true; // If insert is successful, exit loop
            } catch (error) {
                // Check for SQLite's unique constraint violation for 'display_id'
                const isDisplayIdCollision = error.code && error.code.includes('SQLITE_CONSTRAINT') && error.message.includes('users.display_id');
                if (isDisplayIdCollision) {
                    console.log(`Display ID ${displayId} collision, retrying...`);
                    attempts++;
                } else {
                    // For any other error, re-throw it to be caught by the outer catch block
                    throw error;
                }
            }
        }

        // 5. If the loop finished without creating a user, something went wrong.
        if (!userCreated) {
            await connection.rollback();
            return res.status(500).json({ success: false, message: 'Could not create user with a unique display ID after multiple attempts.' });
        }

        // 6. Commit the transaction
        await connection.commit();
        res.status(201).json({ success: true, message: 'User registered successfully.' });

    } catch (error) {
        // 7. Rollback the transaction if any error occurs
        if (connection) {
            await connection.rollback();
        }

        // --- ENHANCED ERROR LOGGING ---
        console.error('--- REGISTRATION ERROR ---');
        console.error('Timestamp:', new Date().toISOString());
        console.error('Request Body (Phone):', phone); // Log phone, not password
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        console.error('Stack Trace:', error.stack);
        console.error('--- END REGISTRATION ERROR ---');
        
        res.status(500).json({ success: false, message: 'An internal server error occurred during registration.' });

    } finally {
        // 8. Always release the connection back to the pool
        if (connection) {
            connection.release();
        }
    }
});


app.post('/auth/login', async (req, res) => {
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
app.post('/user/find', authenticateToken, async (req, res) => {
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
app.post('/points/send', authenticateToken, async (req, res) => {
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

        const [senders] = await connection.query('SELECT points FROM users WHERE id = ?', [senderId]);
        if (senders.length === 0) {
            // This should not happen if the token is valid, but as a safeguard:
            throw new Error('Sender not found.');
        }
        const sender = senders[0];

        if (sender.points < pointsAmount) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Insufficient points.' });
        }

        const [recipients] = await connection.query('SELECT id FROM users WHERE id = ?', [recipientId]);
        if (recipients.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Recipient not found.' });
        }

        await connection.query('UPDATE users SET points = points - ? WHERE id = ?', [pointsAmount, senderId]);
        await connection.query('UPDATE users SET points = points + ? WHERE id = ?', [pointsAmount, recipientId]);

        await connection.commit();

        res.json({ success: true, message: `Successfully sent '${pointsAmount}' points.` });

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
    try {
        db = await dbPromise; // Wait for the DB connection to be established
        await setupDatabase();
        server.listen(PORT, HOST, () => {
            console.log(`✅ Server is running at http://'${HOST}':'${PORT}'`);
        });
    } catch (err) {
        console.error("🔴 Failed to start server:", err);
        process.exit(1);
    }
}

startServer();
