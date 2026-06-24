const PRODUCTION_API = 'https://task-management-system-backend-z9y4.onrender.com/api';
const PRODUCTION_SOCKET = 'https://task-management-system-backend-z9y4.onrender.com';

export function getApiBase() {
  const configured = import.meta.env.VITE_API_BASE?.trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }
  if (import.meta.env.PROD) {
    return PRODUCTION_API;
  }
  return 'http://localhost:5000/api';
}

export function getSocketUrl() {
  const explicit = import.meta.env.VITE_SOCKET_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }

  const apiBase = getApiBase();
  if (apiBase.startsWith('http')) {
    return apiBase.replace(/\/api\/?$/, '');
  }

  if (typeof window !== 'undefined' && apiBase.startsWith('/')) {
    return window.location.origin;
  }

  return PRODUCTION_SOCKET;
}

export const API_BASE = getApiBase();
