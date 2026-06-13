const db = require('../config/db');

const TaskModel = {

  getAllTasks: (filters, callback) => {
    let sql = `SELECT tasks.*, users.name as assigned_to_name 
               FROM tasks 
               LEFT JOIN users ON tasks.assigned_to = users.id
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

    if (filters.assigned_to) {
      sql += ` AND tasks.assigned_to = ?`;
      values.push(filters.assigned_to);
    }

    db.query(sql, values, callback);
  },

  getTaskById: (id, callback) => {
    const sql = `SELECT tasks.*, users.name as assigned_to_name 
                 FROM tasks 
                 LEFT JOIN users ON tasks.assigned_to = users.id 
                 WHERE tasks.id = ?`;
    db.query(sql, [id], callback);
  },

  createTask: (taskData, callback) => {
    const sql = `INSERT INTO tasks 
                 (title, description, assigned_to, project_id, due_date, priority, status, created_by) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [
      taskData.title,
      taskData.description,
      taskData.assigned_to,
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
                 title=?, description=?, assigned_to=?, 
                 due_date=?, priority=?, status=? 
                 WHERE id=?`;
    const values = [
      taskData.title,
      taskData.description,
      taskData.assigned_to,
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
  }

};

module.exports = TaskModel;