import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearStoredAuth,
  getValidStoredAuth,
  setStoredAuth,
  updateStoredAuth,
} from '../utils/authStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => getValidStoredAuth());

  useEffect(() => {
    setAuth(getValidStoredAuth());
  }, []);

  const login = (payload, options = {}) => {
    setStoredAuth(payload, options);
    setAuth(payload);
  };

  const logout = () => {
    clearStoredAuth();
    setAuth(null);
  };

  const clearMustReset = () => {
    const next = updateStoredAuth((current) => ({
      ...current,
      mustResetPassword: false,
    }));
    if (next) setAuth(next);
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
