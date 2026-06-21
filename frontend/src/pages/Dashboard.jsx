import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth, useRole } from '../context/AuthContext';
import KanbanBoard from '../components/KanbanBoard';
import TaskTableView from '../components/TaskTableView';
import TaskModal from '../components/TaskModal';

export default function Dashboard() {
  const { mustResetPassword } = useAuth();
  const { canManageTasks } = useRole();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [creating, setCreating] = useState(false);
  const [viewMode, setViewMode] = useState('kanban');
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    assigned_to: '',
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.getTasks(filters);
      setTasks(response.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    const onTasksChanged = () => loadTasks();
    window.addEventListener('tms:tasks-changed', onTasksChanged);
    return () => window.removeEventListener('tms:tasks-changed', onTasksChanged);
  }, [loadTasks]);

  useEffect(() => {
    api.getTeamMembers().then((res) => setUsers(res.data || [])).catch(() => {});
  }, []);

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
      await loadTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  if (mustResetPassword) {
    return <Navigate to="/reset-password" replace />;
  }

  return (
    <div className="dashboard">
      <div className="dashboard__toolbar">
        <div>
          <h2>Task Workspace</h2>
          <p className="muted">Plan, assign, and track work in real time</p>
        </div>

        <div className="dashboard__controls">
          <div className="view-toggle">
            <button
              type="button"
              className={viewMode === 'kanban' ? 'is-active' : ''}
              onClick={() => setViewMode('kanban')}
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
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
          >
            <option value="">All statuses</option>
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>

          <select
            value={filters.priority}
            onChange={(e) => setFilters((prev) => ({ ...prev, priority: e.target.value }))}
          >
            <option value="">All priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>

          <select
            value={filters.assigned_to}
            onChange={(e) => setFilters((prev) => ({ ...prev, assigned_to: e.target.value }))}
          >
            <option value="">All assignees</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name || user.full_name}
              </option>
            ))}
          </select>

          <select
            value={filters.sortBy}
            onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value }))}
          >
            <option value="created_at">Sort: Created</option>
            <option value="due_date">Sort: Due date</option>
            <option value="priority">Sort: Priority</option>
            <option value="title">Sort: Title</option>
          </select>

          <select
            value={filters.sortOrder}
            onChange={(e) => setFilters((prev) => ({ ...prev, sortOrder: e.target.value }))}
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>

          <button type="button" className="btn btn--ghost" onClick={loadTasks}>
            Refresh
          </button>

          {canManageTasks && (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => setCreating(true)}
            >
              + New Task
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          Loading tasks…
        </div>
      ) : viewMode === 'kanban' ? (
        <KanbanBoard
          tasks={tasks}
          onOpenTask={setSelectedTask}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <TaskTableView
          tasks={tasks}
          onOpenTask={setSelectedTask}
          onStatusChange={handleStatusChange}
          canManageTasks={canManageTasks}
        />
      )}

      {(creating || selectedTask) && (
        <TaskModal
          task={creating ? null : selectedTask}
          onClose={() => {
            setCreating(false);
            setSelectedTask(null);
          }}
          onSaved={loadTasks}
          onDeleted={loadTasks}
        />
      )}
    </div>
  );
}
