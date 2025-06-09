// src/services/socket.js
let socket = null;
// Adjust WSS port or path if you use a reverse proxy
const SOCKET_URL = 'wss://9526.ip-ddns.com:8080'; // Example, replace with your actual WS URL

export const connectSocket = (userId, onMessageCallback, onOpenCallback, onCloseCallback, onErrorCallback) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
        console.log("Socket already connected.");
        if (onOpenCallback) onOpenCallback();
        return socket;
    }

    socket = new WebSocket(SOCKET_URL);

    socket.onopen = () => {
        console.log('WebSocket Connected');
        if (onOpenCallback) onOpenCallback();
        // Example: Automatically join a default room or send auth info
        // socket.send(JSON.stringify({ type: 'authenticate', userId: userId }));
    };

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log('Socket Message Received:', message);
        if (onMessageCallback) onMessageCallback(message);
    };

    socket.onclose = (event) => {
        console.log('WebSocket Disconnected:', event.reason, event.code);
        if (onCloseCallback) onCloseCallback(event);
        socket = null; // Clear socket instance on close
    };

    socket.onerror = (error) => {
        console.error('WebSocket Error:', error);
        if (onErrorCallback) onErrorCallback(error);
    };

    return socket;
};

export const sendSocketMessage = (message) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
    } else {
        console.error('Socket not connected or not ready.');
        // Optionally queue message or attempt reconnect
    }
};

export const closeSocket = () => {
    if (socket) {
        socket.close();
    }
};

export const getSocket = () => socket;
