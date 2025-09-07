const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const { GameRoom } = require('./game/room');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// --- Game State ---
const waitingPlayers = [];
const gameRooms = {}; // Store active game rooms

// Serve the frontend files
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Add player to the waiting queue
  waitingPlayers.push({ id: socket.id, socket });
  console.log(`Player ${socket.id} added to waiting queue. Total waiting: ${waitingPlayers.length}`);

  // If we have 3 players, start a new game
  if (waitingPlayers.length === 3) {
    const playersForNewGame = [...waitingPlayers];
    waitingPlayers.length = 0; // Clear the queue

    const roomID = `room_${Date.now()}`;
    const newRoom = new GameRoom(playersForNewGame);
    gameRooms[roomID] = newRoom;

    console.log(`Creating new game room ${roomID} and starting the game.`);
    newRoom.startGame();
  }

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Remove player from the waiting queue if they are in it
    const index = waitingPlayers.findIndex(p => p.id === socket.id);
    if (index !== -1) {
      waitingPlayers.splice(index, 1);
      console.log(`Player ${socket.id} removed from waiting queue. Total waiting: ${waitingPlayers.length}`);
    }
    // Note: Need to handle disconnection from an active game as well.
    // This will be implemented later.
  });

});

server.listen(PORT, () => {
  console.log(`Server listening on *:${PORT}`);
});
