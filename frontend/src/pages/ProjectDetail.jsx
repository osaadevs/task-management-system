import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth, useRole } from '../context/AuthContext';
import KanbanBoard from '../components/KanbanBoard';
import TaskTableView from '../components/TaskTableView';
import TaskFilterBar from '../components/TaskFilterBar';
import TaskModal from '../components/TaskModal';
import ProjectStatsBar from '../components/ProjectStatsBar';
import { useTaskFilters } from '../hooks/useTaskFilters';
import { canDeleteProject } from '../utils/projectAccess';
import { ClipboardIcon } from '../components/Icons';

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { mustResetPassword, user } = useAuth();
  const { canManageTasks, role } = useRole();
  const [searchParams, setSearchParams] = useSearchParams();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [creating, setCreating] = useState(false);

  const filters = useTaskFilters(tasks);
  const displayedTasks = filters.filtered;

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
      const [projectRes, tasksRes] = await Promise.all([
        api.getProject(projectId),
        api.getTasks({ project_id: projectId }),
      ]);
      setProject(projectRes.data);
      setTasks(tasksRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const onTasksChanged = () => loadData({ silent: true });
    window.addEventListener('tms:tasks-changed', onTasksChanged);
    return () => window.removeEventListener('tms:tasks-changed', onTasksChanged);
  }, [loadData]);

  useEffect(() => {
    if (searchParams.get('create') === '1' && canManageTasks) {
      setCreating(true);
      const next = new URLSearchParams(searchParams);
      next.delete('create');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, canManageTasks, setSearchParams]);

  useEffect(() => {
    const taskId = searchParams.get('task');
    if (!taskId || loading) return;

    const task = tasks.find((item) => String(item.id) === String(taskId));
    if (!task) return;

    setSelectedTask(task);
    const next = new URLSearchParams(searchParams);
    next.delete('task');
    setSearchParams(next, { replace: true });
  }, [searchParams, tasks, loading, setSearchParams]);

  const handleStatusChange = async (task, status) => {
    if (task.status === status) return;

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
        prev.map((item) =>
          item.id === task.id ? { ...item, status: previousStatus } : item
        )
      );
      setError(err.message);
    }
  };

  const stats = useMemo(() => ({
    total: tasks.length,
    todo: tasks.filter((t) => t.status === 'To Do').length,
    inProgress: tasks.filter((t) => t.status === 'In Progress').length,
    done: tasks.filter((t) => t.status === 'Completed').length,
  }), [tasks]);

  const completionRate = stats.total
    ? Math.round((stats.done / stats.total) * 100)
    : 0;

  const showDelete = project && canDeleteProject(user, role, project);

  const handleDeleteProject = async () => {
    if (
      !project ||
      !window.confirm(
        `Permanently delete "${project.project_name}"? All tasks in this project will be removed.`
      )
    ) {
      return;
    }

    try {
      setError('');
      await api.deleteProject(project.id);
      window.dispatchEvent(new Event('tms:tasks-changed'));
      navigate('/projects', { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to delete project.');
    }
  };

  if (mustResetPassword) {
    return <Navigate to="/reset-password" replace />;
  }

  return (
    <div className="project-detail page-enter">
      <nav className="breadcrumb">
        <Link to="/projects">Projects</Link>
        <span aria-hidden="true">/</span>
        <span>{project?.project_name || '…'}</span>
      </nav>

      <header className="page-header page-header--hero">
        <div>
          <h1>{project?.project_name || 'Project'}</h1>
          <p className="muted">
            {project?.description || 'Manage tasks for this project.'}
          </p>
        </div>
        <div className="page-header__actions">
          <input
            className="search-input search-input--header"
            placeholder="Search tasks in this project…"
            value={filters.search}
            onChange={(e) => filters.setSearch(e.target.value)}
          />
          {canManageTasks && (
            <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
              + New Task
            </button>
          )}
          {showDelete && (
            <button
              type="button"
              className="btn btn--ghost btn--danger-text"
              onClick={handleDeleteProject}
            >
              Delete Project
            </button>
          )}
        </div>
      </header>

      {!loading && !error && (
        <ProjectStatsBar stats={stats} completionRate={completionRate} />
      )}

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

        <TaskFilterBar filters={filters} />
      </div>

      {error && <div className="alert alert--error">{error}</div>}

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
        filters.activeCount > 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon" aria-hidden="true"><ClipboardIcon size={40} /></span>
            <h3>No tasks match your filters</h3>
            <p className="muted">Try clearing the search or filters.</p>
            <button type="button" className="btn btn--ghost" onClick={filters.clear}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-state__icon" aria-hidden="true"><ClipboardIcon size={40} /></span>
            <h3>No tasks in this project</h3>
            <p className="muted">Add the first task to start tracking work.</p>
            {canManageTasks && (
              <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
                + Create Task
              </button>
            )}
          </div>
        )
      ) : viewMode === 'board' ? (
        <KanbanBoard
          tasks={displayedTasks}
          onOpenTask={setSelectedTask}
          onStatusChange={handleStatusChange}
          onAddTask={canManageTasks ? () => setCreating(true) : undefined}
        />
      ) : (
        <TaskTableView
          tasks={displayedTasks}
          onOpenTask={setSelectedTask}
          onStatusChange={handleStatusChange}
          canManageTasks={canManageTasks}
          filters={filters}
        />
      )}

      {(creating || selectedTask) && (
        <TaskModal
          task={creating ? null : selectedTask}
          defaultProjectId={Number(projectId)}
          lockProject
          onClose={() => {
            setCreating(false);
            setSelectedTask(null);
          }}
          onSaved={() => loadData({ silent: true })}
          onDeleted={() => loadData({ silent: true })}
        />
      )}
    </div>
  );
}
