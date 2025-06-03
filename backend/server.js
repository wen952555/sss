// backend/server.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const {
    createDeck,
    shuffleDeck,
    dealCards,
    evaluateHand,
    isValidArrangement,
    compareAllHands,
    uuidv4
} = require('./gameLogic');

const app = express();
const server = http.createServer(app);

const FRONTEND_URL = "https://xxx.9525.ip-ddns.com"; // 你的前端域名
const PORT = 14722; // 你的后端端口

app.use(cors({ origin: FRONTEND_URL }));

const io = new Server(server, {
    cors: {
        origin: FRONTEND_URL,
        methods: ["GET", "POST"]
    }
});

let rooms = {}; // roomId: { players: [], deck: [], gameState: 'waiting'/'playing'/'ended', etc. }

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('createRoom', ({ playerName }) => {
        const roomId = uuidv4().slice(0, 6); // 短一点的房间号
        rooms[roomId] = {
            id: roomId,
            players: [{ id: socket.id, name: playerName, hand: [], arrangedHands: null, score: 0, isReady: false, hasSubmitted: false }],
            deck: [],
            gameState: 'waiting', // waiting, dealing, arranging, comparing
            maxPlayers: 2, // 简化为2人游戏，可扩展
            gameLog: []
        };
        socket.join(roomId);
        socket.emit('roomCreated', { roomId, players: rooms[roomId].players, gameState: rooms[roomId].gameState });
        console.log(`Room ${roomId} created by ${playerName} (${socket.id})`);
    });

    socket.on('joinRoom', ({ roomId, playerName }) => {
        const room = rooms[roomId];
        if (room) {
            if (room.players.length < room.maxPlayers) {
                if (room.players.find(p => p.id === socket.id)) {
                     socket.emit('errorMsg', 'You are already in this room.'); // 防止重复加入
                     return;
                }
                room.players.push({ id: socket.id, name: playerName, hand: [], arrangedHands: null, score: 0, isReady: false, hasSubmitted: false });
                socket.join(roomId);
                io.to(roomId).emit('playerJoined', { players: room.players, newPlayerName: playerName });
                socket.emit('joinedRoom', { roomId, players: room.players, gameState: room.gameState }); // 通知自己加入成功
                console.log(`${playerName} (${socket.id}) joined room ${roomId}`);
                 if (room.players.length === room.maxPlayers && room.gameState === 'waiting') {
                    // 自动开始或等待房主开始
                     io.to(roomId).emit('allPlayersReadyToStartPrompt');
                 }

            } else {
                socket.emit('errorMsg', 'Room is full.');
            }
        } else {
            socket.emit('errorMsg', 'Room not found.');
        }
    });
    
    socket.on('playerIsReady', ({ roomId }) => {
        const room = rooms[roomId];
        if (room) {
            const player = room.players.find(p => p.id === socket.id);
            if (player) {
                player.isReady = true;
                io.to(roomId).emit('playerStatusUpdate', room.players); // 更新所有玩家状态

                const allReady = room.players.every(p => p.isReady);
                if (allReady && room.players.length === room.maxPlayers && room.gameState === 'waiting') {
                    // Start game
                    room.gameState = 'dealing';
                    room.deck = shuffleDeck(createDeck());
                    const hands = dealCards(room.deck, room.players.length);
                    
                    room.players.forEach((p, index) => {
                        p.hand = hands[index];
                        p.hasSubmitted = false; // 重置提交状态
                        io.to(p.id).emit('dealCards', { hand: p.hand, gameState: room.gameState });
                    });
                    io.to(roomId).emit('gameStarted', { gameState: room.gameState, players: room.players });
                    room.gameState = 'arranging'; // 切换到理牌阶段
                    io.to(roomId).emit('updateGameState', { gameState: room.gameState });
                     console.log(`Game started in room ${roomId}`);
                }
            }
        }
    });


    socket.on('submitArrangement', ({ roomId, arrangement }) => { // arrangement: { front: [], middle: [], back: [] }
        const room = rooms[roomId];
        if (!room || room.gameState !== 'arranging') return;

        const player = room.players.find(p => p.id === socket.id);
        if (player && !player.hasSubmitted) {
             // 验证张数
            if (arrangement.front.length !== 3 || arrangement.middle.length !== 5 || arrangement.back.length !== 5) {
                socket.emit('errorMsg', '牌墩张数错误 (应为3-5-5)');
                return;
            }
            // 验证是否使用了自己的手牌 (简化：信任客户端，但生产环境需要严格验证)
            player.arrangedHands = arrangement; // 存储的是牌的id
            
            // 将牌的id映射回完整的牌对象进行评估
            const mapIdsToCards = (ids) => ids.map(id => player.hand.find(card => card.id === id));
            
            const arrangedHandsWithFullCards = {
                front: mapIdsToCards(arrangement.front),
                middle: mapIdsToCards(arrangement.middle),
                back: mapIdsToCards(arrangement.back)
            };

            if (!isValidArrangement(arrangedHandsWithFullCards)) {
                player.arrangedHands = null; // 清除，让玩家重新摆
                socket.emit('arrangementInvalid', '牌型不合法 (倒水或牌墩错误)，请重新摆牌。');
                return;
            }
            
            player.arrangedHandsEvaluated = { // 存储评估结果
                front: evaluateHand(arrangedHandsWithFullCards.front),
                middle: evaluateHand(arrangedHandsWithFullCards.middle),
                back: evaluateHand(arrangedHandsWithFullCards.back)
            };
            player.hasSubmitted = true;
            io.to(roomId).emit('playerSubmitted', { playerId: socket.id, players: room.players });
            console.log(`Player ${player.name} submitted arrangement in room ${roomId}`);

            // 检查是否所有人都提交了
            const allSubmitted = room.players.every(p => p.hasSubmitted);
            if (allSubmitted) {
                room.gameState = 'comparing';
                io.to(roomId).emit('updateGameState', { gameState: room.gameState });
                
                // 进行比牌 (简化为2人)
                if (room.players.length === 2) {
                    const playerA = room.players[0];
                    const playerB = room.players[1];
                    
                    const results = compareAllHands(playerA, playerB);
                    playerA.score += results.playerAScore;
                    playerB.score += results.playerBScore;

                    room.gameLog.push({
                        round: room.gameLog.length + 1,
                        playerA_id: playerA.id,
                        playerB_id: playerB.id,
                        playerA_hands: playerA.arrangedHands, // 存储原始牌ID，而不是评估结果
                        playerB_hands: playerB.arrangedHands,
                        playerA_eval: playerA.arrangedHandsEvaluated, // 存储评估结果
                        playerB_eval: playerB.arrangedHandsEvaluated,
                        scores: { [playerA.id]: results.playerAScore, [playerB.id]: results.playerBScore },
                        details: results.details
                    });
                    
                    io.to(roomId).emit('showResults', {
                        players: room.players.map(p => ({id: p.id, name: p.name, score: p.score, arrangedHands: p.arrangedHands, arrangedHandsEvaluated: p.arrangedHandsEvaluated })),
                        comparisonDetails: results.details,
                        logEntry: room.gameLog[room.gameLog.length-1]
                    });

                    // 准备下一局
                    room.gameState = 'waiting'; // 回到等待状态
                    room.players.forEach(p => {
                        p.isReady = false;
                        p.hasSubmitted = false;
                        p.hand = [];
                        p.arrangedHands = null;
                        p.arrangedHandsEvaluated = null;
                    });
                    io.to(roomId).emit('updateGameState', { gameState: room.gameState, players: room.players });
                    io.to(roomId).emit('nextRoundReadyPrompt');

                } else {
                    // TODO: 实现多人比牌逻辑 (轮流比或同时展示)
                    io.to(roomId).emit('infoMsg', '多人比牌逻辑待实现');
                }
            }
        }
    });
    
    socket.on('requestRoomState', (roomId) => {
        const room = rooms[roomId];
        if (room) {
            // 只发送安全的信息
            const playersInfo = room.players.map(p => ({
                id: p.id,
                name: p.name,
                score: p.score,
                isReady: p.isReady,
                hasSubmitted: p.hasSubmitted,
                // 在比牌阶段才显示手牌
                arrangedHands: (room.gameState === 'comparing' || room.gameState === 'ended') ? p.arrangedHands : null,
                arrangedHandsEvaluated:  (room.gameState === 'comparing' || room.gameState === 'ended') ? p.arrangedHandsEvaluated : null,

            }));
            socket.emit('roomStateUpdate', { roomId: room.id, players: playersInfo, gameState: room.gameState, gameLog: room.gameLog });
        }
    });


    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        for (const roomId in rooms) {
            const room = rooms[roomId];
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                const disconnectedPlayerName = room.players[playerIndex].name;
                room.players.splice(playerIndex, 1);
                io.to(roomId).emit('playerLeft', { players: room.players, disconnectedPlayerName });
                if (room.players.length === 0) {
                    console.log(`Room ${roomId} is empty, deleting.`);
                    delete rooms[roomId];
                } else {
                    // 如果游戏中有人掉线，可能需要重置游戏或做其他处理
                    if (room.gameState === 'arranging' || room.gameState === 'dealing') {
                        room.gameState = 'waiting';
                        room.players.forEach(p => {
                             p.isReady = false; p.hasSubmitted = false; p.hand = []; p.arrangedHands = null;
                        });
                        io.to(roomId).emit('gameInterrupted', { message: `${disconnectedPlayerName} left, game reset.`, players: room.players, gameState: room.gameState });
                    }
                }
                break;
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
    console.log(`Allowing CORS for ${FRONTEND_URL}`);
});
