// frontend/src/socket.js
import io from 'socket.io-client';
import { BACKEND_URL } from './config';

const socket = io(BACKEND_URL, {
    transports: ['websocket'], // 优先使用 WebSocket
    // autoConnect: false, // 可以手动连接
});

socket.on('connect_error', (err) => {
  console.error("Socket connection error:", err.message, err.description, err.data);
  // alert(`无法连接到服务器: ${BACKEND_URL}\n错误: ${err.message}\n请检查后端服务是否运行，以及URL和端口是否正确。`);
});

socket.on('connect', () => {
  console.log('Connected to backend server with ID:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected from backend server:', reason);
});


export default socket;
