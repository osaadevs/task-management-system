import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const THEMES = [
  { id: 'blue', label: 'Ocean', className: 'gradient-blue' },
  { id: 'teal', label: 'Teal', className: 'gradient-teal' },
  { id: 'purple', label: 'Sunset', className: 'gradient-purple' },
];

const emptyForm = {
  project_name: '',
  description: '',
  theme: 'blue',
};

export default function ProjectModal({ onClose, onSaved }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const nameInputRef = useRef(null);
  const modalRef = useRef(null);

  const selectedTheme = THEMES.find((t) => t.id === form.theme) || THEMES[0];

  const previewName = form.project_name.trim() || 'Untitled project';
  const previewDesc =
    form.description.trim() || 'Add a short description so your team knows what this project is about.';

  const canSubmit = form.project_name.trim().length >= 2;

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    if (modalRef.current) {
      modalRef.current.focus({ preventScroll: true });
    }
    window.setTimeout(() => nameInputRef.current?.focus({ preventScroll: true }), 50);
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    if (!error || !modalRef.current) return;
    const alert = modalRef.current.querySelector('.alert--error');
    alert?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [error]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError('');

    try {
      const response = await api.createProject({
        project_name: form.project_name.trim(),
        description: form.description.trim(),
      });
      const project = response.data;
      onSaved?.(project);
      onClose();
      if (project?.id) {
        navigate(`/projects/${project.id}?create=1`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const nameHint = useMemo(() => {
    const len = form.project_name.trim().length;
    if (!len) return 'Required — at least 2 characters';
    if (len < 2) return 'Name is too short';
    return `${len}/150 characters`;
  }, [form.project_name]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={modalRef}
        className="modal modal--project"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-modal-title"
        tabIndex={-1}
      >
        <div className="project-modal__layout">
          <form className="project-modal__form" onSubmit={handleSubmit}>
            <header className="project-modal__header">
              <span className="project-modal__icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 7a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div>
                <h2 id="project-modal-title">Create new project</h2>
                <p className="muted">Projects hold tasks, boards, and team progress.</p>
              </div>
              <button type="button" className="icon-btn project-modal__close" onClick={onClose} aria-label="Close">
                ×
              </button>
            </header>

            {error && <div className="alert alert--error">{error}</div>}

            <label className="field">
              <span>Project name</span>
              <input
                ref={nameInputRef}
                className="input-field"
                value={form.project_name}
                onChange={(e) => setForm((prev) => ({ ...prev, project_name: e.target.value }))}
                placeholder="e.g. Mobile App v2.0"
                maxLength={150}
                required
                autoFocus
              />
              <span className={`field__hint ${form.project_name.trim().length < 2 ? 'field__hint--warn' : ''}`}>
                {nameHint}
              </span>
            </label>

            <label className="field">
              <span>Description</span>
              <textarea
                className="input-field input-field--textarea"
                rows={4}
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Goals, scope, or deliverables for this project…"
                maxLength={500}
              />
              <span className="field__hint">{form.description.length}/500 characters</span>
            </label>

            <fieldset className="project-modal__themes">
              <legend>Card color</legend>
              <div className="project-modal__theme-grid">
                {THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    className={`project-modal__theme ${form.theme === theme.id ? 'is-active' : ''}`}
                    onClick={() => setForm((prev) => ({ ...prev, theme: theme.id }))}
                  >
                    <span className={`project-modal__theme-swatch ${theme.className}`} />
                    <span>{theme.label}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <footer className="project-modal__footer">
              <button type="button" className="btn btn--ghost" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn btn--primary" disabled={loading || !canSubmit}>
                {loading ? 'Creating…' : 'Create project'}
              </button>
            </footer>
          </form>

          <aside className="project-modal__preview" aria-hidden="true">
            <p className="project-modal__preview-label">Preview</p>
            <article className={`project-card project-modal__preview-card ${selectedTheme.className}`}>
              <div className="project-card__top">
                <span className="project-card__status">Active</span>
                <span className="project-card__count">0 tasks</span>
              </div>
              <h3>{previewName}</h3>
              <p>{previewDesc}</p>
              <div className="project-card__progress">
                <div className="project-card__bar" style={{ width: '8%' }} />
              </div>
              <footer className="project-card__footer">
                <span>0% complete</span>
                <span>by {user?.name?.split(' ')[0] || 'You'}</span>
              </footer>
            </article>
            <ul className="project-modal__tips muted">
              <li>After creating, you can add tasks on the project board.</li>
              <li>Assign collaborators when creating each task.</li>
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}
