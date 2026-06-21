import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export function useSocket(enabled = true) {
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!enabled) return undefined;

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('notification', (payload) => {
      setNotifications((prev) => [payload, ...prev].slice(0, 20));
    });

    socket.on('taskUpdated', () => {
      setNotifications((prev) => [
        { id: Date.now(), message: 'A task was updated', type: 'info' },
        ...prev,
      ].slice(0, 20));
    });

    return () => {
      socket.disconnect();
    };
  }, [enabled]);

  const dismissNotification = (id) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  };

  return { connected, notifications, dismissNotification };
}
