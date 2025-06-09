// frontend/src/pages/LobbyPage.js
import React, { useState, useEffect, useRef } from 'react';
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

    const messageListenerRef = useRef(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        
        const handleLobbyMessages = (message) => {
            if (!isMountedRef.current) return; 
            console.log("LobbyPage received WebSocket message:", message);
            if (message.type === 'joined_room' && message.roomId) {
                setIsLoadingCreate(false); 
                setIsLoadingJoin(false);
                if (window.location.pathname.includes('/lobby')) {
                    console.log("LobbyPage: Navigating to game room:", message.roomId);
                    navigate(`/game/${message.roomId}`); 
                }
            } else if (message.type === 'error') {
                setError(message.message || '发生未知错误');
                setIsLoadingCreate(false);
                setIsLoadingJoin(false);
            }
        };

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
                    user.id, null, 
                    () => { 
                        console.log("LobbyPage: Socket connected via LobbyPage's connectSocket call."); 
                        const freshSocket = getSocket();
                        if (freshSocket && messageListenerRef.current && !freshSocket._lobbyListenerAttached) { // 避免重复添加
                            freshSocket.addEventListener('message', messageListenerRef.current);
                            freshSocket._lobbyListenerAttached = true; // 标记已添加
                            console.log("LobbyPage: Message listener added after connect.");
                        }
                    },
                    () => { if(isMountedRef.current) setError("与服务器断开连接"); setIsLoadingCreate(false); setIsLoadingJoin(false); },
                    (err) => { if(isMountedRef.current) setError("连接错误: " + err.message); setIsLoadingCreate(false); setIsLoadingJoin(false); }
                );
            } else {
                console.log("LobbyPage: Socket already connected. Ensuring message listener.");
                if (messageListenerRef.current && !currentSocket._lobbyListenerAttached) {
                   currentSocket.addEventListener('message', messageListenerRef.current);
                   currentSocket._lobbyListenerAttached = true;
                }
            }
        }

        return () => {
            isMountedRef.current = false; 
            const socketForCleanup = getSocket();
            if (socketForCleanup && messageListenerRef.current && socketForCleanup._lobbyListenerAttached) {
                console.log("LobbyPage: Cleaning up message listener.");
                socketForCleanup.removeEventListener('message', messageListenerRef.current);
                socketForCleanup._lobbyListenerAttached = false; // 清除标记
            }
        };
    }, [user, navigate]);


    const ensureSocketAndSend = (messagePayload, setLoadingStateCallback) => {
        if (!user || !user.id) { setError('请先登录'); if(setLoadingStateCallback) setLoadingStateCallback(false); return; }
        
        let currentSocket = getSocket();
        setError(''); 
        if(setLoadingStateCallback) setLoadingStateCallback(true);


        const sendMessageAction = () => {
            const socketToSend = getSocket(); // 获取最新的 socket 实例
            if (socketToSend && socketToSend.readyState === WebSocket.OPEN) {
                console.log(`LobbyPage: Socket ready (state ${socketToSend.readyState}), sending message:`, messagePayload);
                sendSocketMessage(messagePayload);
                // 等待 joined_room 消息，不再在这里清除 setLoading，由消息处理器清除
            } else {
                 console.error("LobbyPage (ensureSocketAndSend): Socket not truly open when trying to send. State:", socketToSend?.readyState);
                 if(isMountedRef.current) setError('未能发送请求，连接似乎已断开。');
                 if(setLoadingStateCallback) setLoadingStateCallback(false);
            }
        };

        if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
            sendMessageAction();
        } else {
            console.log("LobbyPage: Socket not open or doesn't exist for sending. Attempting to connect then send.");
            connectSocket(
                user.id, null, 
                () => { 
                    console.log("LobbyPage (ensureSocketAndSend): Socket connected. Now sending message.");
                    const freshSocket = getSocket();
                    if (freshSocket && messageListenerRef.current && !freshSocket._lobbyListenerAttachedOnSend) { 
                        freshSocket.addEventListener('message', messageListenerRef.current);
                        freshSocket._lobbyListenerAttachedOnSend = true; 
                    }
                    sendMessageAction(); 
                },
                () => { if(isMountedRef.current) setError("发送失败：与服务器断开连接"); if(setLoadingStateCallback) setLoadingStateCallback(false); },
                (err) => { if(isMountedRef.current) setError("发送失败：连接错误: " + err.message); if(setLoadingStateCallback) setLoadingStateCallback(false); }
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

    if (!user) {
        return ( 
            <div style={{ padding: '20px', textAlign: 'center' }}> 
                <p>请先 <Link to="/login">登录</Link> 以进入游戏大厅。</p> 
            </div> 
        );
    }

    return (
        <div style={{ padding: '20px', maxWidth: '500px', margin: 'auto' }}>
            <h2>游戏大厅</h2>
            <p>欢迎, {user.phone_number}!</p>
            {error && <p style={{ color: 'red' }}>错误: {error}</p>}
            <div style={{ marginBottom: '30px', padding: '15px', border: '1px solid #eee', borderRadius: '5px' }}>
                <h3>创建新房间</h3>
                <button onClick={handleCreateRoom} disabled={isLoadingCreate || isLoadingJoin} style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', cursor:'pointer' }}>
                    {isLoadingCreate ? '创建中...' : '创建房间'}
                </button>
            </div>
            <div style={{ padding: '15px', border: '1px solid #eee', borderRadius: '5px' }}>
                <h3>加入已有房间</h3>
                <input 
                    type="text" 
                    value={roomIdToJoin}
                    onChange={(e) => setRoomIdToJoin(e.target.value)}
                    placeholder="输入房间号"
                    // 仔细检查这一行，确保没有非法字符或语法问题
                    style={{ padding: '10px', marginRight: '10px', textTransform: 'uppercase', width: 'calc(100% - 125px)', minWidth: '150px' }} 
                />
                <button onClick={handleJoinRoom} disabled={isLoadingCreate || isLoadingJoin || !roomIdToJoin.trim()} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', cursor:'pointer' }}>
                    {isLoadingJoin ? '加入中...' : '加入房间'}
                </button>
            </div>
        </div>
    );
}
export default LobbyPage;
