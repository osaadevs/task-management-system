const db = require('../config/db');

const TaskModel = {

  getAllTasks: (filters, callback) => {
    let sql = `SELECT tasks.* 
               FROM tasks 
               WHERE 1=1`;
    const values = [];

    if (filters.status) {
      sql += ` AND tasks.status = ?`;
      values.push(filters.status);
    }

    if (filters.priority) {
      sql += ` AND tasks.priority = ?`;
      values.push(filters.priority);
    }

    const allowedSortFields = ['due_date', 'priority', 'status', 'created_at'];
    const sortBy = allowedSortFields.includes(filters.sortBy) ? filters.sortBy : 'created_at';
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${sortBy} ${sortOrder}`;

    db.query(sql, values, callback);
  },

  getTaskById: (id, callback) => {
    const sql = `SELECT * FROM tasks WHERE id = ?`;
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
      taskData.due_date,
      taskData.priority,
      taskData.status,
      taskData.created_by
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
      taskData.due_date,
      taskData.priority,
      taskData.status,
      id
    ];
    db.query(sql, values, callback);
  },

  deleteTask: (id, callback) => {
    const sql = `DELETE FROM tasks WHERE id = ?`;
    db.query(sql, [id], callback);
  },

  assignTask: (taskId, userId, callback) => {
    const sql = `INSERT INTO task_assignments (task_id, user_id) VALUES (?, ?)`;
    db.query(sql, [taskId, userId], callback);
  },

  getTaskAssignees: (taskId, callback) => {
    const sql = `SELECT users.id, users.full_name, users.email 
                 FROM task_assignments 
                 JOIN users ON task_assignments.user_id = users.id 
                 WHERE task_assignments.task_id = ?`;
    db.query(sql, [taskId], callback);
  }

};

module.exports = TaskModel;