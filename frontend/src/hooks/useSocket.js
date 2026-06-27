import { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { getSocketUrl } from '../config/apiConfig';

const TASK_REFRESH_NOTIFICATION_TYPES = new Set([
  'assignment',
  'status_change',
  'comment',
]);

function resolveSocketUrl() {
  return getSocketUrl();
}

export function useSocket(enabled = true, token = null, currentUserId = null) {
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
      // FE-1: defense-in-depth — drop any notification not addressed to this user.
      if (
        currentUserId != null &&
        payload &&
        payload.recipientId != null &&
        Number(payload.recipientId) !== Number(currentUserId)
      ) {
        return;
      }

      const item = {
        ...payload,
        id: payload.id || `${Date.now()}-${Math.random()}`,
      };
      setLiveNotifications((prev) => [item, ...prev].slice(0, 5));
      window.dispatchEvent(new CustomEvent('tms:notification', { detail: item }));

      if (TASK_REFRESH_NOTIFICATION_TYPES.has(item.type)) {
        window.dispatchEvent(new CustomEvent('tms:tasks-changed', { detail: item }));
      }
    });

    socket.on('taskUpdated', () => {
      window.dispatchEvent(new CustomEvent('tms:tasks-changed'));
    });

    // FE-10: on reconnect, re-pull so events missed while offline are caught up.
    // 'tms:tasks-changed' is consumed by both the task lists and the notification panel.
    socket.io.on('reconnect', () => {
      window.dispatchEvent(new CustomEvent('tms:tasks-changed'));
    });

    return () => {
      socket.io.off('reconnect');
      socket.disconnect();
      setConnected(false);
    };
  }, [enabled, token, currentUserId]);

  return { connected, liveNotifications, dismissLiveNotification };
}
