import { useRef } from 'react';

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
}) {
  const didDrag = useRef(false);
  const assigneeList = formatAssignees(task);
  const overdue = isOverdue(task.due_date, task.status);
  const completed = task.status === 'Completed';

  const handleDragStart = (e) => {
    didDrag.current = true;
    onDragStart?.(e);
  };

  const handleDragEnd = (e) => {
    onDragEnd?.(e);
  };

  const handleClick = (e) => {
    if (didDrag.current) {
      didDrag.current = false;
      e.preventDefault();
      return;
    }
    onOpen(task);
  };

  return (
    <article
      className={`task-card task-card--${task.priority?.toLowerCase()} ${isDragging ? 'task-card--dragging' : ''} ${overdue ? 'task-card--overdue' : ''} ${completed ? 'task-card--done' : ''}`}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onOpen(task);
      }}
    >
      <div className={`task-card__accent task-card--${task.priority?.toLowerCase()}`} />
      <div className="task-card__top">
        <span className={`priority-badge ${PRIORITY_CLASS[task.priority] || ''}`}>
          {PRIORITY_LABEL[task.priority] || task.priority}
        </span>
      </div>
      <h3>{task.title}</h3>
      {task.description && <p>{task.description}</p>}
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
