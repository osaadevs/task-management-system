const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { verifyToken } = require('../middleware/authMiddleware');
const { blockIfMustResetPassword } = require('../middleware/requirePasswordReset');

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get notifications for the current user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification list
 */
router.get('/', verifyToken, blockIfMustResetPassword, notificationController.getNotifications);

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.get('/unread-count', verifyToken, blockIfMustResetPassword, notificationController.getUnreadCount);

router.patch('/read-all', verifyToken, blockIfMustResetPassword, notificationController.markAllAsRead);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/read', verifyToken, blockIfMustResetPassword, notificationController.markAsRead);

module.exports = router;
