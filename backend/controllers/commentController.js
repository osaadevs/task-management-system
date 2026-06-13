const CommentModel = require('../models/commentModel');

const CommentController = {

  getCommentsByTask: (req, res) => {
    const { task_id } = req.params;
    CommentModel.getCommentsByTask(task_id, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to get comments', message: err.message });
      }
      res.status(200).json({ success: true, data: results });
    });
  },

  addComment: (req, res) => {
    const { task_id, user_id, content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    if (!task_id || !user_id) {
      return res.status(400).json({ error: 'Task ID and User ID are required' });
    }

    const commentData = { task_id, user_id, content };

    CommentModel.addComment(commentData, (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to add comment', message: err.message });
      }
      res.status(201).json({ success: true, message: 'Comment added successfully', commentId: result.insertId });
    });
  },

  deleteComment: (req, res) => {
    const { id } = req.params;
    CommentModel.deleteComment(id, (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete comment', message: err.message });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Comment not found' });
      }
      res.status(200).json({ success: true, message: 'Comment deleted successfully' });
    });
  }

};

module.exports = CommentController;