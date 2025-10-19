
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const dbPromise = require('../db');
const authRoutes = require('./routes/auth');

const {
    dealCards,
    isValidHand,
    evaluate13CardHand,
    evaluate5CardHand,
    evaluate3CardHand,
    comparePlayerHands,
    calculateResults
} = require('./gameLogic');
const { SPECIAL_HAND_TYPES } = require('./constants');

// --- Environment Validation ---
const requiredEnvVars = ['JWT_SECRET', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
    console.error(`🔴 FATAL ERROR: Missing required environment variables: ${missingEnvVars.join(', ')}`);
    process.exit(1);
}

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Adjust for production
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

let userDb, gameDb;
const gameRooms = {}; // In-memory store for game rooms

// --- JWT Authentication Middleware (for HTTP routes) ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user.data;
        next();
    });
};

// --- Helper Functions ---
function createNewGameState() {
    return {
        players: {},
        gameState: {
            status: 'waiting', // waiting, playing, finished
            hands: {},
            submittedHands: {},
            evaluatedHands: {},
            specialHands: {},
            results: null,
        }
    };
}

function getRoomDTO(roomId) {
    const room = gameRooms[roomId];
    if (!room) return null;
    return {
        id: roomId,
        playerCount: Object.keys(room.players).length,
        players: Object.values(room.players),
        status: room.gameState.status,
    };
}



// --- API Routes ---
app.use('/api', authRoutes);

// Get list of all rooms
app.get('/api/rooms', (req, res) => {
    const roomList = Object.keys(gameRooms).map(roomId => getRoomDTO(roomId)).filter(r => r !== null);
    res.json(roomList);
});

// Create a new room
app.post('/api/rooms', (req, res) => {
    const roomId = `room_${Date.now()}`;
    gameRooms[roomId] = createNewGameState();
    console.log(`Room ${roomId} created.`);
    res.json({ roomId });
});

// The old polling endpoint has been removed.

// --- Gifting API ---

app.post('/api/user/find', authenticateToken, async (req, res) => {
    const { phone } = req.body;
    if (!phone) {
        return res.status(400).json({ message: 'Phone number is required.' });
    }
    try {
        const db = app.get('userDb');
        const [users] = await db.query('SELECT id, display_id FROM users WHERE phone = ?', [phone]);
        if (users.length > 0) {
            res.json({ user: users[0] });
        } else {
            res.status(404).json({ message: 'User not found.' });
        }
    } catch (error) {
        console.error('Error finding user by phone:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/api/points/send', authenticateToken, async (req, res) => {
    const { recipientId, amount } = req.body;
    const senderId = req.user.id;
    const parsedAmount = parseInt(amount, 10);

    if (!recipientId || !parsedAmount || parsedAmount <= 0) {
        return res.status(400).json({ message: 'Recipient ID and a positive amount are required.' });
    }
    if (senderId === recipientId) {
        return res.status(400).json({ message: 'You cannot send points to yourself.' });
    }

    let connection;
    try {
        const db = app.get('userDb');
        connection = await db.getConnection();
        await connection.beginTransaction();

        // 1. Check sender's balance and lock the row
        const [senders] = await connection.query('SELECT points FROM users WHERE id = ? FOR UPDATE', [senderId]);
        if (senders.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Sender not found.' });
        }
        const sender = senders[0];
        if (sender.points < parsedAmount) {
            await connection.rollback();
            return res.status(400).json({ message: 'Insufficient points.' });
        }

        // 2. Lock the recipient's row
        const [recipients] = await connection.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [recipientId]);
        if (recipients.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Recipient not found.' });
        }

        // 3. Perform the transfer
        await connection.query('UPDATE users SET points = points - ? WHERE id = ?', [parsedAmount, senderId]);
        await connection.query('UPDATE users SET points = points + ? WHERE id = ?', [parsedAmount, recipientId]);

        // 4. Log the transaction
        await connection.query(
            'INSERT INTO point_transactions (sender_id, recipient_id, amount) VALUES (?, ?, ?)',
            [senderId, recipientId, parsedAmount]
        );

        await connection.commit();
        res.json({ message: 'Points sent successfully!' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error sending points:', error);
        res.status(500).json({ message: 'Internal server error during transaction.' });
    } finally {
        if (connection) connection.release();
    }
});


// --- Socket.IO Game Logic ---

const broadcastRoomUpdate = (roomId) => {
    const room = gameRooms[roomId];
    if (room) {
        // Create a version of the state that doesn't include other players' hands
        const stateForBroadcast = {
            players: room.players,
            gameState: {
                status: room.gameState.status,
                // hands are sent individually, not broadcast
                submittedHands: room.gameState.submittedHands,
                evaluatedHands: room.gameState.evaluatedHands,
                specialHands: room.gameState.specialHands,
                results: room.gameState.results,
            }
        };
        io.to(roomId).emit('roomStateUpdate', stateForBroadcast);

        // Send each player their specific hand
        if (room.gameState.status === 'playing') {
            Object.keys(room.players).forEach(playerId => {
                const playerSocketId = room.players[playerId].socketId;
                if (playerSocketId && room.gameState.hands[playerId]) {
                     io.to(playerSocketId).emit('playerHandUpdate', room.gameState.hands[playerId]);
                }
            });
        }
    }
};


io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error: Token not provided'));
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return next(new Error('Authentication error: Invalid token'));
        }
        socket.user = decoded.data;
        next();
    });
});

io.on('connection', (socket) => {
    console.log(`⚡ User connected: ${socket.user.display_id} (${socket.id})`);

    socket.on('joinRoom', ({ roomId }) => {
        const room = gameRooms[roomId];
        if (!room) {
            socket.emit('error', { message: "Room not found" });
            return;
        }
        if (room.gameState.status !== 'waiting') {
            socket.emit('error', { message: "Game has already started" });
            return;
        }

        const playerId = socket.user.display_id;
        if (room.players[playerId]) {
            // Player is rejoining, just update their socket ID
            room.players[playerId].socketId = socket.id;
        } else {
            const isHost = Object.keys(room.players).length === 0;
            room.players[playerId] = {
                id: playerId,
                db_id: socket.user.id,
                name: socket.user.display_id,
                isReady: false,
                isHost: isHost,
                hasSubmitted: false,
                socketId: socket.id,
            };
        }

        socket.join(roomId);
        socket.data.roomId = roomId; // Store roomId in socket data
        console.log(`Player ${playerId} joined room ${roomId}`);
        broadcastRoomUpdate(roomId);
    });

    socket.on('setReady', ({ isReady }) => {
        const { roomId } = socket.data;
        const playerId = socket.user.display_id;
        const room = gameRooms[roomId];
        if (room && room.players[playerId]) {
            room.players[playerId].isReady = isReady;
            broadcastRoomUpdate(roomId);
        }
    });

    socket.on('startGame', async () => {
        const { roomId } = socket.data;
        const playerId = socket.user.display_id;
        const room = gameRooms[roomId];

        if (!room) return socket.emit('error', { message: "Room not found" });
        if (!room.players[playerId] || !room.players[playerId].isHost) {
            return socket.emit('error', { message: "Only the host can start the game" });
        }

        const playersInRoom = Object.values(room.players);
        if (playersInRoom.length < 2) return socket.emit('error', { message: "Need at least 2 players" });
        if (!playersInRoom.every(p => p.isHost || p.isReady)) return socket.emit('error', { message: "All players must be ready" });

        room.gameState.status = 'playing';
        const dealtCards = dealCards(playersInRoom.length);
        playersInRoom.forEach((player, i) => {
            room.gameState.hands[player.id] = dealtCards[`player${i + 1}`];
        });

        broadcastRoomUpdate(roomId);
    });

    socket.on('submitHand', async ({ hand }) => {
        const { roomId } = socket.data;
        const playerId = socket.user.display_id;
        const room = gameRooms[roomId];

        if (!room || room.gameState.status !== 'playing') return socket.emit('error', { message: "Not a valid game or not in playing state" });
        if (!isValidHand(hand.front, hand.middle, hand.back)) return socket.emit('error', { message: "Invalid hand (倒水)" });

        room.gameState.submittedHands[playerId] = hand;
        room.players[playerId].hasSubmitted = true;

        // If all players have submitted, calculate results
        if (Object.keys(room.gameState.submittedHands).length === Object.keys(room.players).length) {
            await calculateResults(roomId, gameRooms, gameDb);
        }

        broadcastRoomUpdate(roomId);
    });


    socket.on('disconnect', () => {
        console.log(`🔌 User disconnected: ${socket.user.display_id} (${socket.id})`);
        const { roomId } = socket.data;
        if (roomId && gameRooms[roomId]) {
            const playerId = socket.user.display_id;
            // In a real-world scenario, you might want more complex logic here,
            // like marking the player as disconnected, handling game state if they
            // are in the middle of a game, or removing them if the game hasn't started.
            // For now, we'll just log it. If the game is waiting, we can remove them.
             if (gameRooms[roomId].gameState.status === 'waiting') {
                delete gameRooms[roomId].players[playerId];
             }
            broadcastRoomUpdate(roomId);
        }
    });
});


// --- Serve Frontend ---
const frontendDistPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDistPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// --- Server Start ---
const PORT = process.env.PORT || 14722;
const HOST = '0.0.0.0';

async function startServer() {
    try {
        const dbs = await dbPromise;
        userDb = dbs.userDb;
        gameDb = dbs.gameDb;
        app.set('userDb', userDb);

        // Setup the database schema
        const setupUserDatabase = require('../setupDatabase');
        await setupUserDatabase(userDb);

        httpServer.listen(PORT, HOST, () => {
            console.log(`✅ Socket.IO game server is running at http://${HOST}:${PORT}`);
        });
    } catch (err) {
        console.error("🔴 Failed to start server:", err);
        process.exit(1);
    }
}

startServer();
