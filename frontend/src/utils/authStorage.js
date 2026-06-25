const AUTH_KEY = 'tms_auth';
const REMEMBER_KEY = 'tms_auth_remember';

function readAuthFrom(storage, key = AUTH_KEY) {
  const raw = storage.getItem(key);
  if (!raw) return null;

  try {
    const auth = JSON.parse(raw);
    if (!auth?.token || !auth?.user) {
      storage.removeItem(key);
      return null;
    }
    if (isTokenExpired(auth.token)) {
      storage.removeItem(key);
      return null;
    }
    return auth;
  } catch {
    storage.removeItem(key);
    return null;
  }
}

export function parseJwtPayload(token) {
  try {
    const segment = token.split('.')[1];
    if (!segment) return null;
    const json = atob(segment.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isTokenExpired(token) {
  const payload = parseJwtPayload(token);
  if (!payload?.exp) return true;
  return payload.exp * 1000 <= Date.now();
}

export function getValidStoredAuth() {
  return readAuthFrom(sessionStorage);
}

export function getRememberedAuth() {
  return readAuthFrom(localStorage, REMEMBER_KEY);
}

export function setStoredAuth(auth, { remember = false } = {}) {
  sessionStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  localStorage.removeItem(AUTH_KEY);

  if (remember) {
    localStorage.setItem(REMEMBER_KEY, JSON.stringify(auth));
  } else {
    localStorage.removeItem(REMEMBER_KEY);
  }
}

export function restoreRememberedAuth() {
  const auth = getRememberedAuth();
  if (!auth) return null;
  sessionStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  return auth;
}

export function clearStoredAuth() {
  sessionStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(REMEMBER_KEY);
}

export function updateStoredAuth(updater) {
  const current = getValidStoredAuth();
  if (!current) return null;
  const next = updater(current);
  const remembered = Boolean(getRememberedAuth());
  setStoredAuth(next, { remember: remembered });
  return next;
}
