import AvatarStack from './AvatarStack';

const PRIORITY_CLASS = {
  Low: 'priority-low',
  Medium: 'priority-medium',
  High: 'priority-high',
};

const STATUS_CLASS = {
  'To Do': 'status-todo',
  'In Progress': 'status-progress',
  Completed: 'status-done',
};

export default function TaskTableView({ tasks, onOpenTask, onStatusChange, canManageTasks, showProject = false }) {
  return (
    <div className="table-wrap task-table panel panel--flush">
      <table className="data-table">
        <thead>
          <tr>
            <th>Task</th>
            {showProject && <th>Project</th>}
            <th>Assignees</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Due date</th>
          </tr>
        </thead>
        <tbody>
          {tasks.length === 0 ? (
            <tr>
              <td colSpan={showProject ? 6 : 5} className="data-table__empty muted">
                No tasks match your filters
              </td>
            </tr>
          ) : (
            tasks.map((task) => {
              const assignees = Array.isArray(task.assignees) ? task.assignees : [];
              return (
                <tr
                  key={task.id}
                  className="data-table__row--clickable"
                  onClick={() => onOpenTask(task)}
                >
                  <td>
                    <strong className="data-table__title">{task.title}</strong>
                    {task.description && (
                      <p className="muted table-desc">{task.description}</p>
                    )}
                  </td>
                  {showProject && (
                    <td className="data-table__project">{task.project_name || '—'}</td>
                  )}
                  <td>
                    <AvatarStack assignees={assignees} />
                  </td>
                  <td>
                    <span className={`priority-badge ${PRIORITY_CLASS[task.priority] || ''}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <select
                      className={`table-select status-pill ${STATUS_CLASS[task.status] || ''}`}
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
                  <td className="data-table__date">
                    {task.due_date
                      ? new Date(task.due_date).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      <div className="table-footer muted">
        Showing {tasks.length} task{tasks.length === 1 ? '' : 's'}
      </div>
    </div>
  );
}
