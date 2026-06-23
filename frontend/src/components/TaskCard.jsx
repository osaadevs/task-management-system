const PRIORITY_CLASS = {
  Low: 'priority-low',
  Medium: 'priority-medium',
  High: 'priority-high',
};

const PRIORITY_LABEL = {
  Low: 'LOW',
  Medium: 'MED',
  High: 'HIGH',
};

const CATEGORY_TAG = {
  High: { label: 'Dev', className: 'tag--dev' },
  Medium: { label: 'Design', className: 'tag--design' },
  Low: { label: 'Ops', className: 'tag--ops' },
};

function formatAssignees(task) {
  const list = Array.isArray(task.assignees) ? task.assignees : [];
  if (!list.length) return null;
  return list.map((a) => a.full_name);
}

function isOverdue(dueDate, status) {
  if (!dueDate || status === 'Completed') return false;
  const due = new Date(dueDate);
  due.setHours(23, 59, 59, 999);
  return due < new Date();
}

function progressForStatus(status) {
  if (status === 'Completed') return { percent: 100, label: 'Completed', tone: 'done' };
  if (status === 'In Progress') return { percent: 65, label: 'In Progress', tone: 'progress' };
  return { percent: 20, label: 'To Do', tone: 'todo' };
}

function getInitials(name = '') {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function TaskCard({
  task,
  onOpen,
  draggable = false,
  isDragging = false,
  onDragStart,
  onDragEnd,
  style,
}) {
  const assigneeList = formatAssignees(task);
  const overdue = isOverdue(task.due_date, task.status);
  const completed = task.status === 'Completed';
  const category = CATEGORY_TAG[task.priority] || CATEGORY_TAG.Medium;
  const progress = progressForStatus(task.status);

  return (
    <article
      className={`task-card task-card--${task.priority?.toLowerCase()} ${isDragging ? 'task-card--dragging' : ''} ${overdue ? 'task-card--overdue' : ''} ${completed ? 'task-card--done' : ''}`}
      draggable={draggable}
      style={style}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(task)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onOpen(task);
      }}
    >
      <div className={`task-card__accent task-card--${task.priority?.toLowerCase()}`} />
      <div className="task-card__top">
        <span className={`task-card__tag ${category.className}`}>{category.label}</span>
        <span className={`priority-badge ${PRIORITY_CLASS[task.priority] || ''}`}>
          {PRIORITY_LABEL[task.priority] || task.priority}
        </span>
      </div>
      <h3>{task.title}</h3>
      {task.description && <p>{task.description}</p>}
      <div className="task-card__progress-wrap">
        <div className="task-card__progress-meta">
          <span className={`task-card__status-label task-card__status-label--${progress.tone}`}>
            {progress.label}
          </span>
          <span className="task-card__status-pill">{progress.percent}%</span>
        </div>
        <div className="task-card__progress">
          <div
            className={`task-card__progress-bar task-card__progress-bar--${progress.tone}`}
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>
      <footer className="task-card__footer">
        {task.due_date && (
          <time dateTime={task.due_date} className={overdue ? 'task-card__due--overdue' : ''}>
            {overdue ? 'Overdue: ' : ''}
            {new Date(task.due_date).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </time>
        )}
        {assigneeList && (
          <div className="task-card__avatars">
            {assigneeList.slice(0, 3).map((name) => (
              <span key={name} className="task-card__avatar" title={name}>
                {getInitials(name)}
              </span>
            ))}
          </div>
        )}
      </footer>
    </article>
  );
}
