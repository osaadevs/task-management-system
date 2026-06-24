import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth, useRole } from '../context/AuthContext';
import KanbanBoard from '../components/KanbanBoard';
import TaskTableView from '../components/TaskTableView';
import TaskModal from '../components/TaskModal';

export default function AllTasks() {
  const { mustResetPassword } = useAuth();
  const { canManageTasks } = useRole();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');

  const viewMode = searchParams.get('view') || 'board';

  const setViewMode = (mode) => {
    const next = new URLSearchParams(searchParams);
    next.set('view', mode);
    setSearchParams(next, { replace: true });
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [tasksRes, projectsRes] = await Promise.all([
        api.getTasks(),
        api.getProjects(),
      ]);
      setTasks(tasksRes.data || []);
      setProjects(projectsRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const onTasksChanged = () => loadData();
    window.addEventListener('tms:tasks-changed', onTasksChanged);
    return () => window.removeEventListener('tms:tasks-changed', onTasksChanged);
  }, [loadData]);

  const projectMap = useMemo(() => {
    const map = {};
    projects.forEach((p) => {
      map[p.id] = p.project_name || p.name;
    });
    return map;
  }, [projects]);

  const handleStatusChange = async (task, status) => {
    try {
      if (canManageTasks) {
        await api.updateTask(task.id, {
          title: task.title,
          description: task.description,
          due_date: task.due_date ? task.due_date.slice(0, 10) : null,
          priority: task.priority,
          status,
          assignee_ids: Array.isArray(task.assignees)
            ? task.assignees.map((a) => a.id)
            : [],
        });
      } else {
        await api.updateTask(task.id, { status });
      }
      await loadData();
      window.dispatchEvent(new Event('tms:tasks-changed'));
    } catch (err) {
      setError(err.message);
    }
  };

  const displayedTasks = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tasks
      .map((t) => ({ ...t, project_name: projectMap[t.project_id] }))
      .filter(
        (t) => projectFilter === 'all' || String(t.project_id) === String(projectFilter)
      )
      .filter(
        (t) =>
          !term ||
          t.title?.toLowerCase().includes(term) ||
          t.description?.toLowerCase().includes(term) ||
          t.project_name?.toLowerCase().includes(term)
      );
  }, [tasks, projectMap, search, projectFilter]);

  if (mustResetPassword) {
    return <Navigate to="/reset-password" replace />;
  }

  return (
    <div className="project-detail page-enter">
      <header className="page-header page-header--hero">
        <div>
          <h1>Tasks</h1>
          <p className="muted">
            {canManageTasks
              ? 'Every task across your workspace, by project.'
              : 'Tasks assigned to you across all projects.'}
          </p>
        </div>
        <div className="page-header__actions">
          <input
            className="search-input search-input--header"
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {canManageTasks && (
            <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
              + New Task
            </button>
          )}
        </div>
      </header>

      {error && <div className="alert alert--error">{error}</div>}

      <div className="filter-bar">
        <div className="view-toggle">
          <button
            type="button"
            className={viewMode === 'board' ? 'is-active' : ''}
            onClick={() => setViewMode('board')}
          >
            Board
          </button>
          <button
            type="button"
            className={viewMode === 'table' ? 'is-active' : ''}
            onClick={() => setViewMode('table')}
          >
            Table
          </button>
        </div>
        <select
          className="select-pill"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          aria-label="Filter by project"
        >
          <option value="all">All projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.project_name || project.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="skeleton-board">
          {[1, 2, 3].map((col) => (
            <div key={col} className="skeleton-column">
              <div className="skeleton skeleton--title" />
              <div className="skeleton skeleton--card" />
            </div>
          ))}
        </div>
      ) : displayedTasks.length === 0 && !error ? (
        <div className="empty-state">
          <h3>No tasks to show</h3>
          <p className="muted">
            {canManageTasks
              ? 'Create a task inside a project to see it here.'
              : 'You have no assigned tasks yet.'}
          </p>
        </div>
      ) : viewMode === 'board' ? (
        <KanbanBoard
          tasks={displayedTasks}
          onOpenTask={setSelectedTask}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <TaskTableView
          tasks={displayedTasks}
          onOpenTask={setSelectedTask}
          onStatusChange={handleStatusChange}
          canManageTasks={canManageTasks}
          showProject
        />
      )}

      {(creating || selectedTask) && (
        <TaskModal
          task={creating ? null : selectedTask}
          onClose={() => {
            setCreating(false);
            setSelectedTask(null);
          }}
          onSaved={loadData}
          onDeleted={loadData}
        />
      )}
    </div>
  );
}
