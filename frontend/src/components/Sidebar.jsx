import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth, useRole } from '../context/AuthContext';

function getInitials(name = '') {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const NAV = [
  { to: '/?view=overview', label: 'Dashboard', view: 'overview', icon: '▦' },
  { to: '/?view=board', label: 'My Tasks', view: 'board', icon: '☑' },
  { to: '/admin', label: 'Team', icon: '👥', adminOnly: true },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { canViewAdmin } = useRole();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const currentView = searchParams.get('view') || 'overview';

  const isActive = (item) => {
    if (item.to.startsWith('/admin')) return location.pathname.startsWith('/admin');
    return location.pathname === '/' && item.view === currentView;
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__logo" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M13 10V3L4 14h7v7l9-11h-7z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div>
          <strong>Taskora</strong>
          <span>Pro Workspace</span>
        </div>
      </div>

      <nav className="sidebar__nav">
        {NAV.filter((item) => !item.adminOnly || canViewAdmin).map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className={`sidebar__link ${isActive(item) ? 'is-active' : ''}`}
          >
            <span className="sidebar__link-icon" aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="sidebar__mid">
        <Link to="/?view=board&create=1" className="sidebar__cta">
          + New Task
        </Link>
      </div>

      <div className="sidebar__footer">
        <div className="sidebar__profile">
          <span className="sidebar__avatar">{getInitials(user?.name)}</span>
          <div>
            <strong>{user?.name}</strong>
            <span>{user?.role}</span>
          </div>
        </div>
        <button type="button" className="sidebar__logout" onClick={logout}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
