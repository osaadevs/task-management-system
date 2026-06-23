import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth, useRole } from '../context/AuthContext';
import ProjectCard from '../components/ProjectCard';
import ProjectModal from '../components/ProjectModal';

export default function Projects() {
  const { mustResetPassword } = useAuth();
  const { canManageTasks } = useRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.getProjects();
      setProjects(response.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (searchParams.get('create') === '1' && canManageTasks) {
      setCreating(true);
      const next = new URLSearchParams(searchParams);
      next.delete('create');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, canManageTasks, setSearchParams]);

  const displayed = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return projects;
    return projects.filter(
      (p) =>
        p.project_name?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
    );
  }, [projects, search]);

  if (mustResetPassword) {
    return <Navigate to="/reset-password" replace />;
  }

  return (
    <div className="projects-page page-enter">
      <header className="page-header">
        <div>
          <h2>Projects</h2>
          <p className="muted">Each project contains its own tasks, board, and progress.</p>
        </div>
        <div className="page-header__actions">
          <input
            className="search-input search-input--header"
            placeholder="Search projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {canManageTasks && (
            <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
              + New Project
            </button>
          )}
        </div>
      </header>

      {error && <div className="alert alert--error">{error}</div>}

      {loading ? (
        <div className="projects-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton skeleton--card project-card-skeleton" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state__icon">📁</span>
          <h3>No projects yet</h3>
          <p className="muted">Create a project first, then add tasks inside it.</p>
          {canManageTasks && (
            <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
              + Create Project
            </button>
          )}
        </div>
      ) : (
        <div className="projects-grid">
          {displayed.map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index} />
          ))}
        </div>
      )}

      {creating && (
        <ProjectModal
          onClose={() => setCreating(false)}
          onSaved={() => loadProjects()}
        />
      )}
    </div>
  );
}
