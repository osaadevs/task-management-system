import { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { getStoredAuth } from '../api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export function useSocket(enabled = true) {
  const [connected, setConnected] = useState(false);
  const [liveNotifications, setLiveNotifications] = useState([]);

  const dismissLiveNotification = useCallback((id) => {
    setLiveNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    const auth = getStoredAuth();
    if (!auth?.token) return undefined;

    const socket = io(SOCKET_URL, {
      auth: { token: auth.token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('notification', (payload) => {
      const item = {
        ...payload,
        id: payload.id || `${Date.now()}-${Math.random()}`,
      };
      setLiveNotifications((prev) => [item, ...prev].slice(0, 5));
      window.dispatchEvent(new CustomEvent('tms:notification', { detail: item }));
    });

    socket.on('taskUpdated', () => {
      window.dispatchEvent(new CustomEvent('tms:tasks-changed'));
    });

    return () => {
      socket.disconnect();
    };
  }, [enabled]);

  return { connected, liveNotifications, dismissLiveNotification };
}
