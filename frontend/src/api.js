import { clearStoredAuth, getValidStoredAuth } from './utils/authStorage';
import { API_BASE } from './config/apiConfig';

const DEFAULT_TIMEOUT_MS = 45_000;
const COLD_START_TIMEOUT_MS = 90_000;
const KEEP_ALIVE_MS = 12 * 60 * 1000;

let warmPromise = null;
let keepAliveTimer = null;

function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, { ...options, signal: controller.signal })
    .catch((err) => {
      if (err.name === 'AbortError') {
        const error = new Error('The server is taking too long to respond. Try again in a moment.');
        error.code = 'REQUEST_TIMEOUT';
        throw error;
      }
      throw err;
    })
    .finally(() => clearTimeout(timer));
}

/** Wake Render free tier; dedupes concurrent health checks. */
export function warmApiHealth() {
  if (!import.meta.env.PROD) return Promise.resolve();

  if (!warmPromise) {
    warmPromise = fetchWithTimeout(`${API_BASE}/health`, {}, COLD_START_TIMEOUT_MS)
      .then(() => {})
      .catch(() => {})
      .finally(() => {
        warmPromise = null;
      });
  }

  return warmPromise;
}

/** Keep pinging while the app is open so the API stays warm. */
export function startApiKeepAlive() {
  if (!import.meta.env.PROD) return () => {};

  warmApiHealth();
  if (keepAliveTimer) clearInterval(keepAliveTimer);
  keepAliveTimer = setInterval(() => warmApiHealth(), KEEP_ALIVE_MS);

  return () => {
    if (keepAliveTimer) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }
  };
}

function getStoredAuth() {
  return getValidStoredAuth();
}

function buildHeaders() {
  const auth = getStoredAuth();
  const headers = { 'Content-Type': 'application/json' };

  if (auth?.token) {
    headers.Authorization = `Bearer ${auth.token}`;
  }

  return headers;
}

function defaultMessageFor(status) {
  if (status === 403) return 'You do not have permission to perform this action.';
  if (status === 429) return 'Too many requests. Please slow down and try again shortly.';
  return 'Request failed';
}

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    clearStoredAuth();
    const onAuthPage =
      window.location.pathname.includes('/login') ||
      window.location.pathname.includes('/forgot-password');
    if (!onAuthPage) {
      window.location.href = '/login';
    }
  }

  if (!response.ok) {
    const message =
      data.message || data.error || data.description || defaultMessageFor(response.status);
    const error = new Error(message);
    error.status = response.status;
    error.code = data.errorCode || null;
    error.fieldErrors = Array.isArray(data.errors) ? data.errors : null;
    error.forbidden = response.status === 403;
    error.rateLimited = response.status === 429;
    throw error;
  }

  return data;
}

async function apiFetch(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const method = (options.method || 'GET').toUpperCase();
  const canRetry = method === 'GET' || method === 'HEAD';

  const execute = (ms) => fetchWithTimeout(url, options, ms).then(handleResponse);

  try {
    return await execute(timeoutMs);
  } catch (err) {
    const isTransient =
      err.code === 'REQUEST_TIMEOUT' ||
      err.message === 'Failed to fetch' ||
      err.name === 'TypeError';

    if (canRetry && isTransient && import.meta.env.PROD) {
      await warmApiHealth();
      return execute(COLD_START_TIMEOUT_MS);
    }

    throw err;
  }
}

export const api = {
  login(email, password) {
    return fetchWithTimeout(
      `${API_BASE}/auth/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      },
      COLD_START_TIMEOUT_MS
    ).then(handleResponse);
  },

  forgotPassword(identifier) {
    return apiFetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: identifier, username: identifier }),
    });
  },

  resetPassword(newPassword) {
    return apiFetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ newPassword }),
    });
  },

  getTasks(params = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value !== '' && value != null)
    ).toString();
    const url = query ? `${API_BASE}/tasks?${query}` : `${API_BASE}/tasks`;
    return apiFetch(url, { headers: buildHeaders() });
  },

  getTask(id) {
    return apiFetch(`${API_BASE}/tasks/${id}`, { headers: buildHeaders() });
  },

  createTask(task) {
    return apiFetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(task),
    });
  },

  updateTask(id, task) {
    return apiFetch(`${API_BASE}/tasks/${id}`, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(task),
    });
  },

  deleteTask(id) {
    return apiFetch(`${API_BASE}/tasks/${id}`, {
      method: 'DELETE',
      headers: buildHeaders(),
    });
  },

  getComments(taskId) {
    return apiFetch(`${API_BASE}/comments/${taskId}`, { headers: buildHeaders() });
  },

  addComment(comment) {
    return apiFetch(`${API_BASE}/comments`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(comment),
    });
  },

  deleteComment(id) {
    return apiFetch(`${API_BASE}/comments/${id}`, {
      method: 'DELETE',
      headers: buildHeaders(),
    });
  },

  getProjects() {
    return apiFetch(`${API_BASE}/projects`, { headers: buildHeaders() });
  },

  getProject(id) {
    return apiFetch(`${API_BASE}/projects/${id}`, { headers: buildHeaders() });
  },

  createProject(project) {
    return apiFetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(project),
    });
  },

  updateProject(id, updates) {
    return apiFetch(`${API_BASE}/projects/${id}`, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(updates),
    });
  },

  deleteProject(id) {
    return apiFetch(`${API_BASE}/projects/${id}`, {
      method: 'DELETE',
      headers: buildHeaders(),
      cache: 'no-store',
    });
  },

  getTeamMembers() {
    return apiFetch(`${API_BASE}/users/team`, { headers: buildHeaders() });
  },

  getProfile() {
    return apiFetch(`${API_BASE}/users/me`, { headers: buildHeaders() });
  },

  changePassword(currentPassword, newPassword) {
    return apiFetch(`${API_BASE}/users/me/password`, {
      method: 'PATCH',
      headers: buildHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  getUsers() {
    return apiFetch(`${API_BASE}/users`, {
      headers: buildHeaders(),
      cache: 'no-store',
    });
  },

  createUser(user) {
    return apiFetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(user),
    });
  },

  updateUser(id, user) {
    return apiFetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(user),
    });
  },

  deactivateUser(id) {
    return apiFetch(`${API_BASE}/users/${id}/deactivate`, {
      method: 'PATCH',
      headers: buildHeaders(),
    });
  },

  deleteUser(id, payload = undefined) {
    return apiFetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE',
      headers: buildHeaders(),
      body: payload ? JSON.stringify(payload) : undefined,
      cache: 'no-store',
    });
  },

  getUserDeleteImpact(id) {
    return apiFetch(`${API_BASE}/users/${id}/delete-impact`, {
      headers: buildHeaders(),
      cache: 'no-store',
    });
  },

  activateUser(id) {
    return apiFetch(`${API_BASE}/users/${id}/activate`, {
      method: 'PATCH',
      headers: buildHeaders(),
    });
  },

  getNotifications() {
    return apiFetch(`${API_BASE}/notifications`, { headers: buildHeaders() });
  },

  getUnreadCount() {
    return apiFetch(`${API_BASE}/notifications/unread-count`, { headers: buildHeaders() });
  },

  markNotificationRead(id) {
    return apiFetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: buildHeaders(),
    });
  },

  markAllNotificationsRead() {
    return apiFetch(`${API_BASE}/notifications/read-all`, {
      method: 'PATCH',
      headers: buildHeaders(),
    });
  },

  getAttachments(taskId) {
    return apiFetch(`${API_BASE}/attachments/${taskId}`, { headers: buildHeaders() });
  },

  uploadAttachment(taskId, file) {
    const auth = getStoredAuth();
    const formData = new FormData();
    formData.append('task_id', String(taskId));
    formData.append('file', file);

    const headers = {};
    if (auth?.token) {
      headers.Authorization = `Bearer ${auth.token}`;
    }

    return fetchWithTimeout(
      `${API_BASE}/attachments/upload`,
      { method: 'POST', headers, body: formData },
      COLD_START_TIMEOUT_MS
    ).then(handleResponse);
  },

  async downloadAttachment(id, fileName) {
    const auth = getStoredAuth();
    const headers = {};
    if (auth?.token) {
      headers.Authorization = `Bearer ${auth.token}`;
    }

    const response = await fetchWithTimeout(
      `${API_BASE}/attachments/download/${id}`,
      { headers },
      COLD_START_TIMEOUT_MS
    );

    if (response.status === 401) {
      clearStoredAuth();
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || data.error || 'Download failed');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'download';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },

  deleteAttachment(id) {
    return apiFetch(`${API_BASE}/attachments/${id}`, {
      method: 'DELETE',
      headers: buildHeaders(),
    });
  },
};

export { getStoredAuth, clearStoredAuth, API_BASE };
