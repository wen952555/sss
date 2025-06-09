// frontend/src/pages/LobbyPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSocket, sendSocketMessage, connectSocket } from '../services/socket'; // 需要 connectSocket 来监听

function LobbyPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [roomIdToJoin, setRoomIdToJoin] = useState('');
    const [error, setError] = useState('');
    const [isLoadingCreate, setIsLoadingCreate] = useState(false);
    const [isLoadingJoin, setIsLoadingJoin] = useState(false);

    // 监听 WebSocket 消息，特别是创建/加入房间后的响应
    useEffect(() => {
        const socket = getSocket();
        
        const handleLobbyMessages = (message) => {
            console.log("LobbyPage received message:", message);
            if (message.type === 'joined_room' && message.roomId) {
                // 成功加入房间后，跳转到游戏页面，并将roomId传递过去
                navigate(`/game/${message.roomId}`); 
            } else if (message.type === 'error') {
                setError(message.message || '发生未知错误');
                setIsLoadingCreate(false);
                setIsLoadingJoin(false);
            }
            // 注意：'room_created' 消息可能不需要，因为创建后会自动加入并收到 'joined_room'
        };

        // 如果 socket 已连接，直接添加监听器
        // 如果未连接，尝试连接 (通常 App.js 或 GamePage 应该已经处理了初始连接)
        // 但为了 LobbyPage 的独立性，如果 socket 不存在或未连接，这里可以尝试建立连接
        // 或者，更好的做法是确保在进入 LobbyPage 之前，全局的 socket 连接已经建立或正在建立。
        // 为简单起见，这里假设 socket 可能需要在这里连接或至少监听。

        if (user && user.id) {
            let currentSocket = getSocket();
            if (!currentSocket || currentSocket.readyState !== WebSocket.OPEN) {
                console.log("LobbyPage: Socket not ready, attempting to connect/reconnect for lobby actions.");
                // 注意：这里的 connectSocket 可能会与 App.js 或 GamePage.js 中的冲突
                // 一个更健壮的方案是使用一个全局的 SocketContext。
                // 暂时简化处理：
                connectSocket(
                    user.id,
                    handleLobbyMessages, // LobbyPage 只关心 joined_room 和 error
                    () => { console.log("LobbyPage: Socket connected via LobbyPage."); },
                    () => { console.log("LobbyPage: Socket disconnected via LobbyPage."); setError("与服务器断开连接"); },
                    (err) => { console.error("LobbyPage: Socket error via LobbyPage:", err); setError("连接错误"); }
                );
                currentSocket = getSocket(); // 获取新创建的 socket
            }

            if (currentSocket) {
                currentSocket.addEventListener('message', (event) => {
                     try {
                        const parsedMessage = JSON.parse(event.data);
                        handleLobbyMessages(parsedMessage);
                    } catch (e) {
                        console.error("LobbyPage: Error parsing message in direct event listener", e);
                    }
                });
            }
        }


        // 清理函数
        return () => {
            // const socket = getSocket(); // 获取当前socket
            // if (socket) {
            //   // socket.removeEventListener('message', handleLobbyMessages); // 需要确保 handleLobbyMessages 是同一个引用
            //   // 这里不关闭 socket，假设它是全局共享的，由 App 或 GamePage 管理生命周期
            // }
            // 如果 LobbyPage 自己创建了连接，则应该在这里关闭它。但我们假设连接是共享的。
        };
    }, [user, navigate]); // 依赖 user 和 navigate

    const handleCreateRoom = () => {
        if (!user || !user.id) {
            setError('请先登录才能创建房间');
            return;
        }
        const socket = getSocket();
        if (socket && socket.readyState === WebSocket.OPEN) {
            setError('');
            setIsLoadingCreate(true);
            console.log("LobbyPage: Sending create_room request for user:", user.id);
            sendSocketMessage({ type: 'create_room', userId: user.id });
            // 后续跳转由收到 'joined_room' 消息触发
        } else {
            setError('未能连接到服务器，请稍后再试或刷新页面。');
            setIsLoadingCreate(false);
        }
    };

    const handleJoinRoom = () => {
        if (!user || !user.id) {
            setError('请先登录才能加入房间');
            return;
        }
        if (!roomIdToJoin.trim()) {
            setError('请输入有效的房间号');
            return;
        }
        const socket = getSocket();
        if (socket && socket.readyState === WebSocket.OPEN) {
            setError('');
            setIsLoadingJoin(true);
            console.log("LobbyPage: Sending join_room request for room:", roomIdToJoin.toUpperCase(), "user:", user.id);
            sendSocketMessage({ type: 'join_room', roomId: roomIdToJoin.trim().toUpperCase(), userId: user.id });
            // 后续跳转由收到 'joined_room' 消息触发
        } else {
            setError('未能连接到服务器，请稍后再试或刷新页面。');
            setIsLoadingJoin(false);
        }
    };

    if (!user) {
        return (
            <div>
                <p>请先 <a href="/login">登录</a> 以进入游戏大厅。</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', maxWidth: '500px', margin: 'auto' }}>
            <h2>游戏大厅</h2>
            <p>欢迎, {user.phone_number}!</p>
            
            {error && <p style={{ color: 'red' }}>错误: {error}</p>}

            <div style={{ marginBottom: '30px', padding: '15px', border: '1px solid #eee' }}>
                <h3>创建新房间</h3>
                <button onClick={handleCreateRoom} disabled={isLoadingCreate || isLoadingJoin} style={{ padding: '10px 20px' }}>
                    {isLoadingCreate ? '创建中...' : '创建房间'}
                </button>
            </div>

            <div style={{ padding: '15px', border: '1px solid #eee' }}>
                <h3>加入已有房间</h3>
                <input 
                    type="text" 
                    value={roomIdToJoin}
                    onChange={(e) => setRoomIdToJoin(e.target.value)}
                    placeholder="输入房间号 (例如: ABC12)"
                    style={{ padding: '10px', marginRight: '10px', textTransform: 'uppercase' }} 
                />
                <button onClick={handleJoinRoom} disabled={isLoadingCreate || isLoadingJoin || !roomIdToJoin.trim()} style={{ padding: '10px 20px' }}>
                    {isLoadingJoin ? '加入中...' : '加入房间'}
                </button>
            </div>
            
            {/* 可选：显示房间列表 (需要后端支持 get_rooms 消息) */}
            {/* 
            <div style={{marginTop: '30px'}}>
                <h3>可用房间列表</h3>
                <p>此功能待实现...</p>
            </div>
            */}
        </div>
    );
}

export default LobbyPage;
