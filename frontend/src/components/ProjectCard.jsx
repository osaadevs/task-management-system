import { Link } from 'react-router-dom';

const GRADIENTS = ['gradient-blue', 'gradient-teal', 'gradient-purple'];

function progressPercent(project) {
  const total = Number(project.task_count) || 0;
  const done = Number(project.completed_count) || 0;
  if (!total) return 0;
  return Math.round((done / total) * 100);
}

export default function ProjectCard({ project, index = 0 }) {
  const pct = progressPercent(project);
  const taskCount = Number(project.task_count) || 0;

  return (
    <Link
      to={`/projects/${project.id}`}
      className={`project-card ${GRADIENTS[index % GRADIENTS.length]}`}
    >
      <div className="project-card__top">
        <span className="project-card__status">{project.status || 'Active'}</span>
        <span className="project-card__count">{taskCount} tasks</span>
      </div>
      <h3>{project.project_name}</h3>
      <p>{project.description?.slice(0, 100) || 'No description yet'}</p>
      <div className="project-card__progress">
        <div className="project-card__bar" style={{ width: `${Math.max(pct, taskCount ? 8 : 0)}%` }} />
      </div>
      <footer className="project-card__footer">
        <span>{pct}% complete</span>
        <span>by {project.created_by_name || 'Team'}</span>
      </footer>
    </Link>
  );
}
