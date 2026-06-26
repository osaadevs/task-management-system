const express = require('express');
const router = express.Router();
const ProjectController = require('../controllers/projectController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { blockIfMustResetPassword } = require('../middleware/requirePasswordReset');

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: Get all projects
 *     tags: [Projects]
 *     responses:
 *       200:
 *         description: List of projects
 */
router.get('/', verifyToken, blockIfMustResetPassword, requireRole('Admin', 'Project Manager', 'Collaborator'), ProjectController.getAllProjects);

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Get project by ID
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Project found
 *       404:
 *         description: Project not found
 */
router.get('/:id', verifyToken, blockIfMustResetPassword, requireRole('Admin', 'Project Manager', 'Collaborator'), ProjectController.getProjectById);

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 */
router.post('/', verifyToken, blockIfMustResetPassword, requireRole('Admin', 'Project Manager'), ProjectController.createProject);

/**
 * @swagger
 * /api/projects/{id}:
 *   delete:
 *     summary: Delete a project (Admin or owning Project Manager)
 *     tags: [Projects]
 */
router.delete('/:id', verifyToken, blockIfMustResetPassword, requireRole('Admin', 'Project Manager'), ProjectController.deleteProject);

module.exports = router;