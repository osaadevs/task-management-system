import { Link, useLocation } from 'react-router-dom';
import { useAuth, useRole } from '../context/AuthContext';

export default function Navbar({ connected }) {
  const { user, logout } = useAuth();
  const { canViewAdmin } = useRole();
  const location = useLocation();

  return (
    <header className="navbar">
      <div className="navbar__brand">
        <span className="navbar__logo">TMS</span>
        <div>
          <h1>Task Management System</h1>
          <p>INTE 21323 · Team workspace</p>
        </div>
      </div>

      <nav className="navbar__links">
        <Link
          to="/"
          className={location.pathname === '/' ? 'active' : ''}
        >
          Board
        </Link>
        {canViewAdmin && (
          <Link
            to="/admin"
            className={location.pathname === '/admin' ? 'active' : ''}
          >
            Users
          </Link>
        )}
      </nav>

      <div className="navbar__user">
        <div className="status-pill" data-connected={connected}>
          {connected ? 'Live' : 'Offline'}
        </div>
        <div className="navbar__profile">
          <strong>{user?.name}</strong>
          <span>{user?.role}</span>
        </div>
        <button type="button" className="btn btn--ghost" onClick={logout}>
          Logout
        </button>
      </div>
    </header>
  );
}
