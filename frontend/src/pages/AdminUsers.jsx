import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api';
import DeleteUserModal from '../components/DeleteUserModal';
import { TrashIcon } from '../components/Icons';
import LoadingState from '../components/LoadingState';
import ErrorRetry from '../components/ErrorRetry';
import { useAuth, useRole } from '../context/AuthContext';
import { scrollToElement } from '../utils/scrollToElement';
import { fieldErrorMap } from '../utils/formErrors';

const ROLES = ['Admin', 'Project Manager', 'Collaborator'];
const ROLE_FILTERS = ['All Members', 'Admins', 'PMs', 'Collaborators'];

function normalizeUser(user) {
  return {
    ...user,
    name: user.name || user.full_name,
    role: user.role || user.role_name,
    is_active: user.is_active !== false && user.is_active !== 0,
  };
}

function getInitials(name = '') {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function roleBadgeClass(role) {
  if (role === 'Admin') return 'role-badge--admin';
  if (role === 'Project Manager') return 'role-badge--pm';
  return 'role-badge--collab';
}

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const { canViewAdmin } = useRole();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', role: 'Collaborator' });
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Members');
  const [showInvite, setShowInvite] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const formPanelRef = useRef(null);
  const alertRef = useRef(null);

  const loadUsers = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await api.getUsers();
      const list = Array.isArray(data) ? data : (data.data || []);
      setUsers(list.map(normalizeUser));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canViewAdmin) loadUsers();
  }, [canViewAdmin]);

  useEffect(() => {
    if (showInvite) {
      scrollToElement(formPanelRef.current, { block: 'center' });
    }
  }, [showInvite, editId]);

  useEffect(() => {
    if (error || message) {
      scrollToElement(alertRef.current, { block: 'nearest', focus: false });
    }
  }, [error, message]);

  const managedUsers = useMemo(() => {
    const currentId = Number(currentUser?.id);
    if (!currentId) return users;
    return users.filter((user) => Number(user.id) !== currentId);
  }, [users, currentUser?.id]);

  const filteredUsers = useMemo(() => {
    let list = managedUsers;
    const term = search.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (user) =>
          user.name?.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term)
      );
    }
    if (roleFilter === 'Admins') {
      list = list.filter((u) => u.role === 'Admin');
    } else if (roleFilter === 'PMs') {
      list = list.filter((u) => u.role === 'Project Manager');
    } else if (roleFilter === 'Collaborators') {
      list = list.filter((u) => u.role === 'Collaborator');
    }
    return list;
  }, [managedUsers, search, roleFilter]);

  if (!canViewAdmin) {
    return <Navigate to="/" replace />;
  }

  const resetForm = () => {
    setForm({ name: '', email: '', role: 'Collaborator' });
    setEditId(null);
    setShowInvite(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setFieldErrors({});

    try {
      if (editId) {
        await api.updateUser(editId, form);
        setMessage('User updated successfully.');
      } else {
        const result = await api.createUser(form);
        setMessage(result.message || `User created. Welcome email sent to ${form.email}.`);
      }
      resetForm();
      await loadUsers();
    } catch (err) {
      setError(err.message);
      setFieldErrors(fieldErrorMap(err)); // FE-5 (e.g. duplicate email -> email field)
    }
  };

  const startEdit = (user) => {
    setEditId(user.id);
    setShowInvite(true);
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
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

  const handleDelete = async (id, name) => {
    const normalizedId = Number(id);

    try {
      setError('');
      setMessage('');

      const impact = await api.getUserDeleteImpact(normalizedId);

      if (impact.requiresReassignment) {
        setDeleteTarget({
          id: normalizedId,
          name,
          projects: impact.projects || [],
          reassignmentCandidates: impact.reassignmentCandidates || [],
        });
        return;
      }

      if (
        !window.confirm(
          `Permanently delete ${name}? This removes their account from the system and cannot be undone.`
        )
      ) {
        return;
      }

      const result = await api.deleteUser(normalizedId);
      setUsers((prev) => prev.filter((user) => Number(user.id) !== normalizedId));
      setMessage(result.message || 'User deleted permanently.');
      if (Number(editId) === normalizedId) resetForm();
      await loadUsers();
    } catch (err) {
      const hint =
        err.status === 404
          ? ' Delete route not found — restart the local backend (port 5000) and Vite dev server.'
          : '';
      setError((err.message || 'Failed to delete user.') + hint);
    }
  };

  const handleDeleteCompleted = async () => {
    const deletedId = deleteTarget?.id;
    setMessage('User deleted permanently. Ongoing projects were reassigned.');
    setDeleteTarget(null);
    if (Number(editId) === Number(deletedId)) resetForm();
    await loadUsers();
  };

  const emailError =
    !editId &&
    form.email.trim().length > 0 &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
      ? 'Enter a valid email address.'
      : '';

  return (
    <div className="admin-page page-enter">
      <header className="page-header page-header--split">
        <div>
          <h1>Team Management</h1>
          <p className="muted">Manage workspace members, roles, and access.</p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            resetForm();
            setShowInvite(true);
          }}
        >
          + Invite User
        </button>
      </header>

      <div className="admin-toolbar">
        <div className="role-filters">
          {ROLE_FILTERS.map((label) => (
            <button
              key={label}
              type="button"
              className={`role-filter ${roleFilter === label ? 'is-active' : ''}`}
              onClick={() => setRoleFilter(label)}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          className="search-input"
          placeholder="Search team members…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <div ref={alertRef} className="alert alert--error">
          {error}
        </div>
      )}
      {message && (
        <div ref={alertRef} className="alert alert--success">
          {message}
        </div>
      )}

      {showInvite && (
        <form
          ref={formPanelRef}
          className={`panel panel--invite scroll-target${editId ? ' panel--editing' : ''}`}
          onSubmit={handleSubmit}
        >
          <h3>{editId ? 'Edit member' : 'Invite new member'}</h3>
          <div className="form-grid form-grid--3">
            <label>
              Full name
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
                maxLength={150}
                aria-invalid={Boolean(fieldErrors.full_name)}
              />
              {fieldErrors.full_name && (
                <span className="field-error">{fieldErrors.full_name}</span>
              )}
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                required
                disabled={Boolean(editId)}
                aria-invalid={Boolean(emailError || fieldErrors.email)}
                aria-describedby={emailError || fieldErrors.email ? 'invite-email-error' : undefined}
              />
              {(emailError || fieldErrors.email) && (
                <span className="field-error" id="invite-email-error">{emailError || fieldErrors.email}</span>
              )}
            </label>
            <label>
              Role
              <select
                value={form.role}
                onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                aria-invalid={Boolean(fieldErrors.role)}
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              {fieldErrors.role && <span className="field-error">{fieldErrors.role}</span>}
            </label>
          </div>
          <div className="form-actions-inline">
            <button type="submit" className="btn btn--primary">
              {editId ? 'Save Changes' : 'Send Invite'}
            </button>
            <button type="button" className="btn btn--ghost" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <section className="panel panel--flush">
        {loading ? (
          <LoadingState label="Loading members…" />
        ) : error && users.length === 0 ? (
          <ErrorRetry message={error} onRetry={loadUsers} />
        ) : (
          <div className="table-wrap admin-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Email</th>
                  <th className="data-table__role-col">Role</th>
                  <th>Status</th>
                  <th className="data-table__actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="data-table__empty muted">
                      No members match your filters
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <span className="table-user">
                          <span className="table-user__avatar">{getInitials(user.name)}</span>
                          <span className="table-user__name">{user.name}</span>
                        </span>
                      </td>
                      <td className="data-table__email">{user.email}</td>
                      <td className="data-table__role-col">
                        <span className={`role-badge ${roleBadgeClass(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill ${user.is_active ? 'status-pill--active' : 'status-pill--inactive'}`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="data-table__actions-col">
                        <div className="table-actions">
                          <button
                            type="button"
                            className="btn btn--ghost btn--small"
                            onClick={() => startEdit(user)}
                          >
                            Edit
                          </button>
                          {user.is_active ? (
                            <button
                              type="button"
                              className="btn btn--ghost btn--small btn--danger-text"
                              onClick={() => handleDeactivate(user.id)}
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn--ghost btn--small"
                              onClick={() => handleActivate(user.id)}
                            >
                              Activate
                            </button>
                          )}
                          <button
                            type="button"
                            className="icon-btn icon-btn--danger icon-btn--small table-actions__delete"
                            onClick={() => handleDelete(user.id, user.name)}
                            aria-label={`Delete ${user.name}`}
                            title="Delete user permanently"
                          >
                            <TrashIcon size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="table-footer muted">
              Showing {filteredUsers.length} of {managedUsers.length} members
            </div>
          </div>
        )}
      </section>

      {deleteTarget && (
        <DeleteUserModal
          target={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleteCompleted}
        />
      )}
    </div>
  );
}
