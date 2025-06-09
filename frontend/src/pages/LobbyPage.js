// frontend/src/pages/LobbyPage.js
import React, { useState, useEffect } from 'react';
// 确保从 react-router-dom 导入 Link (如果之前没有的话)
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

    useEffect(() => {
        const handleLobbyMessages = (message) => {
            console.log("LobbyPage received message:", message);
            if (message.type === 'joined_room' && message.roomId) {
                navigate(`/game/${message.roomId}`); 
            } else if (message.type === 'error') {
                setError(message.message || '发生未知错误');
                setIsLoadingCreate(false);
                setIsLoadingJoin(false);
            }
        };
        
        let currentSocket = getSocket();

        if (user && user.id) {
            if (!currentSocket || currentSocket.readyState !== WebSocket.OPEN) {
                console.log("LobbyPage: Socket not ready, attempting to connect/reconnect for lobby actions.");
                connectSocket(
                    user.id,
                    handleLobbyMessages, 
                    () => { console.log("LobbyPage: Socket connected via LobbyPage's connectSocket call."); },
                    () => { 
                        console.log("LobbyPage: Socket disconnected via LobbyPage."); 
                        setError("与服务器断开连接"); 
                        setIsLoadingCreate(false); 
                        setIsLoadingJoin(false);
                    },
                    (err) => { 
                        console.error("LobbyPage: Socket error via LobbyPage:", err); 
                        setError("连接错误"); 
                        setIsLoadingCreate(false);
                        setIsLoadingJoin(false);
                    }
                );
                // currentSocket = getSocket(); // connectSocket 内部会设置全局 socket，这里可以不用立即重新获取
                                            // 但如果立即需要使用，则 getSocket() 是安全的
            } else {
                // 如果 socket 已连接，确保我们的消息处理器也被添加
                // (更好的方式是在 connectSocket 的 onMessage 回调中进行消息分发，
                // 或者使用 context/event emitter)
                // 暂时，如果 socket 已打开，我们假设它已经有了一个 onmessage 处理器
                // 而 handleLobbyMessages 是被 connectSocket 内部的 onmessage 调用的
                console.log("LobbyPage: Socket already connected and open.");
            }
        }
        return () => {
            // 清理逻辑，如果LobbyPage特定的监听器被添加，则移除
            // 但目前 handleLobbyMessages 是作为回调传给 connectSocket，由 socket.js 管理
        };
    }, [user, navigate]); 


    const handleCreateRoom = () => {
        if (!user || !user.id) { setError('请先登录才能创建房间'); return; }
        const currentSocket = getSocket();
        if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
            setError('');
            setIsLoadingCreate(true);
            console.log("LobbyPage: Sending create_room request for user:", user.id);
            sendSocketMessage({ type: 'create_room', userId: user.id });
        } else {
            setError('未能连接到服务器，请刷新页面或稍后再试。');
            setIsLoadingCreate(false);
            if (user && user.id && (!currentSocket || currentSocket.readyState !== WebSocket.OPEN)) {
                 connectSocket(user.id, 
                    (msg) => { /* LobbyPage's specific message handler after reconnect */
                        console.log("LobbyPage (reconnect): Message received", msg);
                        if (msg.type === 'joined_room' && msg.roomId) navigate(`/game/${msg.roomId}`);
                        else if (msg.type === 'error') setError(msg.message);
                    }, 
                    () => sendSocketMessage({ type: 'create_room', userId: user.id }) 
                 );
            }
        }
    };

    const handleJoinRoom = () => {
        if (!user || !user.id) { setError('请先登录才能加入房间'); return; }
        if (!roomIdToJoin.trim()) { setError('请输入有效的房间号'); return; }
        const currentSocket = getSocket();
        if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
            setError('');
            setIsLoadingJoin(true);
            const targetRoomId = roomIdToJoin.trim().toUpperCase();
            console.log("LobbyPage: Sending join_room request for room:", targetRoomId, "user:", user.id);
            sendSocketMessage({ type: 'join_room', roomId: targetRoomId, userId: user.id });
        } else {
            setError('未能连接到服务器，请刷新页面或稍后再试。');
            setIsLoadingJoin(false);
            if (user && user.id && (!currentSocket || currentSocket.readyState !== WebSocket.OPEN)) {
                const targetRoomId = roomIdToJoin.trim().toUpperCase();
                 connectSocket(user.id, 
                    (msg) => { /* LobbyPage's specific message handler after reconnect */
                        console.log("LobbyPage (reconnect): Message received", msg);
                        if (msg.type === 'joined_room' && msg.roomId) navigate(`/game/${msg.roomId}`);
                        else if (msg.type === 'error') setError(msg.message);
                    }, 
                    () => sendSocketMessage({ type: 'join_room', roomId: targetRoomId, userId: user.id }) 
                );
            }
        }
    };

    if (!user) {
        return ( 
            <div style={{ padding: '20px', textAlign: 'center' }}> 
                {/* 使用 Link 组件 */}
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
                    style={{ padding: '10px', marginRight: '10px', textTransform: 'uppercase', width:'calc(100% - 125px)', minWidth:'150px' }} 
                />
                <button onClick={handleJoinRoom} disabled={isLoadingCreate || isLoadingJoin || !roomIdToJoin.trim()} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', cursor:'pointer' }}>
                    {isLoadingJoin ? '加入中...' : '加入房间'}
                </button>
            </div>
        </div>
    );
}
export default LobbyPage;
