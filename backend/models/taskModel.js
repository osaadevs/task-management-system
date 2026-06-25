const db = require('../config/db');

const TaskModel = {
  getAllTasks: (filters, callback) => {
    let sql = `
      SELECT tasks.*,
        COALESCE(
          (SELECT json_agg(json_build_object('id', u.id, 'full_name', u.full_name, 'email', u.email))
           FROM task_assignments ta2
           JOIN users u ON u.id = ta2.user_id
           WHERE ta2.task_id = tasks.id),
          '[]'::json
        ) AS assignees
      FROM tasks
      WHERE 1=1`;
    const values = [];

    if (filters.userRole === 'Collaborator') {
      sql += ` AND (
        tasks.created_by = ?
        OR EXISTS (
          SELECT 1 FROM task_assignments ta
          WHERE ta.task_id = tasks.id AND ta.user_id = ?
        )
      )`;
      values.push(filters.userId, filters.userId);
    }

    if (filters.status) {
      sql += ` AND tasks.status = ?`;
      values.push(filters.status);
    }

    if (filters.priority) {
      sql += ` AND tasks.priority = ?`;
      values.push(filters.priority);
    }

    if (filters.assigned_to) {
      sql += ` AND EXISTS (
        SELECT 1 FROM task_assignments ta3
        WHERE ta3.task_id = tasks.id AND ta3.user_id = ?
      )`;
      values.push(filters.assigned_to);
    }

    if (filters.project_id) {
      sql += ` AND tasks.project_id = ?`;
      values.push(filters.project_id);
    }

    const allowedSortFields = ['due_date', 'priority', 'status', 'created_at', 'title'];
    const sortBy = allowedSortFields.includes(filters.sortBy) ? filters.sortBy : 'created_at';
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
    sql += ` ORDER BY tasks.${sortBy} ${sortOrder}`;

    db.query(sql, values, callback);
  },

  getTaskById: (id, callback) => {
    const sql = `
      SELECT tasks.*,
        COALESCE(
          (SELECT json_agg(json_build_object('id', u.id, 'full_name', u.full_name, 'email', u.email))
           FROM task_assignments ta
           JOIN users u ON u.id = ta.user_id
           WHERE ta.task_id = tasks.id),
          '[]'::json
        ) AS assignees
      FROM tasks
      WHERE tasks.id = ?`;
    db.query(sql, [id], callback);
  },

  createTask: (taskData, callback) => {
    const sql = `INSERT INTO tasks
                 (title, description, project_id, due_date, priority, status, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 RETURNING id`;
    const values = [
      taskData.title,
      taskData.description,
      taskData.project_id,
      taskData.due_date || null,
      taskData.priority,
      taskData.status,
      taskData.created_by,
    ];
    db.query(sql, values, callback);
  },

  updateTask: (id, taskData, callback) => {
    const sql = `UPDATE tasks SET
                 title=?, description=?,
                 due_date=?, priority=?, status=?
                 WHERE id=?`;
    const values = [
      taskData.title,
      taskData.description,
      taskData.due_date || null,
      taskData.priority,
      taskData.status,
      id,
    ];
    db.query(sql, values, callback);
  },

  updateTaskStatus: (id, status, callback) => {
    const sql = `UPDATE tasks SET status = ? WHERE id = ?`;
    db.query(sql, [status, id], callback);
  },

  deleteTask: (id, callback) => {
    const sql = `DELETE FROM tasks WHERE id = ?`;
    db.query(sql, [id], callback);
  },

  assignTask: (taskId, userId, callback) => {
    const sql = `INSERT INTO task_assignments (task_id, user_id)
                 VALUES (?, ?)
                 ON CONFLICT (task_id, user_id) DO NOTHING`;
    db.query(sql, [taskId, userId], callback);
  },

  clearAssignments: (taskId, callback) => {
    const sql = `DELETE FROM task_assignments WHERE task_id = ?`;
    db.query(sql, [taskId], callback);
  },

  getTaskAssignees: (taskId, callback) => {
    const sql = `SELECT users.id, users.full_name, users.email
                 FROM task_assignments
                 JOIN users ON task_assignments.user_id = users.id
                 WHERE task_assignments.task_id = ?`;
    db.query(sql, [taskId], callback);
  },

  isUserAssigned: (taskId, userId, callback) => {
    const sql = `SELECT 1 FROM task_assignments WHERE task_id = ? AND user_id = ? LIMIT 1`;
    db.query(sql, [taskId, userId], callback);
  },

  getAssigneeIds: (taskId, callback) => {
    const sql = `SELECT user_id FROM task_assignments WHERE task_id = ?`;
    db.query(sql, [taskId], callback);
  },
};

module.exports = TaskModel;
