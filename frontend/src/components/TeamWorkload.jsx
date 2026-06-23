function getInitials(name = '') {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function TeamWorkload({ tasks, users }) {
  const workload = users.map((user) => {
    const count = tasks.filter((task) => {
      const assignees = Array.isArray(task.assignees) ? task.assignees : [];
      return assignees.some((a) => a.id === user.id);
    }).length;
    const capacity = Math.min(100, count * 25);
    return { user, count, capacity };
  }).filter((row) => row.count > 0);

  const display = workload.length ? workload : users.slice(0, 4).map((user) => ({
    user,
    count: 0,
    capacity: 0,
  }));

  return (
    <section className="bento-card bento-card--workload">
      <header className="bento-card__header">
        <h3>Team Workload</h3>
        <span className="muted">Tasks per member</span>
      </header>
      <ul className="workload-list">
        {display.map(({ user, count, capacity }) => (
          <li key={user.id} className="workload-row">
            <span className="workload-row__user">
              <span className="table-assignee__avatar">{getInitials(user.name || user.full_name)}</span>
              {user.name || user.full_name}
            </span>
            <div className="workload-row__bar-wrap">
              <div
                className={`workload-row__bar ${capacity >= 80 ? 'is-high' : ''}`}
                style={{ width: `${Math.max(capacity, count ? 12 : 4)}%` }}
              />
            </div>
            <span className="workload-row__pct">{count} tasks</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
