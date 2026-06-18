import { createContext, useContext, useMemo, useState } from 'react';
import { getStoredAuth } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => getStoredAuth());

  const login = (payload) => {
    localStorage.setItem('tms_auth', JSON.stringify(payload));
    setAuth(payload);
  };

  const logout = () => {
    localStorage.removeItem('tms_auth');
    setAuth(null);
  };

  const clearMustReset = () => {
    if (!auth) return;
    const next = { ...auth, mustResetPassword: false };
    localStorage.setItem('tms_auth', JSON.stringify(next));
    setAuth(next);
  };

  const value = useMemo(
    () => ({
      auth,
      user: auth?.user ?? null,
      token: auth?.token ?? null,
      mustResetPassword: auth?.mustResetPassword ?? false,
      isAuthenticated: Boolean(auth?.token),
      login,
      logout,
      clearMustReset,
    }),
    [auth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function useRole() {
  const { user } = useAuth();
  const role = user?.role ?? '';

  return {
    role,
    isAdmin: role === 'Admin',
    isProjectManager: role === 'Project Manager',
    isCollaborator: role === 'Collaborator',
    canManageTasks: role === 'Admin' || role === 'Project Manager',
    canViewAdmin: role === 'Admin',
  };
}
