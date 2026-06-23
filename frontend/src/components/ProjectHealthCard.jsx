export default function ProjectHealthCard({ tasks }) {
  const total = tasks.length || 1;
  const completed = tasks.filter((t) => t.status === 'Completed').length;
  const inProgress = tasks.filter((t) => t.status === 'In Progress').length;
  const todo = tasks.filter((t) => t.status === 'To Do').length;

  const completedPct = Math.round((completed / total) * 100);
  const progressPct = Math.round((inProgress / total) * 100);
  const todoPct = 100 - completedPct - progressPct;

  const optimal = Math.round(((completed + inProgress * 0.5) / total) * 100);

  return (
    <section className="bento-card bento-card--health">
      <header className="bento-card__header">
        <div>
          <h3>Project Health</h3>
          <p className="muted">Status breakdown</p>
        </div>
      </header>
      <div className="donut-wrap">
        <div
          className="donut"
          style={{
            background: `conic-gradient(
              var(--success) 0 ${completedPct}%,
              var(--primary) ${completedPct}% ${completedPct + progressPct}%,
              var(--warning) ${completedPct + progressPct}% 100%
            )`,
          }}
        >
          <div className="donut__center">
            <strong>{optimal}%</strong>
            <span>Optimal</span>
          </div>
        </div>
        <ul className="donut-legend">
          <li><span className="dot dot--green" /> On track ({completedPct}%)</li>
          <li><span className="dot dot--blue" /> In progress ({progressPct}%)</li>
          <li><span className="dot dot--amber" /> Backlog ({todoPct}%)</li>
        </ul>
      </div>
    </section>
  );
}
