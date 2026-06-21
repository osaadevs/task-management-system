import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth, useRole } from '../context/AuthContext';
import KanbanBoard from '../components/KanbanBoard';
import TaskModal from '../components/TaskModal';

export default function Dashboard() {
  const { mustResetPassword } = useAuth();
  const { canManageTasks } = useRole();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [creating, setCreating] = useState(false);
  const [filters, setFilters] = useState({ status: '', priority: '' });

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

  if (mustResetPassword) {
    return <Navigate to="/reset-password" replace />;
  }

  return (
    <div className="dashboard">
      <div className="dashboard__toolbar">
        <div>
          <h2>Kanban Board</h2>
          <p className="muted">Drag-free workflow: To Do → In Progress → Completed</p>
        </div>

        <div className="dashboard__controls">
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
        <div className="loading-state">Loading tasks…</div>
      ) : (
        <KanbanBoard tasks={tasks} onOpenTask={setSelectedTask} />
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
