export default function ProductivityChart({ tasks }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const counts = days.map((_, index) => {
    const dayIndex = (index + 1) % 7;
    return tasks.filter((task) => {
      if (!task.created_at) return false;
      const d = new Date(task.created_at);
      return d.getDay() === dayIndex;
    }).length;
  });
  const max = Math.max(...counts, 1);

  return (
    <section className="bento-card bento-card--chart">
      <header className="bento-card__header">
        <div>
          <h3>Team Productivity</h3>
          <p className="muted">Task activity by day</p>
        </div>
        <span className="pill pill--soft">Last 7 days</span>
      </header>
      <div className="bar-chart" role="img" aria-label="Weekly task activity chart">
        {days.map((label, i) => (
          <div key={label} className="bar-chart__col">
            <div
              className="bar-chart__bar"
              style={{ height: `${(counts[i] / max) * 100}%` }}
              title={`${counts[i]} tasks`}
            />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
