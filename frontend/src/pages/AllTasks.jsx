import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth, useRole } from '../context/AuthContext';
import KanbanBoard from '../components/KanbanBoard';
import TaskTableView from '../components/TaskTableView';
import TaskFilterBar from '../components/TaskFilterBar';
import TaskModal from '../components/TaskModal';
import ErrorRetry from '../components/ErrorRetry';
import LoadingState from '../components/LoadingState';
import { useTaskFilters } from '../hooks/useTaskFilters';

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

  const viewMode = searchParams.get('view') || 'board';

  const setViewMode = (mode) => {
    const next = new URLSearchParams(searchParams);
    next.set('view', mode);
    setSearchParams(next, { replace: true });
  };

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
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
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    // Background sync (no skeleton) when tasks change elsewhere or via socket.
    const onTasksChanged = () => loadData({ silent: true });
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

  // Attach project_name so the shared filter (search + project filter + table column) can use it.
  const tasksWithProject = useMemo(
    () => tasks.map((t) => ({ ...t, project_name: projectMap[t.project_id] })),
    [tasks, projectMap]
  );

  const filters = useTaskFilters(tasksWithProject, { withProject: true });
  const displayedTasks = filters.filtered;

  const handleStatusChange = async (task, status) => {
    if (task.status === status) return;

    // Optimistic: move the card immediately, sync in the background (no reload/skeleton).
    const previousStatus = task.status;
    setTasks((prev) =>
      prev.map((item) => (item.id === task.id ? { ...item, status } : item))
    );

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
      window.dispatchEvent(new Event('tms:tasks-changed'));
    } catch (err) {
      setTasks((prev) =>
        prev.map((item) => (item.id === task.id ? { ...item, status: previousStatus } : item))
      );
      setError(err.message);
    }
  };

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
            value={filters.search}
            onChange={(e) => filters.setSearch(e.target.value)}
          />
          {canManageTasks && (
            <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
              + New Task
            </button>
          )}
        </div>
      </header>

      {error && <ErrorRetry message={error} onRetry={() => loadData()} />}

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

        <TaskFilterBar filters={filters} projects={projects} />
      </div>

      {loading ? (
        <>
          <div className="kanban-scroll">
            <div className="skeleton-board">
            {[1, 2, 3].map((col) => (
              <div key={col} className="skeleton-column">
                <div className="skeleton skeleton--title" />
                <div className="skeleton skeleton--card" />
              </div>
            ))}
            </div>
          </div>
          <LoadingState label="Loading tasks…" />
        </>
      ) : displayedTasks.length === 0 && !error ? (
        filters.activeCount > 0 ? (
          <div className="empty-state">
            <h3>No tasks match your filters</h3>
            <p className="muted">Try clearing the search or filters.</p>
            <button type="button" className="btn btn--ghost" onClick={filters.clear}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="empty-state">
            <h3>No tasks to show</h3>
            <p className="muted">
              {canManageTasks
                ? 'Create a task inside a project to see it here.'
                : 'You have no assigned tasks yet.'}
            </p>
          </div>
        )
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
          filters={filters}
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
