const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

function getStoredAuth() {
  const raw = localStorage.getItem('tms_auth');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function buildHeaders(includeRole = true) {
  const auth = getStoredAuth();
  const headers = { 'Content-Type': 'application/json' };

  if (auth?.token) {
    headers.Authorization = `Bearer ${auth.token}`;
  }

  if (includeRole && auth?.user?.role) {
    headers['user-role'] = auth.user.role;
  }

  return headers;
}

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data.message || data.error || data.description || 'Request failed';
    throw new Error(message);
  }

  return data;
}

export const api = {
  login(email, password) {
    return fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then(handleResponse);
  },

  resetPassword(newPassword) {
    return fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: buildHeaders(false),
      body: JSON.stringify({ newPassword }),
    }).then(handleResponse);
  },

  getTasks(params = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value)
    ).toString();
    const url = query ? `${API_BASE}/tasks?${query}` : `${API_BASE}/tasks`;

    return fetch(url, { headers: buildHeaders() }).then(handleResponse);
  },

  getTask(id) {
    return fetch(`${API_BASE}/tasks/${id}`, {
      headers: buildHeaders(),
    }).then(handleResponse);
  },

  createTask(task) {
    return fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(task),
    }).then(handleResponse);
  },

  updateTask(id, task) {
    return fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(task),
    }).then(handleResponse);
  },

  deleteTask(id) {
    return fetch(`${API_BASE}/tasks/${id}`, {
      method: 'DELETE',
      headers: buildHeaders(),
    }).then(handleResponse);
  },

  getComments(taskId) {
    return fetch(`${API_BASE}/comments/${taskId}`, {
      headers: buildHeaders(),
    }).then(handleResponse);
  },

  addComment(comment) {
    return fetch(`${API_BASE}/comments`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(comment),
    }).then(handleResponse);
  },

  deleteComment(id) {
    return fetch(`${API_BASE}/comments/${id}`, {
      method: 'DELETE',
      headers: buildHeaders(),
    }).then(handleResponse);
  },

  getUsers() {
    return fetch(`${API_BASE}/users`, {
      headers: buildHeaders(false),
    }).then(handleResponse);
  },

  createUser(user) {
    return fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: buildHeaders(false),
      body: JSON.stringify(user),
    }).then(handleResponse);
  },

  updateUser(id, user) {
    return fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: buildHeaders(false),
      body: JSON.stringify(user),
    }).then(handleResponse);
  },

  deactivateUser(id) {
    return fetch(`${API_BASE}/users/${id}/deactivate`, {
      method: 'PATCH',
      headers: buildHeaders(false),
    }).then(handleResponse);
  },
};

export { getStoredAuth, API_BASE };
