// frontend/src/hooks/useSocket.js
import { useEffect, useState, useCallback } from 'react';
import { socketService } from '../services/socketService';

export const useSocket = (handleGameStateUpdate, handleRoomJoined, handlePlayerArrangedNotification) => {
  const [isConnected, setIsConnected] = useState(socketService.isConnected());
  const [isReconnecting, setIsReconnecting] = useState(false);

  const handleSocketConnect = useCallback(() => {
    setIsConnected(true);
    setIsReconnecting(false);
    console.log("useSocket: WS Connected.");
  }, []);

  const handleSocketDisconnect = useCallback(() => {
    setIsConnected(false);
    console.warn("useSocket: WS Disconnected.");
  }, []);

  const handleSocketReconnecting = useCallback(() => {
    setIsReconnecting(true);
    setIsConnected(false);
    console.log("useSocket: WS Reconnecting...");
  }, []);

  useEffect(() => {
    socketService.on('connect', handleSocketConnect);
    socketService.on('disconnect', handleSocketDisconnect);
    socketService.on('reconnecting', handleSocketReconnecting);
    socketService.on('GAME_STATE_UPDATE', handleGameStateUpdate);
    socketService.on('ROOM_JOINED', handleRoomJoined);
    socketService.on('PLAYER_ARRANGED_HAND', handlePlayerArrangedNotification);

    return () => {
      socketService.off('connect', handleSocketConnect);
      socketService.off('disconnect', handleSocketDisconnect);
      socketService.off('reconnecting', handleSocketReconnecting);
      socketService.off('GAME_STATE_UPDATE', handleGameStateUpdate);
      socketService.off('ROOM_JOINED', handleRoomJoined);
      socketService.off('PLAYER_ARRANGED_HAND', handlePlayerArrangedNotification);
    };
  }, [handleSocketConnect, handleSocketDisconnect, handleSocketReconnecting, handleGameStateUpdate, handleRoomJoined, handlePlayerArrangedNotification]);

  return { isConnected, isReconnecting };
};
