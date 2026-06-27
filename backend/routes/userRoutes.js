const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { blockIfMustResetPassword } = require('../middleware/requirePasswordReset');

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get the current user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 */
router.get('/me', verifyToken, blockIfMustResetPassword, userController.getMyProfile);

/**
 * @swagger
 * /api/users/me/password:
 *   patch:
 *     summary: Change the current user's password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Current password incorrect
 */
router.patch('/me/password', verifyToken, blockIfMustResetPassword, userController.changeMyPassword);

/**
 * @swagger
 * /api/users/team:
 *   get:
 *     summary: List active team members (emails visible to Admin/PM only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Team member list
 */
router.get('/team', verifyToken, blockIfMustResetPassword, userController.getTeamMembers);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: List all users (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User list
 */
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
 * /api/users/{id}/delete-impact:
 *   get:
 *     summary: Preview owned projects before deleting a user (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id/delete-impact', verifyToken, blockIfMustResetPassword, requireRole('Admin'), userController.getUserDeleteImpact);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Permanently delete a user (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', verifyToken, blockIfMustResetPassword, requireRole('Admin'), userController.deleteUser);

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
