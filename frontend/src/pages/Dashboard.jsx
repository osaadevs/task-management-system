import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import ProductivityChart from '../components/ProductivityChart';
import ProjectHealthCard from '../components/ProjectHealthCard';
import UpcomingTasks from '../components/UpcomingTasks';
import TeamWorkload from '../components/TeamWorkload';
import RecentProjects from '../components/RecentProjects';
import TaskModal from '../components/TaskModal';
import { FolderIcon, TargetIcon, CheckIcon, ClipboardIcon } from '../components/Icons';

export default function Dashboard() {
  const { mustResetPassword, user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);

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
    api.getTeamMembers().then((res) => setUsers(res.data || [])).catch(() => {});
  }, []);

  const stats = useMemo(() => ({
    total: tasks.length,
    todo: tasks.filter((t) => t.status === 'To Do').length,
    inProgress: tasks.filter((t) => t.status === 'In Progress').length,
    done: tasks.filter((t) => t.status === 'Completed').length,
  }), [tasks]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  if (mustResetPassword) {
    return <Navigate to="/reset-password" replace />;
  }

  return (
    <div className="dashboard page-enter">
      <header className="page-header page-header--hero">
        <div>
          <h1>
            {greeting}, {user?.name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="muted">
            {projects.length
              ? `You have ${projects.length} project${projects.length === 1 ? '' : 's'} and ${stats.total} tasks across your workspace.`
              : 'Create a project, then add tasks inside it.'}
          </p>
        </div>
      </header>

      {error && <div className="alert alert--error">{error}</div>}

      {!loading && !error && (
        <>
          <div className="stats-row">
            <StatCard label="Projects" value={projects.length} accent="indigo" icon={<FolderIcon size={22} />} />
            <StatCard label="Tasks Completed" value={stats.done} accent="green" icon={<CheckIcon size={22} />} />
            <StatCard label="Active Tasks" value={stats.inProgress} accent="blue" icon={<TargetIcon size={22} />} />
            <StatCard label="Total Tasks" value={stats.total} accent="slate" icon={<ClipboardIcon size={22} />} />
          </div>

          <RecentProjects projects={projects} />

          <div className="bento-grid">
            <ProductivityChart tasks={tasks} />
            <UpcomingTasks tasks={tasks} onOpenTask={setSelectedTask} />
            <ProjectHealthCard tasks={tasks} />
            <TeamWorkload tasks={tasks} users={users} />
          </div>
        </>
      )}

      {loading && (
        <div className="skeleton-board">
          {[1, 2, 3].map((col) => (
            <div key={col} className="skeleton-column">
              <div className="skeleton skeleton--title" />
              <div className="skeleton skeleton--card" />
            </div>
          ))}
        </div>
      )}

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onSaved={loadData}
          onDeleted={loadData}
        />
      )}
    </div>
  );
}
