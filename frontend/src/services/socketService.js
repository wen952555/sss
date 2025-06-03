// frontend/src/services/socketService.js
import { io } from 'socket.io-client';

// !!! 你需要根据 Serv00 的实际情况修改这个 URL !!!
// 示例1: 如果 Serv00 代理 https://9525.ip-ddns.com (默认443端口) 到你的应用
// const SOCKET_URL = "https://9525.ip-ddns.com";

// 示例2: 如果 Serv00 仍然要求通过 14722 端口访问，并且该端口是 HTTPS 代理
const SOCKET_URL = "https://9525.ip-ddns.com";

// 示例3: 如果 Serv00 将你的应用放在某个子路径下 (例如 /myapp/)
// const SOCKET_URL = "https://9525.ip-ddns.com"; // 主域名
// 然后在 io 连接时指定 path:
// socket = io(SOCKET_URL, { path: "/myapp/socket.io/" });

// 或者，更好的方式是通过环境变量
// const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:14722"; // 开发备用

let socket;

export const connectSocket = () => {
  if (socket && socket.connected) {
    return socket;
  }
  console.log(`Attempting to connect to Socket.IO server at: ${SOCKET_URL}`);
  socket = io(SOCKET_URL, {
    reconnectionAttempts: 5,
    transports: ['websocket', 'polling'], // 明确指定 websocket 优先
    // 如果你的 Serv00 反向代理将 Socket.IO 放在特定路径下
    // path: "/your-serv00-socketio-path/" // 例如 Serv00 将 /pokergame/socket.io/ 代理到你应用的 /socket.io/
  });

  socket.on('connect', () => {
    console.log('Successfully connected to socket server with ID:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Disconnected from socket server:', reason);
    if (reason === 'io server disconnect') {
      // the disconnection was initiated by the server, you need to reconnect manually
      socket.connect();
    }
    // else the socket will automatically try to reconnect
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
    console.error('Error details:', err); // 打印完整错误对象
    // err.data 可能包含更多上下文
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    console.warn("Socket not connected yet. Call connectSocket first.");
    return connectSocket();
  }
  return socket;
};

export const emitPromise = (eventName, data) => {
  return new Promise((resolve, reject) => {
    if (!socket || !socket.connected) {
      // 尝试自动重连或提示用户
      console.warn("Socket not connected when trying to emit. Attempting to reconnect...");
      connectSocket(); // 尝试连接
      // 延迟一小段时间再尝试发送，或者让用户手动触发
      setTimeout(() => {
        if (!socket || !socket.connected) {
            return reject(new Error("Socket still not connected after auto-reconnect attempt."));
        }
        socket.emit(eventName, data, (response) => {
            if (response && response.error) {
              reject(new Error(response.error));
            } else {
              resolve(response);
            }
        });
      }, 2000); // 等待2秒给连接时间
      return;
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
