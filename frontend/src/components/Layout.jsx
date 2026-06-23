import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import AppTopBar from './AppTopBar';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { token } = useAuth();
  const { connected, liveNotifications, dismissLiveNotification } = useSocket(Boolean(token), token);

  return (
    <div className="app-shell app-shell--workspace">
      <Sidebar />
      <div className="app-main">
        <AppTopBar connected={connected} />
        <div className="toast-stack" role="status" aria-live="polite">
          {liveNotifications.map((item) => (
            <div key={item.id} className={`toast toast--${item.type || 'info'}`}>
              <div>
                <strong>{item.title || 'Notification'}</strong>
                <span>{item.message || 'New update'}</span>
              </div>
              <button type="button" onClick={() => dismissLiveNotification(item.id)}>
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
