const db = require('../config/db');

const NotificationModel = {
  create: (data, callback) => {
    const sql = `INSERT INTO notifications (user_id, title, message, type)
                 VALUES (?, ?, ?, ?)
                 RETURNING id, user_id, title, message, type, is_read, created_at`;
    db.query(sql, [data.userId, data.title, data.message, data.type], (err, result) => {
      if (err) return callback(err);
      callback(null, { insertId: result.insertId });
    });
  },

  getByUserId: (userId, callback) => {
    const sql = `SELECT id, user_id, title, message, type, is_read, created_at
                 FROM notifications
                 WHERE user_id = ?
                 ORDER BY created_at DESC
                 LIMIT 50`;
    db.query(sql, [userId], callback);
  },

  markAsRead: (id, userId, callback) => {
    const sql = `UPDATE notifications SET is_read = TRUE
                 WHERE id = ? AND user_id = ?`;
    db.query(sql, [id, userId], callback);
  },

  markAllAsRead: (userId, callback) => {
    const sql = `UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE`;
    db.query(sql, [userId], callback);
  },

  getUnreadCount: (userId, callback) => {
    const sql = `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = ? AND is_read = FALSE`;
    db.query(sql, [userId], callback);
  },
};

module.exports = NotificationModel;
