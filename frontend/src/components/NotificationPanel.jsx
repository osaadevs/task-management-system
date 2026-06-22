import { useEffect, useRef, useState } from 'react';
import { api } from '../api';

const TYPE_ICONS = {
  assignment: '📌',
  status_change: '🔄',
  comment: '💬',
  deadline: '⏰',
  admin_update: '👤',
  info: '🔔',
};

export default function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef(null);

  const loadNotifications = async () => {
    try {
      const [listRes, countRes] = await Promise.all([
        api.getNotifications(),
        api.getUnreadCount(),
      ]);
      setItems(listRes.data || []);
      setUnread(countRes.count || 0);
    } catch {
      // ignore when offline
    }
  };

  useEffect(() => {
    loadNotifications();
    const onNotification = () => loadNotifications();
    const onTasksChanged = () => loadNotifications();
    window.addEventListener('tms:notification', onNotification);
    window.addEventListener('tms:tasks-changed', onTasksChanged);
    const interval = setInterval(loadNotifications, 15000);
    return () => {
      window.removeEventListener('tms:notification', onNotification);
      window.removeEventListener('tms:tasks-changed', onTasksChanged);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (open) {
      loadNotifications();
    }
  }, [open]);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleMarkRead = async (id) => {
    await api.markNotificationRead(id);
    await loadNotifications();
  };

  const handleMarkAllRead = async () => {
    await api.markAllNotificationsRead();
    await loadNotifications();
  };

  return (
    <div className="notification-panel" ref={panelRef}>
      <button
        type="button"
        className="notification-bell"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notifications"
      >
        🔔
        {unread > 0 && <span className="notification-bell__badge">{unread}</span>}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-dropdown__header">
            <strong>Notifications</strong>
            {unread > 0 && (
              <button type="button" className="btn btn--ghost btn--small" onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>
          <div className="notification-dropdown__list">
            {items.length === 0 ? (
              <p className="muted notification-dropdown__empty">No notifications yet</p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`notification-item ${item.is_read ? 'is-read' : ''}`}
                  onClick={() => !item.is_read && handleMarkRead(item.id)}
                >
                  <span className="notification-item__icon">
                    {TYPE_ICONS[item.type] || TYPE_ICONS.info}
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    <p>{item.message}</p>
                    <time>{new Date(item.created_at).toLocaleString()}</time>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
