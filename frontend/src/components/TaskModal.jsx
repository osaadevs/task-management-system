import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth, useRole } from '../context/AuthContext';
import CommentSection from './CommentSection';

const STATUSES = ['To Do', 'In Progress', 'Completed'];
const PRIORITIES = ['Low', 'Medium', 'High'];

const emptyForm = {
  title: '',
  description: '',
  due_date: '',
  priority: 'Medium',
  status: 'To Do',
  project_id: 1,
};

export default function TaskModal({ task, onClose, onSaved, onDeleted }) {
  const { user } = useAuth();
  const { canManageTasks } = useRole();
  const isNew = !task;

  const [form, setForm] = useState(
    task
      ? {
          title: task.title || '',
          description: task.description || '',
          due_date: task.due_date ? task.due_date.slice(0, 10) : '',
          priority: task.priority || 'Medium',
          status: task.status || 'To Do',
          project_id: task.project_id || 1,
        }
      : emptyForm
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isNew) {
        await api.createTask({
          ...form,
          created_by: user.id,
          project_id: Number(form.project_id),
        });
      } else {
        await api.updateTask(task.id, form);
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

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <h2>{isNew ? 'Create Task' : 'Task Details'}</h2>
          <button type="button" className="icon-btn" onClick={onClose}>
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
            />
          </label>

          <label>
            Description
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
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
              />
            </label>

            {isNew && (
              <label>
                Project ID
                <input
                  type="number"
                  min="1"
                  value={form.project_id}
                  onChange={(e) => updateField('project_id', e.target.value)}
                  required
                />
              </label>
            )}
          </div>

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
                {loading ? 'Saving…' : isNew ? 'Create Task' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>

        {!isNew && <CommentSection taskId={task.id} />}
      </div>
    </div>
  );
}
