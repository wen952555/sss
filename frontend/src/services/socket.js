// frontend/src/services/socket.js
let socket = null;

// !! 确认这个 URL 是你期望的，不带显式端口 !!
// 假设 wss://9526.ip-ddns.com 这个 URL (默认使用 443 端口)
// 会被服务器正确代理到你内部运行的 WebSocket 服务。
const SOCKET_URL = 'wss://9526.ip-ddns.com'; 

// 在模块加载时就打印一次，确保这个常量是我们期望的值
console.log("socket.js: SOCKET_URL is configured to:", SOCKET_URL);

export const connectSocket = (userId, onMessageCallback, onOpenCallback, onCloseCallback, onErrorCallback) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
        console.log("socket.js: Socket already connected to", SOCKET_URL);
        if (onOpenCallback) onOpenCallback();
        return socket;
    }

    console.log("socket.js: Creating new WebSocket connection to:", SOCKET_URL);
    try {
        socket = new WebSocket(SOCKET_URL); // 使用上面定义的 SOCKET_URL
    } catch (e) {
        console.error("socket.js: Error creating WebSocket instance for", SOCKET_URL, ":", e);
        if (onErrorCallback) onErrorCallback(e);
        return null;
    }

    socket.onopen = () => {
        console.log('socket.js: WebSocket Connected to', SOCKET_URL);
        if (onOpenCallback) onOpenCallback();
    };

    socket.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            console.log('socket.js: Socket Message Received from', SOCKET_URL, ':', message);
            if (onMessageCallback) onMessageCallback(message);
        } catch (e) {
            console.error('socket.js: Error parsing WebSocket message data from', SOCKET_URL, ':', e, 'Raw data:', event.data);
        }
    };

    socket.onclose = (event) => {
        console.log('socket.js: WebSocket Disconnected from', SOCKET_URL, 'Reason:', event.reason, 'Code:', event.code, 'wasClean:', event.wasClean);
        if (onCloseCallback) onCloseCallback(event);
        socket = null; 
    };

    socket.onerror = (errorEvent) => {
        console.error('socket.js: WebSocket Error Event occurred on', SOCKET_URL, 'Event object:', errorEvent);
        if (socket) {
            console.error('socket.js: Socket readyState during error on', SOCKET_URL, ':', socket.readyState);
        }
        if (onErrorCallback) {
            onErrorCallback(new Error("A WebSocket error occurred. Check the browser console (Network tab > WS) for more details."));
        }
    };

    return socket;
};

export const sendSocketMessage = (message) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
        console.log("socket.js: Sending WebSocket message to", SOCKET_URL, ":", message);
        try {
            socket.send(JSON.stringify(message));
        } catch (e) {
            console.error("socket.js: Error sending WebSocket message to", SOCKET_URL, ":", e, "Message was:", message);
        }
    } else {
        console.error('socket.js: Socket not connected or not ready. Cannot send message to', SOCKET_URL, ":", message, 'Socket state:', socket?.readyState);
    }
};

export const closeSocket = () => {
    if (socket) {
        console.log("socket.js: Closing WebSocket connection to", SOCKET_URL);
        socket.close();
    }
};

export const getSocket = () => socket;
