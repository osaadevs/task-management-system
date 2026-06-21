import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { isAuthenticated, mustResetPassword } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (mustResetPassword && location.pathname !== '/reset-password') {
    return <Navigate to="/reset-password" replace />;
  }

  return <Outlet />;
}
