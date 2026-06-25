import { clearStoredAuth, getValidStoredAuth } from './utils/authStorage';
import { API_BASE } from './config/apiConfig';

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

  forgotPassword(identifier) {
    return fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: identifier, username: identifier }),
    }).then(handleResponse);
  },

  resetPassword(newPassword) {
    return fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ newPassword }),
    }).then(handleResponse);
  },

  getTasks(params = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value !== '' && value != null)
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

  getProjects() {
    return fetch(`${API_BASE}/projects`, {
      headers: buildHeaders(),
    }).then(handleResponse);
  },

  getProject(id) {
    return fetch(`${API_BASE}/projects/${id}`, {
      headers: buildHeaders(),
    }).then(handleResponse);
  },

  createProject(project) {
    return fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(project),
    }).then(handleResponse);
  },

  getTeamMembers() {
    return fetch(`${API_BASE}/users/team`, {
      headers: buildHeaders(),
    }).then(handleResponse);
  },

  getProfile() {
    return fetch(`${API_BASE}/users/me`, {
      headers: buildHeaders(),
    }).then(handleResponse);
  },

  changePassword(currentPassword, newPassword) {
    return fetch(`${API_BASE}/users/me/password`, {
      method: 'PATCH',
      headers: buildHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    }).then(handleResponse);
  },

  getUsers() {
    return fetch(`${API_BASE}/users`, {
      headers: buildHeaders(),
    }).then(handleResponse);
  },

  createUser(user) {
    return fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(user),
    }).then(handleResponse);
  },

  updateUser(id, user) {
    return fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(user),
    }).then(handleResponse);
  },

  deactivateUser(id) {
    return fetch(`${API_BASE}/users/${id}/deactivate`, {
      method: 'PATCH',
      headers: buildHeaders(),
    }).then(handleResponse);
  },

  activateUser(id) {
    return fetch(`${API_BASE}/users/${id}/activate`, {
      method: 'PATCH',
      headers: buildHeaders(),
    }).then(handleResponse);
  },

  getNotifications() {
    return fetch(`${API_BASE}/notifications`, {
      headers: buildHeaders(),
    }).then(handleResponse);
  },

  getUnreadCount() {
    return fetch(`${API_BASE}/notifications/unread-count`, {
      headers: buildHeaders(),
    }).then(handleResponse);
  },

  markNotificationRead(id) {
    return fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: buildHeaders(),
    }).then(handleResponse);
  },

  markAllNotificationsRead() {
    return fetch(`${API_BASE}/notifications/read-all`, {
      method: 'PATCH',
      headers: buildHeaders(),
    }).then(handleResponse);
  },

  getAttachments(taskId) {
    return fetch(`${API_BASE}/attachments/${taskId}`, {
      headers: buildHeaders(),
    }).then(handleResponse);
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

    return fetch(`${API_BASE}/attachments/upload`, {
      method: 'POST',
      headers,
      body: formData,
    }).then(handleResponse);
  },

  async downloadAttachment(id, fileName) {
    const auth = getStoredAuth();
    const headers = {};
    if (auth?.token) {
      headers.Authorization = `Bearer ${auth.token}`;
    }

    const response = await fetch(`${API_BASE}/attachments/download/${id}`, { headers });

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
    return fetch(`${API_BASE}/attachments/${id}`, {
      method: 'DELETE',
      headers: buildHeaders(),
    }).then(handleResponse);
  },
};

export { getStoredAuth, clearStoredAuth, API_BASE };
