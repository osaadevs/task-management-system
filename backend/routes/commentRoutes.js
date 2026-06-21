const express = require('express');
const router = express.Router();
const CommentController = require('../controllers/commentController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { blockIfMustResetPassword } = require('../middleware/requirePasswordReset');

/**
 * @swagger
 * /api/comments/{task_id}:
 *   get:
 *     summary: Get all comments for a task
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:task_id', verifyToken, blockIfMustResetPassword, CommentController.getCommentsByTask);

/**
 * @swagger
 * /api/comments:
 *   post:
 *     summary: Add a comment to a task
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', verifyToken, blockIfMustResetPassword, CommentController.addComment);

/**
 * @swagger
 * /api/comments/{id}:
 *   delete:
 *     summary: Delete a comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  '/:id',
  verifyToken,
  blockIfMustResetPassword,
  requireRole('Admin', 'Project Manager'),
  CommentController.deleteComment
);

module.exports = router;
