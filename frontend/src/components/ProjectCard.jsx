import { Link } from 'react-router-dom';
import { TrashIcon } from './Icons';

const GRADIENTS = ['gradient-blue', 'gradient-teal', 'gradient-purple'];

function progressPercent(project) {
  const total = Number(project.task_count) || 0;
  const done = Number(project.completed_count) || 0;
  if (!total) return 0;
  return Math.round((done / total) * 100);
}

export default function ProjectCard({ project, index = 0, onDelete, canDelete = false }) {
  const pct = progressPercent(project);
  const taskCount = Number(project.task_count) || 0;

  return (
    <div className="project-card-wrap">
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
          <div className="project-card__bar" style={{ width: `${pct}%` }} />
        </div>
        <footer className="project-card__footer">
          <span>{pct}% complete</span>
          <span>by {project.created_by_name || 'Team'}</span>
        </footer>
      </Link>
      {canDelete && onDelete && (
        <button
          type="button"
          className="icon-btn icon-btn--danger icon-btn--small project-card__delete"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete(project);
          }}
          aria-label={`Delete ${project.project_name}`}
          title="Delete project"
        >
          <TrashIcon size={14} />
        </button>
      )}
    </div>
  );
}
