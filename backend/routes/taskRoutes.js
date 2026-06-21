const express = require('express');
const router = express.Router();
const TaskController = require('../controllers/taskController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { blockIfMustResetPassword } = require('../middleware/requirePasswordReset');

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Get all tasks
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *       - in: query
 *         name: assigned_to
 *         schema:
 *           type: integer
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of tasks
 */
router.get('/', verifyToken, blockIfMustResetPassword, TaskController.getAllTasks);

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     summary: Get task by ID
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', verifyToken, blockIfMustResetPassword, TaskController.getTaskById);

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/',
  verifyToken,
  blockIfMustResetPassword,
  requireRole('Admin', 'Project Manager'),
  TaskController.createTask
);

/**
 * @swagger
 * /api/tasks/{id}:
 *   put:
 *     summary: Update a task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', verifyToken, blockIfMustResetPassword, TaskController.updateTask);

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: Delete a task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  '/:id',
  verifyToken,
  blockIfMustResetPassword,
  requireRole('Admin', 'Project Manager'),
  TaskController.deleteTask
);

module.exports = router;
