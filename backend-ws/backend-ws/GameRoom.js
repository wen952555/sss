class GameRoom {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = new Map(); // Using a Map to store players: { userId -> { ws, ...otherData } }
    this.gameState = {
      phase: 'waiting', // waiting, arranging, finished
      // We can add more game-specific state here later
    };

    console.log(`GameRoom ${roomId} created.`);
  }

  /**
   * Adds a player to the room.
   * @param {string} userId - The ID of the user.
   * @param {WebSocket} ws - The WebSocket connection object for the user.
   */
  addPlayer(userId, ws) {
    if (this.players.has(userId)) {
      console.log(`Player ${userId} is re-connecting.`);
    } else {
      console.log(`Player ${userId} is joining room ${this.roomId}.`);
    }
    this.players.set(userId, { ws });
    this.broadcastGameState();
  }

  /**
   * Removes a player from the room.
   * @param {string} userId - The ID of the user.
   */
  removePlayer(userId) {
    if (this.players.has(userId)) {
      console.log(`Player ${userId} left room ${this.roomId}.`);
      this.players.delete(userId);
      this.broadcastGameState();
    }
  }

  /**
   * Handles incoming messages from a specific player.
   * @param {string} userId - The ID of the user sending the message.
   * @param {object} message - The parsed JSON message from the client.
   */
  handleMessage(userId, message) {
    console.log(`Received message from ${userId} in room ${this.roomId}:`, message);

    // Simple message router
    switch (message.type) {
      case 'player_action':
        // TODO: Implement logic for 'ready', 'unready'
        console.log(`Handling action: ${message.payload.action}`);
        break;
      case 'submit_hand':
        // TODO: Implement logic for hand submission
        console.log(`Handling hand submission from ${userId}.`);
        break;
      default:
        console.log(`Unknown message type: ${message.type}`);
    }

    // After handling the message, we would typically update the state
    // and broadcast the new state to all players.
    // this.broadcastGameState();
  }

  /**
   * Sends the current game state to all players in the room.
   */
  broadcastGameState() {
    const currentState = {
      type: 'gameStateUpdate',
      payload: {
        roomId: this.roomId,
        players: Array.from(this.players.keys()).map(id => ({ id, is_ready: false })), // Simplified for now
        gameStatus: this.gameState.phase,
        // more state to come...
      }
    };

    const message = JSON.stringify(currentState);

    console.log(`Broadcasting state to ${this.players.size} players in room ${this.roomId}.`);
    this.players.forEach((player, userId) => {
      if (player.ws.readyState === player.ws.OPEN) {
        player.ws.send(message);
      }
    });
  }
}

module.exports = GameRoom;
