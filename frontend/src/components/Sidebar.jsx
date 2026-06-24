import { Link, useLocation } from 'react-router-dom';
import { useAuth, useRole } from '../context/AuthContext';
import { GridIcon, FolderIcon, UsersIcon } from './Icons';

function getInitials(name = '') {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const NAV = [
  { to: '/', label: 'Dashboard', match: (path) => path === '/', icon: GridIcon },
  { to: '/projects', label: 'Projects', match: (path) => path.startsWith('/projects'), icon: FolderIcon },
  { to: '/admin', label: 'Team', match: (path) => path.startsWith('/admin'), icon: UsersIcon, adminOnly: true },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { canViewAdmin, canManageTasks } = useRole();
  const location = useLocation();

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__logo" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 40 40" fill="none">
            <path
              d="M30 28V12C30 10.8954 29.1046 10 28 10H27.8994C27.369 10 26.8604 10.2109 26.4854 10.5859L10.5859 26.4854C10.2109 26.8604 10 27.369 10 27.8994V40H0V27.8994C2.15312e-05 24.7168 1.26423 21.6645 3.51465 19.4141L19.4141 3.51465C21.6645 1.26423 24.7168 2.1373e-05 27.8994 0H28C34.6274 0 40 5.37258 40 12V28C40 34.6274 34.6274 40 28 40H14V30H28C29.1046 30 30 29.1046 30 28ZM0 0H17L7 10H0V0Z"
              fill="currentColor"
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
            className={`sidebar__link ${item.match(location.pathname) ? 'is-active' : ''}`}
            aria-current={item.match(location.pathname) ? 'page' : undefined}
          >
            <span className="sidebar__link-icon" aria-hidden="true">
              <item.icon size={18} />
            </span>
            {item.label}
          </Link>
        ))}
      </nav>

      {canManageTasks && (
        <div className="sidebar__mid">
          <Link to="/projects?create=1" className="sidebar__cta">
            + New Project
          </Link>
        </div>
      )}

      <div className="sidebar__footer">
        <div className="sidebar__profile">
          <span className="sidebar__avatar">{getInitials(user?.name)}</span>
          <div>
            <strong>{user?.name}</strong>
            <span className="sidebar__role">{user?.role}</span>
          </div>
        </div>
        <button type="button" className="sidebar__logout" onClick={logout}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
