// frontend/src/pages/LobbyPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
        // const socket = getSocket(); // <--- 移除这一行多余的、未使用的声明

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
        
        let currentSocket = getSocket(); // 直接使用 currentSocket

        if (user && user.id) {
            if (!currentSocket || currentSocket.readyState !== WebSocket.OPEN) {
                console.log("LobbyPage: Socket not ready, attempting to connect/reconnect for lobby actions.");
                connectSocket(
                    user.id,
                    handleLobbyMessages, 
                    () => { 
                        console.log("LobbyPage: Socket connected via LobbyPage's connectSocket call."); 
                        // 连接成功后，可以立即尝试发送排队的消息或进行其他操作
                        // 例如，如果之前有创建房间或加入房间的意图，可以在这里重新尝试
                    },
                    () => { 
                        console.log("LobbyPage: Socket disconnected via LobbyPage."); 
                        setError("与服务器断开连接"); 
                        setIsLoadingCreate(false); // 重置加载状态
                        setIsLoadingJoin(false);
                    },
                    (err) => { 
                        console.error("LobbyPage: Socket error via LobbyPage:", err); 
                        setError("连接错误"); 
                        setIsLoadingCreate(false);
                        setIsLoadingJoin(false);
                    }
                );
                currentSocket = getSocket(); 
            }

            // 确保事件监听器只添加一次，或者在组件卸载时正确移除
            // 为了简化，这里假设 connectSocket 返回的 socket 实例是稳定的，
            // 或者 getSocket() 总是返回当前的单例 socket。
            // 如果 connectSocket 每次都创建新实例，这里的逻辑需要调整。
            // 一个更好的方法是，handleLobbyMessages 作为 connectSocket 的 onMessageCallback 传入。
            // 我在上一条回复中，已将 handleLobbyMessages 作为 connectSocket 的回调传入了。

            // 如果 socket 已连接，直接添加监听器（或者依赖 connectSocket 的回调）
            // 我们已经在 connectSocket 中传递了 handleLobbyMessages 作为 onMessageCallback，
            // 所以这里可能不需要再次手动添加。
            // 但为了保险，如果 socket 已经存在且打开，我们可以确保监听器被添加。
            // 不过，更安全的做法是在 connectSocket 的 onOpen 回调之后再进行依赖 socket 的操作。
            // 考虑到 connectSocket 的 onMessageCallback 已经设置了，这里就不重复添加了。
            // console.log("LobbyPage: currentSocket state for adding listener:", currentSocket?.readyState);
        }

        // 清理函数：当组件卸载或依赖项变化时，移除事件监听器
        // 这个清理逻辑可能需要根据你的 socket 连接管理策略进行调整
        // 如果 socket 是全局共享的，LobbyPage 不应该关闭它，只移除自己添加的监听器
        const cleanupSocket = getSocket(); // 获取当前的socket实例用于清理
        const directListener = (event) => { // 需要确保这个函数引用与添加时一致
            try {
                const parsedMessage = JSON.parse(event.data);
                handleLobbyMessages(parsedMessage);
            } catch (e) {
                console.error("LobbyPage: Error parsing message in direct event listener for cleanup", e);
            }
        };

        if (cleanupSocket && typeof cleanupSocket.removeEventListener === 'function' && !cleanupSocket._lobbyListenerAttached) {
            // 如果我们之前是这样添加的： cleanupSocket.addEventListener('message', directListener);
            // 那么移除也应该是： cleanupSocket.removeEventListener('message', directListener);
            // 但因为我们现在是通过 connectSocket 的 onMessageCallback 来处理，所以这里可能不需要手动移除
            // 除非 connectSocket 没有正确处理回调的移除，或者我们在这里有额外的 addEventListener
            // 为了安全，如果上面没有 `currentSocket.addEventListener`，这里也不应该有 `removeEventListener`。
        }


        return () => {
            // console.log("LobbyPage unmounting. Current socket state:", getSocket()?.readyState);
            // 通常，LobbyPage 不应该关闭全局的 socket，除非它是唯一使用它的页面
            // 或者 socket 管理有明确的生命周期策略。
            // 如果 connectSocket 是在 LobbyPage 中调用的，并且期望 LobbyPage 负责其生命周期，
            // 那么这里可能需要 closeSocket()。但目前我们的设计是 socket 可能被 GamePage 复用。
        };
    }, [user, navigate]); // 移除了 handleLobbyMessages 因为它被 useCallback 包裹，或者其依赖已包含


    const handleCreateRoom = () => {
        if (!user || !user.id) { setError('请先登录才能创建房间'); return; }
        const currentSocket = getSocket(); // 获取当前 socket 实例
        if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
            setError('');
            setIsLoadingCreate(true);
            console.log("LobbyPage: Sending create_room request for user:", user.id);
            sendSocketMessage({ type: 'create_room', userId: user.id });
        } else {
            setError('未能连接到服务器，请刷新页面或稍后再试。');
            setIsLoadingCreate(false);
            // 可以尝试重新连接
            if (user && user.id && (!currentSocket || currentSocket.readyState !== WebSocket.OPEN)) {
                 connectSocket(user.id, null, () => sendSocketMessage({ type: 'create_room', userId: user.id }) );
            }
        }
    };

    const handleJoinRoom = () => {
        if (!user || !user.id) { setError('请先登录才能加入房间'); return; }
        if (!roomIdToJoin.trim()) { setError('请输入有效的房间号'); return; }
        const currentSocket = getSocket(); // 获取当前 socket 实例
        if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
            setError('');
            setIsLoadingJoin(true);
            console.log("LobbyPage: Sending join_room request for room:", roomIdToJoin.trim().toUpperCase(), "user:", user.id);
            sendSocketMessage({ type: 'join_room', roomId: roomIdToJoin.trim().toUpperCase(), userId: user.id });
        } else {
            setError('未能连接到服务器，请刷新页面或稍后再试。');
            setIsLoadingJoin(false);
            if (user && user.id && (!currentSocket || currentSocket.readyState !== WebSocket.OPEN)) {
                 connectSocket(user.id, null, () => sendSocketMessage({ type: 'join_room', roomId: roomIdToJoin.trim().toUpperCase(), userId: user.id }) );
            }
        }
    };

    if (!user) {
        return ( <div> <p>请先 <Link to="/login">登录</Link> 以进入游戏大厅。</p> </div> );
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
                    placeholder="输入房间号"
                    style={{ padding: '10px', marginRight: '10px', textTransform: 'uppercase' }} 
                />
                <button onClick={handleJoinRoom} disabled={isLoadingCreate || isLoadingJoin || !roomIdToJoin.trim()} style={{ padding: '10px 20px' }}>
                    {isLoadingJoin ? '加入中...' : '加入房间'}
                </button>
            </div>
        </div>
    );
}
export default LobbyPage;
