const db = require('../config/db');

const CommentModel = {

  getCommentsByTask: (task_id, callback) => {
    const sql = `SELECT comments.*, users.name as user_name 
                 FROM comments 
                 LEFT JOIN users ON comments.user_id = users.id 
                 WHERE comments.task_id = ?`;
    db.query(sql, [task_id], callback);
  },

  addComment: (commentData, callback) => {
    const sql = `INSERT INTO comments (task_id, user_id, content) 
                 VALUES (?, ?, ?)`;
    const values = [
      commentData.task_id,
      commentData.user_id,
      commentData.content
    ];
    db.query(sql, values, callback);
  },

  deleteComment: (id, callback) => {
    const sql = `DELETE FROM comments WHERE id = ?`;
    db.query(sql, [id], callback);
  }

};

module.exports = CommentModel;