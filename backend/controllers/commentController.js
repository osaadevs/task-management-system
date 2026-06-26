const CommentModel = require('../models/commentModel');
const TaskModel = require('../models/taskModel');
const { errorResponse } = require('../utils/errors');
const { canAccessTask } = require('../utils/taskAccess');
const { sanitizeText } = require('../utils/sanitize');
const { notifyUsers } = require('../services/notificationService');
const { emitTaskUpdated } = require('../services/socketService');

const CommentController = {
  getCommentsByTask: async (req, res) => {
    const { task_id } = req.params;

    if (!task_id || Number.isNaN(Number(task_id))) {
      return errorResponse(res, 400, 'INVALID_TASK_ID', 'Invalid task ID');
    }

    // RC-1: a Collaborator may only read comments on tasks they own/are assigned to.
    try {
      const access = await canAccessTask(task_id, req.user);
      if (!access.found) {
        return errorResponse(res, 404, 'TASK_NOT_FOUND', 'Task not found');
      }
      if (!access.allowed) {
        return errorResponse(res, 403, 'FORBIDDEN', 'You can only view comments on tasks assigned to you');
      }
    } catch (accessErr) {
      return errorResponse(res, 500, 'COMMENT_FETCH_ERROR', 'Failed to verify task access', accessErr.message);
    }

    CommentModel.getCommentsByTask(task_id, (err, results) => {
      if (err) {
        return errorResponse(res, 500, 'COMMENT_FETCH_ERROR', 'Failed to get comments', err.message);
      }
      res.status(200).json({ success: true, data: results });
    });
  },

  addComment: async (req, res) => {
    const { task_id, content } = req.body;

    if (!content || !content.trim()) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'Comment content is required');
    }

    if (!task_id) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'Task ID is required');
    }

    // RC-1: a Collaborator may only comment on tasks they own/are assigned to.
    try {
      const access = await canAccessTask(task_id, req.user);
      if (!access.found) {
        return errorResponse(res, 404, 'TASK_NOT_FOUND', 'Task not found');
      }
      if (!access.allowed) {
        return errorResponse(res, 403, 'FORBIDDEN', 'You can only comment on tasks assigned to you');
      }
    } catch (accessErr) {
      return errorResponse(res, 500, 'COMMENT_CREATE_ERROR', 'Failed to verify task access', accessErr.message);
    }

    const commentData = {
      task_id,
      user_id: req.user.id,
      content: sanitizeText(content), // BE-6: strip markup from stored rich-text
    };

    CommentModel.addComment(commentData, async (err, result) => {
      if (err) {
        return errorResponse(res, 500, 'COMMENT_CREATE_ERROR', 'Failed to add comment', err.message);
      }

      try {
        TaskModel.getTaskById(task_id, async (_, tasks) => {
          const taskTitle = tasks[0]?.title || `Task #${task_id}`;
          TaskModel.getAssigneeIds(task_id, async (_, assignees) => {
            const ids = (assignees || []).map((row) => row.user_id);
            if (tasks[0]?.created_by) ids.push(tasks[0].created_by);
            await notifyUsers(
              ids.filter((userId) => userId !== req.user.id),
              'New comment',
              `New comment on "${taskTitle}"`,
              'comment',
              { emitTaskUpdate: true, taskId: Number(task_id) }
            );
          });
        });
      } catch (notifyErr) {
        console.error('Comment notification error:', notifyErr.message);
        emitTaskUpdated(Number(task_id));
      }

      res.status(201).json({
        success: true,
        message: 'Comment added successfully',
        commentId: result.insertId,
      });
    });
  },

  deleteComment: (req, res) => {
    const { id } = req.params;
    CommentModel.deleteComment(id, (err, result) => {
      if (err) {
        return errorResponse(res, 500, 'COMMENT_DELETE_ERROR', 'Failed to delete comment', err.message);
      }
      if (result.affectedRows === 0) {
        return errorResponse(res, 404, 'COMMENT_NOT_FOUND', 'Comment not found');
      }
      res.status(200).json({ success: true, message: 'Comment deleted successfully' });
    });
  },
};

module.exports = CommentController;
