import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api';
import { useRole } from '../context/AuthContext';

const ROLES = ['Admin', 'Project Manager', 'Collaborator'];

export default function AdminUsers() {
  const { canViewAdmin } = useRole();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', role: 'Collaborator' });
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

  if (!canViewAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleCreate = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      await api.createUser(form);
      setMessage('User created. Check server logs for the temporary password.');
      setForm({ name: '', email: '', role: 'Collaborator' });
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
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

  return (
    <div className="admin-page">
      <div className="dashboard__toolbar">
        <div>
          <h2>User Management</h2>
          <p className="muted">Admin-only: create and manage team members</p>
        </div>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {message && <div className="alert alert--success">{message}</div>}

      <div className="admin-grid">
        <form className="panel" onSubmit={handleCreate}>
          <h3>Create User</h3>
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
          <button type="submit" className="btn btn--primary">Create User</button>
        </form>

        <section className="panel">
          <h3>All Users</h3>
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
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.name || user.full_name}</td>
                      <td>{user.email}</td>
                      <td>{user.role || user.role_name}</td>
                      <td>{user.is_active === false || user.is_active === 0 ? 'Inactive' : 'Active'}</td>
                      <td>
                        {(user.is_active === true || user.is_active === 1 || user.is_active === undefined) && (
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
