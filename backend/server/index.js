
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const dbPromise = require('../db');
const authRoutes = require('./routes/auth');
const setupUserDatabase = require('../setupDatabase');

const {
    dealCards,
    isValidHand,
    evaluate13CardHand,
    evaluate5CardHand,
    evaluate3CardHand,
    comparePlayerHands,
    SPECIAL_HAND_TYPES
} = require('./gameLogic');

// --- Environment Validation ---
const requiredEnvVars = ['JWT_SECRET', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
    console.error(`🔴 FATAL ERROR: Missing required environment variables: ${missingEnvVars.join(', ')}`);
    process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

let userDb, gameDb;
const gameRooms = {}; // In-memory store for game rooms

// --- JWT Authentication Middleware ---
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

async function calculateResults(roomId) {
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

    const finalScores = playerIds.reduce((acc, id) => ({ ...acc, [id]: { total: 0, special: null } }), {});
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
    
    // Save to DB
    try {
        const [gameResult] = await gameDb.query('INSERT INTO games (room_id) VALUES (?)', [roomId]);
        const gameId = gameResult.insertId;
        for (const playerId of playerIds) {
            const player = Object.values(players).find(p => p.id === playerId);
            if(!player) continue;
            
            const { front, middle, back } = gameState.submittedHands[playerId];
            const score = finalScores[playerId].total;
            const specialHandType = finalScores[playerId].special || null;
            
            await gameDb.query(
                'INSERT INTO player_scores (game_id, player_id, player_name, hand_front, hand_middle, hand_back, score, special_hand_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [gameId, player.db_id, player.name, JSON.stringify(front), JSON.stringify(middle), JSON.stringify(back), score, specialHandType]
            );
        }
        console.log(`Game ${gameId} results saved.`);
    } catch (error) {
        console.error(`Failed to save game results for room ${roomId}:`, error);
    }
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

// Get the state of a specific room (the polling endpoint)
app.get('/api/rooms/:roomId', (req, res) => {
    const { roomId } = req.params;
    const room = gameRooms[roomId];
    if (!room) {
        return res.status(404).json({ message: "Room not found" });
    }
    // For the player making the request, we add their specific hand
    const playerState = { ...room };
    // This part requires knowing the player's ID, which we get from the JWT
    // This is a placeholder as we need to map JWT user to player in room
    // For now, returning the full state
    res.json(playerState);
});


// Join a room
app.post('/api/rooms/:roomId/join', authenticateToken, (req, res) => {
    const { roomId } = req.params;
    const room = gameRooms[roomId];
    if (!room) return res.status(404).json({ message: "Room not found" });
    if (room.gameState.status !== 'waiting') return res.status(400).json({ message: "Game has already started" });
    
    const playerId = req.user.display_id; // Using display_id from JWT
    if (room.players[playerId]) return res.status(400).json({ message: "Player already in room" });

    const isHost = Object.keys(room.players).length === 0;
    room.players[playerId] = {
        id: playerId,
        db_id: req.user.id, // The actual user ID from the database
        name: req.user.display_id,
        isReady: false,
        isHost: isHost,
        hasSubmitted: false,
    };
    
    res.json(room);
});

// Player is ready
app.post('/api/rooms/:roomId/ready', authenticateToken, (req, res) => {
    const { roomId } = req.params;
    const { isReady } = req.body;
    const playerId = req.user.display_id;
    const room = gameRooms[roomId];

    if (room && room.players[playerId]) {
        room.players[playerId].isReady = isReady;
        res.json(room);
    } else {
        res.status(404).json({ message: "Room or player not found" });
    }
});

// Start game
app.post('/api/rooms/:roomId/start', authenticateToken, async (req, res) => {
    const { roomId } = req.params;
    const playerId = req.user.display_id;
    const room = gameRooms[roomId];

    if (!room) return res.status(404).json({ message: "Room not found" });
    if (!room.players[playerId] || !room.players[playerId].isHost) {
        return res.status(403).json({ message: "Only the host can start the game" });
    }

    const playersInRoom = Object.values(room.players);
    if (playersInRoom.length < 2) return res.status(400).json({ message: "Need at least 2 players" });
    if (!playersInRoom.every(p => p.isHost || p.isReady)) return res.status(400).json({ message: "All players must be ready" });
    
    room.gameState.status = 'playing';
    const dealtCards = dealCards(playersInRoom.length);
    playersInRoom.forEach((player, i) => {
        room.gameState.hands[player.id] = dealtCards[`player${i + 1}`];
    });

    res.json(room);
});

// Submit hand
app.post('/api/rooms/:roomId/submit', authenticateToken, async (req, res) => {
    const { roomId } = req.params;
    const { hand } = req.body; // { front: [], middle: [], back: [] }
    const playerId = req.user.display_id;
    const room = gameRooms[roomId];

    if (!room || room.gameState.status !== 'playing') return res.status(400).json({ message: "Not a valid game or not in playing state" });
    if (!isValidHand(hand.front, hand.middle, hand.back)) return res.status(400).json({ message: "Invalid hand (倒水)" });

    room.gameState.submittedHands[playerId] = hand;
    room.players[playerId].hasSubmitted = true;
    
    // If all players have submitted, calculate results
    if (Object.keys(room.gameState.submittedHands).length === Object.keys(room.players).length) {
        await calculateResults(roomId);
    }

    res.json(room);
});

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
        // No need for setupGameDatabase here if schema is managed separately
        // await setupUserDatabase(userDb); 
        app.listen(PORT, HOST, () => {
            console.log(`✅ HTTP Polling game server is running at http://${HOST}:${PORT}`);
        });
    } catch (err) {
        console.error("🔴 Failed to start HTTP server:", err);
        process.exit(1);
    }
}

startServer();
