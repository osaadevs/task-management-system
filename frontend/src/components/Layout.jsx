import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { useSocket } from '../hooks/useSocket';

export default function Layout() {
  const { connected, liveNotifications, dismissLiveNotification } = useSocket();

  return (
    <div className="app-shell">
      <Navbar connected={connected} />
      {liveNotifications.length > 0 && (
        <div className="toast-stack">
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
      )}
      <main className="page-content">
        <Outlet />
      </main>
    </div>
  );
}
