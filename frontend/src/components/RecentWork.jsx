const GRADIENTS = ['gradient-blue', 'gradient-teal', 'gradient-purple'];

function progressForStatus(status) {
  if (status === 'Completed') return 100;
  if (status === 'In Progress') return 55;
  return 15;
}

export default function RecentWork({ tasks, onOpenTask }) {
  const recent = [...tasks]
    .sort((a, b) => {
      const aDate = new Date(a.updated_at || a.created_at || 0);
      const bDate = new Date(b.updated_at || b.created_at || 0);
      return bDate - aDate;
    })
    .slice(0, 3);

  if (!recent.length) return null;

  return (
    <section className="recent-work">
      <header className="recent-work__header">
        <h3>Recent Work</h3>
        <span className="muted">{recent.length} active items</span>
      </header>
      <div className="recent-work__grid">
        {recent.map((task, index) => {
          const pct = progressForStatus(task.status);
          return (
            <button
              key={task.id}
              type="button"
              className={`recent-work__card ${GRADIENTS[index % GRADIENTS.length]}`}
              onClick={() => onOpenTask(task)}
            >
              <h4>{task.title}</h4>
              <p>{task.description?.slice(0, 72) || 'No description yet'}</p>
              <div className="recent-work__progress">
                <div className="recent-work__bar" style={{ width: `${pct}%` }} />
              </div>
              <span className="recent-work__pct">{pct}% done</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
