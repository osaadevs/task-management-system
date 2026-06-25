import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import AppTopBar from './AppTopBar';
import AssignmentAlert from './AssignmentAlert';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';
import { canOpenTask, getTaskPath } from '../utils/notificationNavigation';
import { api } from '../api';

export default function Layout() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { connected, liveNotifications, dismissLiveNotification } = useSocket(Boolean(token), token);

  const openLiveNotification = async (item) => {
    if (canOpenTask(item)) {
      try {
        if (item.id && typeof item.id === 'number') {
          await api.markNotificationRead(item.id);
        }
      } catch {
        // continue to task page
      }
      navigate(getTaskPath(item));
    }
    dismissLiveNotification(item.id);
  };

  return (
    <div className="app-shell app-shell--workspace">
      <Sidebar />
      <div className="app-main">
        <AppTopBar connected={connected} />
        <AssignmentAlert />
        <div className="toast-stack" role="status" aria-live="polite">
          {liveNotifications.map((item) => (
            <div
              key={item.id}
              className={`toast toast--${item.type || 'info'}${canOpenTask(item) ? ' toast--clickable' : ''}`}
              onClick={canOpenTask(item) ? () => openLiveNotification(item) : undefined}
              onKeyDown={
                canOpenTask(item)
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openLiveNotification(item);
                      }
                    }
                  : undefined
              }
              role={canOpenTask(item) ? 'button' : undefined}
              tabIndex={canOpenTask(item) ? 0 : undefined}
            >
              <div>
                <strong>{item.title || 'Notification'}</strong>
                <span>{item.message || 'New update'}</span>
                {canOpenTask(item) && (
                  <span className="toast__action">Click to open task</span>
                )}
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  dismissLiveNotification(item.id);
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
