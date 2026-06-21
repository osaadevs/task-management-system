import { useMemo, useState } from 'react';
import TaskCard from './TaskCard';

const COLUMNS = ['To Do', 'In Progress', 'Completed'];

export default function KanbanBoard({ tasks, onOpenTask, onStatusChange }) {
  const [draggingId, setDraggingId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  const grouped = useMemo(() => {
    return COLUMNS.reduce((acc, status) => {
      acc[status] = tasks.filter((task) => task.status === status);
      return acc;
    }, {});
  }, [tasks]);

  const handleDrop = (status) => {
    if (!draggingId) return;
    const task = tasks.find((item) => item.id === draggingId);
    if (task && task.status !== status) {
      onStatusChange(task, status);
    }
    setDraggingId(null);
    setDropTarget(null);
  };

  return (
    <div className="kanban">
      {COLUMNS.map((status) => (
        <section
          key={status}
          className={`kanban__column ${dropTarget === status ? 'kanban__column--drop' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDropTarget(status);
          }}
          onDragLeave={() => setDropTarget(null)}
          onDrop={(e) => {
            e.preventDefault();
            handleDrop(status);
          }}
        >
          <header>
            <h2>{status}</h2>
            <span>{grouped[status].length}</span>
          </header>
          <div className="kanban__list">
            {grouped[status].map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onOpen={onOpenTask}
                draggable
                isDragging={draggingId === task.id}
                onDragStart={() => setDraggingId(task.id)}
                onDragEnd={() => {
                  setDraggingId(null);
                  setDropTarget(null);
                }}
              />
            ))}
            {grouped[status].length === 0 && (
              <p className="kanban__empty">Drop tasks here</p>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
