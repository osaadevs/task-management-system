import { useMemo, useState } from 'react';
import TaskCard from './TaskCard';

const COLUMNS = [
  { status: 'To Do', accent: 'todo' },
  { status: 'In Progress', accent: 'progress' },
  { status: 'Completed', accent: 'done' },
];

export default function KanbanBoard({ tasks, onOpenTask, onStatusChange, onAddTask }) {
  const [draggingId, setDraggingId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  const grouped = useMemo(() => {
    return COLUMNS.reduce((acc, col) => {
      acc[col.status] = tasks.filter((task) => task.status === col.status);
      return acc;
    }, {});
  }, [tasks]);

  const clearDragState = () => {
    setDraggingId(null);
    setDropTarget(null);
  };

  const handleDrop = (status) => {
    if (!draggingId) return;
    const task = tasks.find((item) => item.id === draggingId);
    if (task && task.status !== status) {
      onStatusChange(task, status);
    }
    clearDragState();
  };

  return (
    <div className={`kanban ${draggingId ? 'kanban--dragging' : ''}`}>
      {COLUMNS.map(({ status, accent }) => (
        <section
          key={status}
          className={`kanban__column kanban__column--${accent} ${dropTarget === status ? 'kanban__column--drop' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setDropTarget(status);
          }}
          onDrop={(e) => {
            e.preventDefault();
            handleDrop(status);
          }}
        >
          <header>
            <div className="kanban__column-title">
              <span className={`kanban__dot kanban__dot--${accent}`} aria-hidden="true" />
              <h2>{status}</h2>
            </div>
            <span className="kanban__count">{grouped[status].length}</span>
          </header>
          <div className="kanban__list">
            {grouped[status].map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onOpen={onOpenTask}
                draggable
                isDragging={draggingId === task.id}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', String(task.id));
                  const card = e.currentTarget;
                  if (card) {
                    e.dataTransfer.setDragImage(card, card.offsetWidth / 2, 24);
                  }
                  setDraggingId(task.id);
                }}
                onDragEnd={clearDragState}
              />
            ))}
            {draggingId && dropTarget === status && (
              <div className="kanban__drop-placeholder" aria-hidden="true" />
            )}
            {grouped[status].length === 0 && !draggingId && (
              <div className="kanban__empty">
                <p>No tasks in this column</p>
              </div>
            )}
          </div>
          {onAddTask && status === 'To Do' && (
            <button type="button" className="kanban__add" onClick={onAddTask}>
              + Add Task
            </button>
          )}
        </section>
      ))}
    </div>
  );
}
