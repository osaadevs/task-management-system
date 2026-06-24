const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { blockIfMustResetPassword } = require('../middleware/requirePasswordReset');

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: List all users (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get('/me', verifyToken, blockIfMustResetPassword, userController.getMyProfile);
router.patch('/me/password', verifyToken, blockIfMustResetPassword, userController.changeMyPassword);
router.get('/team', verifyToken, blockIfMustResetPassword, userController.getTeamMembers);
router.get('/', verifyToken, blockIfMustResetPassword, requireRole('Admin'), userController.getUsers);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a user (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', verifyToken, blockIfMustResetPassword, requireRole('Admin'), userController.createUser);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update a user (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', verifyToken, blockIfMustResetPassword, requireRole('Admin'), userController.updateUser);

/**
 * @swagger
 * /api/users/{id}/deactivate:
 *   patch:
 *     summary: Deactivate a user (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/deactivate', verifyToken, blockIfMustResetPassword, requireRole('Admin'), userController.deactivateUser);

/**
 * @swagger
 * /api/users/{id}/activate:
 *   patch:
 *     summary: Activate a user (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/activate', verifyToken, blockIfMustResetPassword, requireRole('Admin'), userController.activateUser);

module.exports = router;
