import { useEffect, useState } from 'react';
import { api } from '../api';
import { useRole } from '../context/AuthContext';
import CommentSection from './CommentSection';

const STATUSES = ['To Do', 'In Progress', 'Completed'];
const PRIORITIES = ['Low', 'Medium', 'High'];

const emptyForm = {
  title: '',
  description: '',
  due_date: '',
  priority: 'Medium',
  status: 'To Do',
  project_id: '',
  assignee_ids: [],
};

export default function TaskModal({ task, onClose, onSaved, onDeleted }) {
  const { canManageTasks, isCollaborator } = useRole();
  const isNew = !task;

  const [form, setForm] = useState(emptyForm);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (task) {
      const assigneeIds = Array.isArray(task.assignees)
        ? task.assignees.map((a) => a.id)
        : [];
      setForm({
        title: task.title || '',
        description: task.description || '',
        due_date: task.due_date ? task.due_date.slice(0, 10) : '',
        priority: task.priority || 'Medium',
        status: task.status || 'To Do',
        project_id: task.project_id || '',
        assignee_ids: assigneeIds,
      });
    } else {
      setForm(emptyForm);
    }
  }, [task]);

  useEffect(() => {
    Promise.all([api.getProjects(), api.getTeamMembers()])
      .then(([projectRes, userRes]) => {
        const projectData = projectRes.data || projectRes || [];
        const userData = userRes.data || userRes || [];
        setProjects(Array.isArray(projectData) ? projectData : []);
        setUsers(Array.isArray(userData) ? userData : []);
        if (isNew && projectData[0]) {
          setForm((prev) => ({ ...prev, project_id: projectData[0].id }));
        }
      })
      .catch(() => {});
  }, [isNew]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleAssignee = (userId) => {
    setForm((prev) => {
      const exists = prev.assignee_ids.includes(userId);
      return {
        ...prev,
        assignee_ids: exists
          ? prev.assignee_ids.filter((id) => id !== userId)
          : [...prev.assignee_ids, userId],
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (form.due_date && new Date(form.due_date) < today) {
      setError('Due date cannot be in the past');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        ...form,
        project_id: Number(form.project_id),
        assignee_ids: form.assignee_ids.map(Number),
      };

      if (isNew) {
        await api.createTask(payload);
      } else if (isCollaborator) {
        await api.updateTask(task.id, { status: form.status });
      } else {
        await api.updateTask(task.id, payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this task?')) return;
    setLoading(true);
    setError('');

    try {
      await api.deleteTask(task.id);
      onDeleted();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const readOnly = isCollaborator && !isNew;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal__header">
          <h2>{isNew ? 'Create Task' : readOnly ? 'Update Status' : 'Task Details'}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="modal__body" onSubmit={handleSubmit}>
          {error && <div className="alert alert--error">{error}</div>}

          <label>
            Title
            <input
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              required
              disabled={readOnly}
            />
          </label>

          <label>
            Description
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              disabled={readOnly}
            />
          </label>

          <div className="form-grid">
            <label>
              Status
              <select
                value={form.status}
                onChange={(e) => updateField('status', e.target.value)}
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Priority
              <select
                value={form.priority}
                onChange={(e) => updateField('priority', e.target.value)}
                disabled={readOnly}
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Due date
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => updateField('due_date', e.target.value)}
                disabled={readOnly}
              />
            </label>

            {(isNew || canManageTasks) && (
              <label>
                Project
                <select
                  value={form.project_id}
                  onChange={(e) => updateField('project_id', e.target.value)}
                  required
                  disabled={readOnly && !isNew}
                >
                  <option value="">Select project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.project_name || project.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {canManageTasks && (
            <fieldset className="assignee-fieldset">
              <legend>Assign to</legend>
              <div className="assignee-grid">
                {users
                  .filter((u) => u.is_active !== false)
                  .map((member) => (
                    <label key={member.id} className="assignee-chip">
                      <input
                        type="checkbox"
                        checked={form.assignee_ids.includes(member.id)}
                        onChange={() => toggleAssignee(member.id)}
                      />
                      <span>{member.name || member.full_name}</span>
                    </label>
                  ))}
              </div>
            </fieldset>
          )}

          <div className="modal__actions">
            {canManageTasks && !isNew && (
              <button
                type="button"
                className="btn btn--danger"
                onClick={handleDelete}
                disabled={loading}
              >
                Delete
              </button>
            )}
            <div className="modal__actions-right">
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn--primary" disabled={loading}>
                {loading ? 'Saving…' : isNew ? 'Create Task' : readOnly ? 'Update Status' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>

        {!isNew && <CommentSection taskId={task.id} />}
      </div>
    </div>
  );
}
