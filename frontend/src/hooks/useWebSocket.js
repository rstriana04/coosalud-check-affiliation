import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

export const useWebSocket = (onEvent) => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    socketRef.current = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('WebSocket connected');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('WebSocket disconnected');
    });

    socket.on('job:started', (data) => {
      onEvent?.('job:started', data);
    });

    socket.on('job:progress', (data) => {
      onEvent?.('job:progress', data);
    });

    socket.on('job:completed', (data) => {
      onEvent?.('job:completed', data);
    });

    socket.on('job:failed', (data) => {
      onEvent?.('job:failed', data);
    });

    socket.on('job:paused', (data) => {
      onEvent?.('job:paused', data);
    });

    socket.on('job:cancelled', (data) => {
      onEvent?.('job:cancelled', data);
    });

    socket.on('logs:new', (data) => {
      onEvent?.('logs:new', data);
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [onEvent]);

  const emit = (event, data) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  };

  return { socket: socketRef.current, isConnected, emit };
};

