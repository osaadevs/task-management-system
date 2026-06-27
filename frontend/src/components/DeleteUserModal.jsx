import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

export default function DeleteUserModal({ target, onClose, onDeleted }) {
  const [assignments, setAssignments] = useState({});
  const [applyAllTo, setApplyAllTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const initial = {};
    for (const project of target.projects || []) {
      initial[project.id] = '';
    }
    setAssignments(initial);
    setApplyAllTo('');
  }, [target]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const candidates = target.reassignmentCandidates || [];
  const allAssigned = useMemo(
    () =>
      (target.projects || []).every((project) => {
        const value = assignments[project.id];
        return value && String(value).length > 0;
      }),
    [assignments, target.projects]
  );

  const handleApplyAll = () => {
    if (!applyAllTo) return;
    const next = {};
    for (const project of target.projects || []) {
      next[project.id] = applyAllTo;
    }
    setAssignments(next);
  };

  const handleConfirmDelete = async () => {
    setError('');
    setLoading(true);

    try {
      const project_reassignments = (target.projects || []).map((project) => ({
        project_id: project.id,
        new_manager_id: Number(assignments[project.id]),
      }));

      await api.deleteUser(target.id, { project_reassignments });
      onDeleted?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to delete user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal modal--delete-user"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-user-title"
      >
        <header className="project-modal__header">
          <div>
            <h2 id="delete-user-title">Delete {target.name}?</h2>
            <p className="muted">
              There are ongoing projects and tasks with this user. Assign each project to a
              new manager before deleting this account.
            </p>
          </div>
          <button type="button" className="icon-btn project-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        {error && <div className="alert alert--error">{error}</div>}

        <div className="delete-user-modal__bulk">
          <label>
            Assign all projects to
            <select
              value={applyAllTo}
              onChange={(e) => setApplyAllTo(e.target.value)}
            >
              <option value="">Select manager…</option>
              {candidates.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name} ({person.role})
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn--ghost btn--small" onClick={handleApplyAll} disabled={!applyAllTo}>
            Apply to all
          </button>
        </div>

        <ul className="delete-user-modal__projects">
          {(target.projects || []).map((project) => (
            <li key={project.id} className="delete-user-modal__project">
              <div>
                <strong>{project.project_name}</strong>
                <span className="muted">
                  {project.task_count} task{project.task_count === 1 ? '' : 's'}
                  {Number(project.incomplete_task_count) > 0
                    ? ` · ${project.incomplete_task_count} incomplete`
                    : ''}
                </span>
              </div>
              <select
                value={assignments[project.id] || ''}
                onChange={(e) =>
                  setAssignments((prev) => ({ ...prev, [project.id]: e.target.value }))
                }
              >
                <option value="">Select new manager…</option>
                {candidates.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name} ({person.role})
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>

        <footer className="project-modal__footer">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--danger-text"
            onClick={handleConfirmDelete}
            disabled={loading || !allAssigned || candidates.length === 0}
          >
            {loading ? 'Deleting…' : 'Delete and reassign projects'}
          </button>
        </footer>
      </div>
    </div>
  );
}
