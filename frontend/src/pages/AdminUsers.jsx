import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api';
import { useRole } from '../context/AuthContext';

const ROLES = ['Admin', 'Project Manager', 'Collaborator'];

export default function AdminUsers() {
  const { canViewAdmin } = useRole();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', role: 'Collaborator' });
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await api.getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canViewAdmin) loadUsers();
  }, [canViewAdmin]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter(
      (user) =>
        (user.name || user.full_name || '').toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        (user.role || '').toLowerCase().includes(term)
    );
  }, [users, search]);

  if (!canViewAdmin) {
    return <Navigate to="/" replace />;
  }

  const resetForm = () => {
    setForm({ name: '', email: '', role: 'Collaborator' });
    setEditId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      if (editId) {
        await api.updateUser(editId, form);
        setMessage('User updated successfully.');
      } else {
        const result = await api.createUser(form);
        setMessage(
          `User created. Temporary password: ${result.tempPassword} (share securely with the user).`
        );
      }
      resetForm();
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (user) => {
    setEditId(user.id);
    setForm({
      name: user.name || user.full_name,
      email: user.email,
      role: user.role || user.role_name,
    });
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this user?')) return;
    try {
      await api.deactivateUser(id);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleActivate = async (id) => {
    try {
      await api.activateUser(id);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="admin-page">
      <div className="dashboard__toolbar">
        <div>
          <h2>User Management</h2>
          <p className="muted">Admin-only: create, update, and manage team members</p>
        </div>
        <input
          className="search-input"
          placeholder="Search users…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {message && <div className="alert alert--success">{message}</div>}

      <div className="admin-grid">
        <form className="panel" onSubmit={handleSubmit}>
          <h3>{editId ? 'Edit User' : 'Create User'}</h3>
          <label>
            Full name
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
          </label>
          <label>
            Role
            <select
              value={form.role}
              onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <div className="form-actions-inline">
            <button type="submit" className="btn btn--primary">
              {editId ? 'Save Changes' : 'Create User'}
            </button>
            {editId && (
              <button type="button" className="btn btn--ghost" onClick={resetForm}>
                Cancel edit
              </button>
            )}
          </div>
        </form>

        <section className="panel">
          <h3>All Users ({filteredUsers.length})</h3>
          {loading ? (
            <p className="muted">Loading users…</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>{user.name || user.full_name}</td>
                      <td>{user.email}</td>
                      <td>{user.role || user.role_name}</td>
                      <td>
                        <span
                          className={`status-badge ${
                            user.is_active === false || user.is_active === 0
                              ? 'status-badge--inactive'
                              : 'status-badge--active'
                          }`}
                        >
                          {user.is_active === false || user.is_active === 0 ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                      <td className="table-actions">
                        <button
                          type="button"
                          className="btn btn--ghost btn--small"
                          onClick={() => startEdit(user)}
                        >
                          Edit
                        </button>
                        {user.is_active === false || user.is_active === 0 ? (
                          <button
                            type="button"
                            className="btn btn--ghost btn--small"
                            onClick={() => handleActivate(user.id)}
                          >
                            Activate
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn--ghost btn--small"
                            onClick={() => handleDeactivate(user.id)}
                          >
                            Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
