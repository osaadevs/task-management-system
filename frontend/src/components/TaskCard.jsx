const PRIORITY_CLASS = {
  Low: 'priority-low',
  Medium: 'priority-medium',
  High: 'priority-high',
};

export default function TaskCard({ task, onOpen }) {
  return (
    <article className="task-card" onClick={() => onOpen(task)}>
      <div className="task-card__top">
        <span className={`priority-badge ${PRIORITY_CLASS[task.priority] || ''}`}>
          {task.priority}
        </span>
        {task.due_date && (
          <time dateTime={task.due_date}>
            {new Date(task.due_date).toLocaleDateString()}
          </time>
        )}
      </div>
      <h3>{task.title}</h3>
      {task.description && <p>{task.description}</p>}
      <div className="task-card__meta">
        <span>#{task.id}</span>
        {task.project_id && <span>Project {task.project_id}</span>}
      </div>
    </article>
  );
}
