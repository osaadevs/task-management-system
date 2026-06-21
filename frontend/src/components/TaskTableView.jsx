const PRIORITY_CLASS = {
  Low: 'priority-low',
  Medium: 'priority-medium',
  High: 'priority-high',
};

function formatAssignees(task) {
  if (!task.assignees || task.assignees === '[]') return 'Unassigned';
  const list = Array.isArray(task.assignees) ? task.assignees : [];
  if (!list.length) return 'Unassigned';
  return list.map((a) => a.full_name).join(', ');
}

export default function TaskTableView({ tasks, onOpenTask, onStatusChange, canManageTasks }) {
  return (
    <div className="table-wrap task-table">
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Due</th>
            <th>Assignees</th>
            <th>Project</th>
          </tr>
        </thead>
        <tbody>
          {tasks.length === 0 ? (
            <tr>
              <td colSpan={6} className="muted table-empty">
                No tasks match your filters
              </td>
            </tr>
          ) : (
            tasks.map((task) => (
              <tr key={task.id} className="task-table__row" onClick={() => onOpenTask(task)}>
                <td>
                  <strong>{task.title}</strong>
                  {task.description && <p className="muted table-desc">{task.description}</p>}
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <select
                    className="table-select"
                    value={task.status}
                    onChange={(e) => onStatusChange(task, e.target.value)}
                    disabled={!canManageTasks && false}
                  >
                    {['To Do', 'In Progress', 'Completed'].map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <span className={`priority-badge ${PRIORITY_CLASS[task.priority] || ''}`}>
                    {task.priority}
                  </span>
                </td>
                <td>{task.due_date ? new Date(task.due_date).toLocaleDateString() : '—'}</td>
                <td>{formatAssignees(task)}</td>
                <td>{task.project_id || '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
