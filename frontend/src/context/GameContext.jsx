import React, { createContext, useState, useContext, useEffect } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { gameAPI } from '../utils/api';
import toast from 'react-hot-toast';

const GameContext = createContext(null);
const SOCKET_URL = 'http://localhost:5000'; // Ensure this matches your backend URL

export const GameProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Connect to WebSocket on authentication
  useEffect(() => {
    if (isAuthenticated) {
      const newSocket = io(SOCKET_URL, {
        auth: {
          token: localStorage.getItem('token'),
        },
      });

      setSocket(newSocket);

      newSocket.on('connect', () => {
        toast.success('与游戏服务器连接成功');
      });

      newSocket.on('disconnect', () => {
        toast.error('与游戏服务器断开连接');
        setCurrentRoom(null);
        setGameState(null);
      });

      newSocket.on('error', (err) => {
        setError(err.message);
        toast.error(`服务器错误: ${err.message}`);
      });

      newSocket.on('room_update', (roomState) => {
        setCurrentRoom(roomState);
      });

      newSocket.on('game_update', (newState) => {
        setGameState(newState);
      });

      return () => newSocket.disconnect();
    } else if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  }, [isAuthenticated]);

  // API-based actions
  const createRoom = async (max_players, bet_amount) => {
    setIsLoading(true);
    try {
      const response = await gameAPI.createRoom(max_players, bet_amount);
      if (response.success) {
        setCurrentRoom(response.room);
        return { success: true };
      } else {
        toast.error(response.error || '创建房间失败');
        return { success: false, error: response.error };
      }
    } catch (err) {
      toast.error('创建房间失败');
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  const joinRoom = async (room_id) => {
    setIsLoading(true);
    try {
      const response = await gameAPI.joinRoom(room_id);
      if (response.success) {
        setCurrentRoom(response.room);
        return { success: true };
      } else {
        toast.error(response.error || '加入房间失败');
        return { success: false, error: response.error };
      }
    } catch (err) {
      toast.error('加入房间失败');
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  const leaveRoom = async () => {
    setIsLoading(true);
    try {
      const response = await gameAPI.leaveRoom();
      if (response.success) {
        setCurrentRoom(null);
        setGameState(null);
        toast.success('已离开房间');
        return { success: true };
      } else {
        toast.error(response.error || '离开房间失败');
        return { success: false, error: response.error };
      }
    } catch (err) {
      toast.error('离开房间失败');
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  const startGame = async () => {
    if (!currentRoom) {
      toast.error('不在房间内，无法开始游戏');
      return { success: false, error: 'Not in a room' };
    }

    setIsLoading(true);
    try {
      const response = await gameAPI.startGame(currentRoom.id);
      if (response.success) {
        toast.success('游戏开始！');
        return { success: true };
      } else {
        toast.error(response.error || '开始游戏失败');
        return { success: false, error: response.error };
      }
    } catch (err) {
      toast.error('开始游戏失败');
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  const submitCards = async (cards) => {
    if (!gameState) {
      toast.error('游戏未开始');
      return { success: false, error: 'Game not started' };
    }

    setIsLoading(true);
    try {
      const response = await gameAPI.submitCards(gameState.id, cards);
      if (response.success) {
        toast.success('出牌成功');
        return { success: true };
      } else {
        toast.error(response.error || '出牌失败');
        return { success: false, error: response.error };
      }
    } catch (err) {
      toast.error('出牌失败');
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    socket,
    currentRoom,
    gameState,
    isLoading,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    submitCards,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
