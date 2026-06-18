import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { useSocket } from '../hooks/useSocket';

export default function Layout() {
  const { connected, notifications, dismissNotification } = useSocket();

  return (
    <div className="app-shell">
      <Navbar connected={connected} />
      {notifications.length > 0 && (
        <div className="toast-stack">
          {notifications.slice(0, 3).map((item) => (
            <div key={item.id} className="toast">
              <span>{item.message || 'New notification'}</span>
              <button type="button" onClick={() => dismissNotification(item.id)}>
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
