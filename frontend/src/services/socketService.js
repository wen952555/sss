// frontend_react/src/services/socketService.js

// --- 配置 ---
// 在真实应用中，这应该来自环境变量或配置文件
const WS_URL = 'wss://your-backend-domain.com/ws/game'; // Placeholder: 替换为您的WebSocket服务器URL
const RECONNECT_DELAY = 5000; // 尝试重连的间隔 (ms)
const MAX_RECONNECT_ATTEMPTS = 5; // 最大重连次数 (可选)

let socket = null;
let reconnectIntervalId = null;
let reconnectAttempts = 0;

// --- 消息处理器 ---
// App.js 或其他组件可以注册回调来处理不同类型的消息
const messageHandlers = {
  // type: [callback1, callback2, ...]
  // Example: 'GAME_STATE_UPDATE': [], 'PLAYER_JOINED': []
};

// --- 内部辅助函数 ---
const handleOpen = () => {
  console.log("WebSocket: Connection established.");
  reconnectAttempts = 0; // Reset reconnect attempts on successful connection
  if (reconnectIntervalId) {
    clearInterval(reconnectIntervalId);
    reconnectIntervalId = null;
  }
  // 触发 'connect' 事件的回调 (如果 App.js 订阅了)
  triggerEvent('connect');

  // 尝试恢复会话 (如果之前有存储)
  const sessionData = JSON.parse(localStorage.getItem('pokerGameSession'));
  const authToken = localStorage.getItem('authToken');
  if (sessionData && sessionData.roomId && sessionData.playerId && authToken) {
    console.log("WebSocket: Attempting to reconnect to previous session:", sessionData);
    socketService.sendMessage('RECONNECT', { 
        roomId: sessionData.roomId, 
        playerId: sessionData.playerId, 
        token: authToken 
    });
  }
};

const handleMessage = (event) => {
  try {
    const message = JSON.parse(event.data);
    console.log("WebSocket: Message received:", message);
    if (message.type && messageHandlers[message.type]) {
      messageHandlers[message.type].forEach(callback => callback(message.payload));
    } else if (message.type) {
      console.warn(`WebSocket: No handler registered for message type "${message.type}"`);
    } else {
      console.error("WebSocket: Received message without a type:", message);
    }
  } catch (error) {
    console.error("WebSocket: Error parsing message or in handler:", error, "Raw data:", event.data);
  }
};

const handleClose = (event) => {
  console.warn(`WebSocket: Connection closed. Code: ${event.code}, Reason: "${event.reason}", Was Clean: ${event.wasClean}`);
  socket = null; // Clear the socket instance
  triggerEvent('disconnect', { reason: event.reason, code: event.code });

  // Attempt to reconnect if not explicitly closed by client and conditions met
  if (event.code !== 1000 && event.code !== 1005) { // 1000 = Normal Closure, 1005 = No Status Rcvd (often client initiated close)
    attemptReconnect();
  } else {
    if (reconnectIntervalId) clearInterval(reconnectIntervalId); // Clear any existing interval if it was a clean close
  }
};

const handleError = (error) => {
  console.error("WebSocket: Error occurred:", error);
  triggerEvent('error', error);
  // WebSocket 'error' event is usually followed by a 'close' event,
  // so reconnect logic is typically handled in 'onclose'.
};

const attemptReconnect = () => {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS && MAX_RECONNECT_ATTEMPTS > 0) {
    console.error(`WebSocket: Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Giving up.`);
    if (reconnectIntervalId) clearInterval(reconnectIntervalId);
    return;
  }
  if (reconnectIntervalId) { // Already trying to reconnect
    return;
  }

  reconnectAttempts++;
  console.log(`WebSocket: Attempting reconnect #${reconnectAttempts} in ${RECONNECT_DELAY / 1000}s...`);
  triggerEvent('reconnecting', { attempt: reconnectAttempts });

  reconnectIntervalId = setTimeout(() => {
    console.log("WebSocket: Retrying connection...");
    socketService.connect(); // Attempt to connect again
    // Clear interval for this attempt, next attempt will set its own timeout via handleClose if fails
    if (reconnectIntervalId) clearInterval(reconnectIntervalId); 
    reconnectIntervalId = null; 
  }, RECONNECT_DELAY);
};

const triggerEvent = (eventName, data) => {
  if (messageHandlers[eventName]) {
    messageHandlers[eventName].forEach(callback => callback(data));
  }
};


// --- 公开的 Service API ---
export const socketService = {
  connect: () => {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      console.warn("WebSocket: Already connected or connecting.");
      return socket;
    }

    console.log("WebSocket: Attempting to connect...");
    try {
      socket = new WebSocket(WS_URL);
      socket.onopen = handleOpen;
      socket.onmessage = handleMessage;
      socket.onclose = handleClose;
      socket.onerror = handleError;
      return socket; // Return the instance for advanced usage if needed
    } catch (error) {
      console.error("WebSocket: Failed to create WebSocket instance:", error);
      triggerEvent('error', error); // Trigger error event for subscribers
      return null;
    }
  },

  disconnect: () => {
    if (socket) {
      console.log("WebSocket: Disconnecting manually...");
      if (reconnectIntervalId) { // Stop any scheduled reconnection attempts
        clearInterval(reconnectIntervalId);
        reconnectIntervalId = null;
        reconnectAttempts = 0;
      }
      socket.close(1000, "Client initiated disconnect"); // Normal closure
      socket = null;
    }
  },

  sendMessage: (type, payload) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type, payload });
      console.log("WebSocket: Sending message:", message);
      socket.send(message);
    } else {
      console.error("WebSocket: Cannot send message, connection not open.", {type, payload, readyState: socket?.readyState});
      // Optionally queue messages or throw error
      triggerEvent('error', { message: 'Connection not open. Message not sent.', details: {type, payload} });
    }
  },

  on: (eventName, callback) => {
    if (!messageHandlers[eventName]) {
      messageHandlers[eventName] = [];
    }
    if (!messageHandlers[eventName].includes(callback)) {
        messageHandlers[eventName].push(callback);
    }
    console.log(`WebSocket: Handler registered for "${eventName}"`);
  },

  off: (eventName, callback) => {
    if (messageHandlers[eventName]) {
      messageHandlers[eventName] = messageHandlers[eventName].filter(cb => cb !== callback);
      console.log(`WebSocket: Handler unregistered for "${eventName}"`);
    }
  },

  isConnected: () => {
    return socket && socket.readyState === WebSocket.OPEN;
  },

  // Storing session data could also be part of this service
  storeSession: (roomId, playerId) => {
    localStorage.setItem('pokerGameSession', JSON.stringify({ roomId, playerId }));
  },
  clearSession: () => {
    localStorage.removeItem('pokerGameSession');
  }
};

// Optional: Auto-connect on load if a session exists or if always in multiplayer
// This might be better handled by App.js deciding when to connect.
// if (localStorage.getItem('pokerGameSession')) {
//   socketService.connect();
// }
