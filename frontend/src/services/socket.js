// frontend/src/services/socket.js
let socket = null;

// 假设 wss://9526.ip-ddns.com 这个 URL (默认使用 443 端口)
// 会被服务器正确代理到你内部运行的 WebSocket 服务。
const SOCKET_URL = 'wss://9526.ip-ddns.com'; 

console.log("Attempting to connect to WebSocket at:", SOCKET_URL); // 添加日志方便调试

export const connectSocket = (userId, onMessageCallback, onOpenCallback, onCloseCallback, onErrorCallback) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
        console.log("Socket already connected to", SOCKET_URL);
        if (onOpenCallback) onOpenCallback();
        return socket;
    }

    console.log("Creating new WebSocket connection to:", SOCKET_URL);
    try {
        socket = new WebSocket(SOCKET_URL);
    } catch (e) {
        console.error("Error creating WebSocket instance for", SOCKET_URL, ":", e);
        if (onErrorCallback) onErrorCallback(e);
        return null; // 创建失败
    }

    socket.onopen = () => {
        console.log('WebSocket Connected to', SOCKET_URL);
        if (onOpenCallback) onOpenCallback();
        // 示例：在连接成功后立即发送认证或加入房间的消息
        // if (userId) {
        //     sendSocketMessage({ type: 'authenticate', userId: userId });
        // }
    };

    socket.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            console.log('Socket Message Received from', SOCKET_URL, ':', message);
            if (onMessageCallback) onMessageCallback(message);
        } catch (e) {
            console.error('Error parsing WebSocket message data from', SOCKET_URL, ':', e, 'Raw data:', event.data);
        }
    };

    socket.onclose = (event) => {
        console.log('WebSocket Disconnected from', SOCKET_URL, 'Reason:', event.reason, 'Code:', event.code, 'wasClean:', event.wasClean);
        if (onCloseCallback) onCloseCallback(event);
        socket = null; 
    };

    socket.onerror = (errorEvent) => {
        // WebSocket 'error' event is very generic and usually followed by 'close' event with more details.
        console.error('WebSocket Error Event occurred on', SOCKET_URL, 'Event object:', errorEvent);
        if (socket) {
            console.error('Socket readyState during error on', SOCKET_URL, ':', socket.readyState);
        }
        // 通常，真正的错误信息会在 onclose 事件的 event.code 和 event.reason 中，
        // 或者在浏览器的网络开发者工具中显示。
        if (onErrorCallback) {
            // 传递一个更通用的错误，因为 errorEvent 本身可能不是一个标准的 Error 对象
            onErrorCallback(new Error("A WebSocket error occurred. Check the browser console and network tab for more details."));
        }
    };

    return socket;
};

export const sendSocketMessage = (message) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
        console.log("Sending WebSocket message to", SOCKET_URL, ":", message);
        try {
            socket.send(JSON.stringify(message));
        } catch (e) {
            console.error("Error sending WebSocket message to", SOCKET_URL, ":", e, "Message was:", message);
        }
    } else {
        console.error('Socket not connected or not ready. Cannot send message to', SOCKET_URL, ":", message, 'Socket state:', socket?.readyState);
    }
};

export const closeSocket = () => {
    if (socket) {
        console.log("Closing WebSocket connection to", SOCKET_URL);
        socket.close(); // 默认code 1000 (Normal Closure)
    }
};

export const getSocket = () => socket;
