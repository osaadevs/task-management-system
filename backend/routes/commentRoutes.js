const express = require('express');
const router = express.Router();
const CommentController = require('../controllers/commentController');

// Get all comments for a task
router.get('/:task_id', CommentController.getCommentsByTask);

// Add comment to a task
router.post('/', CommentController.addComment);

// Delete comment
router.delete('/:id', CommentController.deleteComment);

module.exports = router;