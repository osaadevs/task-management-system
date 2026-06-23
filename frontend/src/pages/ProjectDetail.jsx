import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth, useRole } from '../context/AuthContext';
import KanbanBoard from '../components/KanbanBoard';
import TaskTableView from '../components/TaskTableView';
import TaskModal from '../components/TaskModal';
import StatCard from '../components/StatCard';
import CompletionGauge from '../components/CompletionGauge';
import { ClipboardIcon, TargetIcon, CheckIcon } from '../components/Icons';

export default function ProjectDetail() {
  const { projectId } = useParams();
  const { mustResetPassword } = useAuth();
  const { canManageTasks } = useRole();
  const [searchParams, setSearchParams] = useSearchParams();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');

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
      const [projectRes, tasksRes] = await Promise.all([
        api.getProject(projectId),
        api.getTasks({ project_id: projectId }),
      ]);
      setProject(projectRes.data);
      setTasks(tasksRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const onTasksChanged = () => loadData();
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
    if (!term) return tasks;
    return tasks.filter(
      (t) =>
        t.title?.toLowerCase().includes(term) ||
        t.description?.toLowerCase().includes(term)
    );
  }, [tasks, search]);

  const stats = useMemo(() => ({
    total: tasks.length,
    todo: tasks.filter((t) => t.status === 'To Do').length,
    inProgress: tasks.filter((t) => t.status === 'In Progress').length,
    done: tasks.filter((t) => t.status === 'Completed').length,
  }), [tasks]);

  const completionRate = stats.total
    ? Math.round((stats.done / stats.total) * 100)
    : 0;

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

      {!loading && !error && (
        <div className="stats-row stats-row--compact">
          <StatCard label="Total Tasks" value={stats.total} accent="indigo" icon={<ClipboardIcon size={22} />} />
          <StatCard label="In Progress" value={stats.inProgress} accent="blue" icon={<TargetIcon size={22} />} />
          <StatCard label="Completed" value={stats.done} accent="green" icon={<CheckIcon size={22} />} />
          <CompletionGauge percent={completionRate} label="Progress" />
        </div>
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
          onSaved={loadData}
          onDeleted={loadData}
        />
      )}
    </div>
  );
}
