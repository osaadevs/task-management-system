import { useMemo } from 'react';
import TaskCard from './TaskCard';

const COLUMNS = ['To Do', 'In Progress', 'Completed'];

export default function KanbanBoard({ tasks, onOpenTask }) {
  const grouped = useMemo(() => {
    return COLUMNS.reduce((acc, status) => {
      acc[status] = tasks.filter((task) => task.status === status);
      return acc;
    }, {});
  }, [tasks]);

  return (
    <div className="kanban">
      {COLUMNS.map((status) => (
        <section key={status} className="kanban__column">
          <header>
            <h2>{status}</h2>
            <span>{grouped[status].length}</span>
          </header>
          <div className="kanban__list">
            {grouped[status].map((task) => (
              <TaskCard key={task.id} task={task} onOpen={onOpenTask} />
            ))}
            {grouped[status].length === 0 && (
              <p className="kanban__empty">No tasks here</p>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
