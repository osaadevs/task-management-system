import { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { getSocketUrl } from '../config/apiConfig';

function resolveSocketUrl() {
  return getSocketUrl();
}

export function useSocket(enabled = true, token = null) {
  const [connected, setConnected] = useState(false);
  const [liveNotifications, setLiveNotifications] = useState([]);

  const dismissLiveNotification = useCallback((id) => {
    setLiveNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    if (!enabled || !token) {
      setConnected(false);
      return undefined;
    }

    const socketUrl = resolveSocketUrl();
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
      setConnected(false);
    });

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
      setConnected(false);
    };
  }, [enabled, token]);

  return { connected, liveNotifications, dismissLiveNotification };
}
