// backend/server.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const Game = require('./game_logic/Game');

const app = express();
const server = http.createServer(app);

const FRONTEND_URL = "https://xxx.9525.ip-ddns.com"; // 你的前端域名
const PORT = 14722;

app.use(cors({
  origin: FRONTEND_URL, // 允许你的前端源
  methods: ["GET", "POST"]
}));

const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ["GET", "POST"]
  }
});

let games = {}; // { roomId: GameInstance }

app.get('/', (req, res) => {
  res.send('Thirteen Cards Game Server is running!');
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('createRoom', (callback) => {
    let roomId;
    do {
      roomId = Math.random().toString(36).substring(2, 7).toUpperCase(); // 随机5位房间号
    } while (games[roomId]);

    const game = new Game(roomId);
    games[roomId] = game;
    game.addPlayer(socket.id);
    socket.join(roomId);
    console.log(`Room ${roomId} created by ${socket.id}`);
    callback({ roomId, player: game.getPlayer(socket.id) });
    io.to(roomId).emit('gameStateUpdate', game.getGameState());
  });

  socket.on('joinRoom', ({ roomId, playerName }, callback) => {
    const game = games[roomId];
    if (game) {
      const result = game.addPlayer(socket.id, playerName);
      if (result.error) {
        return callback({ error: result.error });
      }
      socket.join(roomId);
      console.log(`${socket.id} (${playerName}) joined room ${roomId}`);
      callback({ roomId, player: result.player, gameState: game.getGameState() });
      io.to(roomId).emit('gameStateUpdate', game.getGameState());
    } else {
      callback({ error: 'Room not found.' });
    }
  });

  socket.on('startGame', ({ roomId }, callback) => {
    const game = games[roomId];
    if (game && game.getPlayer(socket.id)) { // 只有房间内玩家可以开始
        const result = game.start();
        if (result.error) {
            return callback({ error: result.error });
        }
        io.to(roomId).emit('gameStateUpdate', game.getGameState());
        // 给每个玩家单独发送手牌信息
        Object.values(game.players).forEach(player => {
            io.to(player.id).emit('playerHand', player.hand);
        });
        callback({ success: true });
        console.log(`Game started in room ${roomId}`);
    } else {
        callback({ error: "Cannot start game." });
    }
  });

  socket.on('submitHand', ({ roomId, arrangedHand }, callback) => {
    const game = games[roomId];
    if (game) {
        const result = game.submitHand(socket.id, arrangedHand);
        if (result.error) {
            return callback({ error: result.error });
        }
        io.to(roomId).emit('gameStateUpdate', game.getGameState());
        // 如果所有人都准备好了，发送摊牌信息
        if (game.gameState === 'finished' || game.gameState === 'scoring') {
            const allArrangedHands = Object.fromEntries(
                Object.entries(game.players).map(([id, p]) => [id, {name: p.name, arrangedHand: p.arrangedHand, score: p.score }])
            );
            io.to(roomId).emit('showdown', allArrangedHands);
        }
        callback({ success: true });
    } else {
        callback({ error: "Game not found." });
    }
  });


  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    // 从所有游戏中移除该玩家
    for (const roomId in games) {
      const game = games[roomId];
      if (game.getPlayer(socket.id)) {
        game.removePlayer(socket.id);
        console.log(`${socket.id} removed from room ${roomId}`);
        if (Object.keys(game.players).length === 0) {
            console.log(`Room ${roomId} is empty, deleting.`);
            delete games[roomId];
        } else {
            io.to(roomId).emit('gameStateUpdate', game.getGameState());
        }
        break;
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on https://9525.ip-ddns.com:${PORT}`);
});
