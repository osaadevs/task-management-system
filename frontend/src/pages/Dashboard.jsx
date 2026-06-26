import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth, useRole } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import CalendarCard from '../components/CalendarCard';
import ProjectHealthCard from '../components/ProjectHealthCard';
import UpcomingTasks from '../components/UpcomingTasks';
import TeamWorkload from '../components/TeamWorkload';
import RecentProjects from '../components/RecentProjects';
import TaskModal from '../components/TaskModal';
import ErrorRetry from '../components/ErrorRetry';
import LoadingState from '../components/LoadingState';
import { FolderSolidIcon, ActiveSolidIcon, CheckCircleSolidIcon, ClipboardSolidIcon } from '../components/Icons';

export default function Dashboard() {
  const { mustResetPassword, user } = useAuth();
  const { canManageTasks } = useRole();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);

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
    const onTasksChanged = () => loadData({ silent: true });
    window.addEventListener('tms:tasks-changed', onTasksChanged);
    return () => window.removeEventListener('tms:tasks-changed', onTasksChanged);
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

  const projectMap = useMemo(() => {
    const map = {};
    projects.forEach((p) => { map[p.id] = p.project_name || p.name; });
    return map;
  }, [projects]);

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

      {error && <ErrorRetry message={error} onRetry={() => loadData()} />}

      {!loading && !error && (
        <>
          <div className="stats-row">
            <StatCard label="Projects" value={projects.length} accent="primary" icon={<FolderSolidIcon size={44} />} />
            <StatCard label="Tasks Completed" value={stats.done} accent="green" icon={<CheckCircleSolidIcon size={44} />} />
            <StatCard label="Active Tasks" value={stats.inProgress} accent="blue" icon={<ActiveSolidIcon size={44} />} />
            <StatCard label="Total Tasks" value={stats.total} accent="amber" icon={<ClipboardSolidIcon size={44} />} />
          </div>

          <RecentProjects projects={projects} />

          <div className="bento-grid">
            <CalendarCard
              tasks={tasks}
              onOpenTask={setSelectedTask}
              projectMap={projectMap}
              title={canManageTasks ? 'Calendar' : 'My Calendar'}
              subtitle="Tasks by due date"
            />
            <UpcomingTasks tasks={tasks} onOpenTask={setSelectedTask} projectMap={projectMap} />
            <ProjectHealthCard
              tasks={tasks}
              subtitle={canManageTasks ? 'Across your workspace' : 'Your assigned tasks'}
            />
            {canManageTasks && <TeamWorkload tasks={tasks} users={users} />}
          </div>
        </>
      )}

      {loading && (
        <>
          <div className="skeleton-board">
            {[1, 2, 3].map((col) => (
              <div key={col} className="skeleton-column">
                <div className="skeleton skeleton--title" />
                <div className="skeleton skeleton--card" />
              </div>
            ))}
          </div>
          <LoadingState label="Loading dashboard…" />
        </>
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
