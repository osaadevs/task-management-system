import NotificationPanel from './NotificationPanel';
import ThemeToggle from './ThemeToggle';

export default function AppTopBar({ connected }) {
  return (
    <header className="topbar">
      <div className="topbar__brand">
        <strong>Taskora</strong>
        <span className="muted">Velocity workspace</span>
      </div>
      <div className="topbar__actions">
        <ThemeToggle className="theme-toggle--compact" />
        <NotificationPanel />
        <span
          className={`topbar__live ${connected ? 'is-live' : ''}`}
          title={connected ? 'Real-time connected' : 'Offline'}
        >
          {connected ? '● Live' : '○ Offline'}
        </span>
      </div>
    </header>
  );
}
