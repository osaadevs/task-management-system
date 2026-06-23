const PRIORITY_CLASS = {
  High: 'pill--danger',
  Medium: 'pill--warning',
  Low: 'pill--success',
};

export default function UpcomingTasks({ tasks, onOpenTask }) {
  const upcoming = [...tasks]
    .filter((t) => t.status !== 'Completed')
    .sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    })
    .slice(0, 5);

  return (
    <section className="bento-card bento-card--list">
      <header className="bento-card__header">
        <h3>Upcoming</h3>
        <span className="muted">{upcoming.length} tasks</span>
      </header>
      <ul className="upcoming-list">
        {upcoming.length === 0 ? (
          <li className="muted upcoming-list__empty">No upcoming tasks</li>
        ) : (
          upcoming.map((task) => (
            <li key={task.id}>
              <button type="button" className="upcoming-item" onClick={() => onOpenTask(task)}>
                <span>
                  <strong>{task.title}</strong>
                  <time>
                    {task.due_date
                      ? new Date(task.due_date).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'No due date'}
                  </time>
                </span>
                <span className={`pill ${PRIORITY_CLASS[task.priority] || 'pill--soft'}`}>
                  {task.priority}
                </span>
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
