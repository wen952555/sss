const WebSocket = require('ws');
const GameRoom = require('./GameRoom');

const PORT = 8080;
const wss = new WebSocket.Server({ port: PORT });

// A map to hold all the active game rooms. Key: roomId, Value: GameRoom instance.
const rooms = new Map();

console.log(`WebSocket server is running on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
  console.log('A new client connected. Waiting for registration...');

  ws.on('message', (message) => {
    let parsedMessage;
    try {
      parsedMessage = JSON.parse(message);
    } catch (e) {
      console.error('Failed to parse message:', message);
      return;
    }

    const { type, payload } = parsedMessage;

    if (type === 'register') {
      const { userId, roomId } = payload;
      if (!userId || !roomId) {
        ws.send(JSON.stringify({ type: 'error', message: 'User ID and Room ID are required for registration.' }));
        return;
      }

      // Find the room or create a new one if it doesn't exist.
      let room = rooms.get(roomId);
      if (!room) {
        room = new GameRoom(roomId);
        rooms.set(roomId, room);
      }

      // Store identifying information on the WebSocket object itself.
      ws.userId = userId;
      ws.roomId = roomId;

      // Add the player to the room.
      room.addPlayer(userId, ws);

    } else {
      // For all other message types, we expect the client to be registered.
      if (!ws.roomId || !ws.userId) {
        ws.send(JSON.stringify({ type: 'error', message: 'Client not registered. Please register first.' }));
        return;
      }

      const room = rooms.get(ws.roomId);
      if (room) {
        // Pass the message to the appropriate room to be handled.
        room.handleMessage(ws.userId, parsedMessage);
      } else {
        console.error(`Received message for non-existent room: ${ws.roomId}`);
      }
    }
  });

  ws.on('close', () => {
    // When a client disconnects, remove them from their room.
    if (ws.roomId && ws.userId) {
      const room = rooms.get(ws.roomId);
      if (room) {
        room.removePlayer(ws.userId);
        // If the room is empty, we can clean it up.
        if (room.players.size === 0) {
          rooms.delete(ws.roomId);
          console.log(`Room ${ws.roomId} is empty and has been closed.`);
        }
      }
    }
    console.log('Client has disconnected.');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error observed:', error);
  });
});
