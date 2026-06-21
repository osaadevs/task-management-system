const PRIORITY_CLASS = {
  Low: 'priority-low',
  Medium: 'priority-medium',
  High: 'priority-high',
};

function formatAssignees(task) {
  const list = Array.isArray(task.assignees) ? task.assignees : [];
  if (!list.length) return null;
  return list.map((a) => a.full_name).join(', ');
}

export default function TaskCard({
  task,
  onOpen,
  draggable = false,
  isDragging = false,
  onDragStart,
  onDragEnd,
}) {
  const assignees = formatAssignees(task);

  return (
    <article
      className={`task-card ${isDragging ? 'task-card--dragging' : ''}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(task)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onOpen(task);
      }}
    >
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
        {assignees && <span className="task-card__assignee">{assignees}</span>}
      </div>
    </article>
  );
}
