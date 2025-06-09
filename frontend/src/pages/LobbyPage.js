// frontend/src/pages/LobbyPage.js
import React, { useState, useEffect, useRef } from 'react'; // 添加 useRef
import { useNavigate, Link } from 'react-router-dom'; 
import { useAuth } from '../contexts/AuthContext';
import { getSocket, sendSocketMessage, connectSocket } from '../services/socket';

function LobbyPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [roomIdToJoin, setRoomIdToJoin] = useState('');
    const [error, setError] = useState('');
    const [isLoadingCreate, setIsLoadingCreate] = useState(false);
    const [isLoadingJoin, setIsLoadingJoin] = useState(false);

    // 使用 useRef 来确保只添加一次事件监听器，或者跟踪组件是否已卸载
    const messageListenerRef = useRef(null);
    const isMountedRef = useRef(true); // 跟踪组件是否挂载

    useEffect(() => {
        isMountedRef.current = true; // 组件挂载时设置为 true
        
        const handleLobbyMessages = (message) => {
            if (!isMountedRef.current) return; // 如果组件已卸载，不处理消息

            console.log("LobbyPage received WebSocket message:", message);
            if (message.type === 'joined_room' && message.roomId) {
                setIsLoadingCreate(false); // 清除加载状态
                setIsLoadingJoin(false);
                // 确保只跳转一次
                if (window.location.pathname.includes('/lobby')) { // 避免在已跳转后再次跳转
                     console.log("LobbyPage: Navigating to game room:", message.roomId);
                     navigate(`/game/${message.roomId}`); 
                }
            } else if (message.type === 'error') {
                setError(message.message || '发生未知错误');
                setIsLoadingCreate(false);
                setIsLoadingJoin(false);
            }
        };

        // 将回调存到 ref 中，以便在 add/removeEventListener 时使用相同的引用
        messageListenerRef.current = (event) => {
            try {
                const parsedMessage = JSON.parse(event.data);
                handleLobbyMessages(parsedMessage);
            } catch (e) {
                console.error("LobbyPage: Error parsing raw message data", e, event.data);
            }
        };
        
        let currentSocket = getSocket();

        if (user && user.id) {
            if (!currentSocket || currentSocket.readyState !== WebSocket.OPEN) {
                console.log("LobbyPage: Socket not ready, attempting to connect.");
                connectSocket(
                    user.id,
                    null, // 主 onMessage 由下面的 addEventListener 处理，或由全局处理
                    () => { 
                        console.log("LobbyPage: Socket connected via LobbyPage's connectSocket call."); 
                        const freshSocket = getSocket();
                        if (freshSocket && messageListenerRef.current) {
                            freshSocket.addEventListener('message', messageListenerRef.current);
                            console.log("LobbyPage: Message listener added after connect.");
                        }
                    },
                    () => { /* onClose */ if(isMountedRef.current) setError("与服务器断开连接"); setIsLoadingCreate(false); setIsLoadingJoin(false); },
                    (err) => { /* onError */ if(isMountedRef.current) setError("连接错误: " + err.message); setIsLoadingCreate(false); setIsLoadingJoin(false); }
                );
            } else {
                // Socket 已连接，确保监听器已添加 (如果之前没有)
                console.log("LobbyPage: Socket already connected. Adding message listener if not present.");
                if (messageListenerRef.current) {
                    // 避免重复添加，但 WebSocket 的 addEventListener 是幂等的（同一个函数引用不会重复添加）
                    // 但为了安全，可以先尝试移除再添加，或使用标记
                    // currentSocket.removeEventListener('message', messageListenerRef.current); // 如果之前可能添加过
                    currentSocket.addEventListener('message', messageListenerRef.current);
                }
            }
        }

        return () => {
            isMountedRef.current = false; // 组件卸载时设置为 false
            const socketForCleanup = getSocket();
            if (socketForCleanup && messageListenerRef.current) {
                console.log("LobbyPage: Cleaning up message listener.");
                socketForCleanup.removeEventListener('message', messageListenerRef.current);
            }
            // LobbyPage 不负责关闭全局 socket
        };
    }, [user, navigate]); // 移除其他依赖，handleLobbyMessages 在内部定义


    const ensureSocketAndSend = (messagePayload, setLoading) => {
         if (!user || !user.id) { setError('请先登录'); setLoading(false); return; }
         
         let currentSocket = getSocket();
         setError(''); // 清除旧错误

         const sendMessage = () => {
             console.log(`LobbyPage: Socket ready (state ${currentSocket.readyState}), sending message:`, messagePayload);
             sendSocketMessage(messagePayload);
             // 等待 joined_room 消息，不再在这里清除 setLoading，由消息处理器清除
         };

         if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
             setLoading(true);
             sendMessage();
         } else {
             setLoading(true); // 开始加载，因为我们要尝试连接
             console.log("LobbyPage: Socket not open or doesn't exist. Attempting to connect then send.");
             connectSocket(
                 user.id,
                 null, // 主 onMessage 由 useEffect 中的监听器处理
                 () => { // onOpen - 连接成功后发送消息
                     console.log("LobbyPage (ensureSocketAndSend): Socket connected. Now sending message.");
                     currentSocket = getSocket(); // 获取最新的socket实例
                     if (currentSocket && messageListenerRef.current && !currentSocket._lobbyListenerAttached) { // 避免重复添加
                         currentSocket.addEventListener('message', messageListenerRef.current);
                         currentSocket._lobbyListenerAttached = true; // 打个标记
                     }
                     sendMessage(); 
                 },
                 () => { /* onClose */ if(isMountedRef.current) setError("发送失败：与服务器断开连接"); setLoading(false); },
                 (err) => { /* onError */ if(isMountedRef.current) setError("发送失败：连接错误: " + err.message); setLoading(false); }
             );
         }
    };

    const handleCreateRoom = () => {
        ensureSocketAndSend({ type: 'create_room', userId: user.id }, setIsLoadingCreate);
    };

    const handleJoinRoom = () => {
        if (!roomIdToJoin.trim()) { setError('请输入有效的房间号'); return; }
        ensureSocketAndSend({ type: 'join_room', roomId: roomIdToJoin.trim().toUpperCase(), userId: user.id }, setIsLoadingJoin);
    };

    if (!user) { /* ... (与之前相同) ... */ }
    return ( /* ... (与之前相同的 JSX，确保按钮的 disabled 状态正确使用 isLoadingCreate 和 isLoadingJoin) ... */ );
}
export default LobbyPage;
