// frontend/src/services/socketService.js
import { io } from 'socket.io-client';

const SOCKET_URL = "https://9525.ip-ddns.com:14722"; // 你的后端 URL 和端口
let socket;

export const connectSocket = () => {
  if (socket && socket.connected) {
    return socket;
  }
  socket = io(SOCKET_URL, {
    reconnectionAttempts: 5, // 尝试重连次数
    // transports: ['websocket'], // 可以指定传输方式，通常不需要
  });

  socket.on('connect', () => {
    console.log('Connected to socket server with ID:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Disconnected from socket server:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err);
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    console.warn("Socket not connected yet. Call connectSocket first.");
    return connectSocket(); // 尝试连接
  }
  return socket;
};

// 封装一些常用的 emit 操作，方便调用并处理回调
export const emitPromise = (eventName, data) => {
  return new Promise((resolve, reject) => {
    if (!socket || !socket.connected) {
      return reject(new Error("Socket not connected."));
    }
    socket.emit(eventName, data, (response) => {
      if (response && response.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    });
  });
};
