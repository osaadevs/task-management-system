const express = require('express');
const router = express.Router();
const AttachmentController = require('../controllers/attachmentController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

/**
 * @swagger
 * /api/attachments/{task_id}:
 *   get:
 *     summary: Get all attachments for a task
 *     tags: [Attachments]
 *     parameters:
 *       - in: path
 *         name: task_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of attachments
 */
router.get('/:task_id', verifyToken, requireRole('Admin', 'Project Manager', 'Collaborator'), AttachmentController.getAttachmentsByTask);

/**
 * @swagger
 * /api/attachments:
 *   post:
 *     summary: Add attachment to a task
 *     tags: [Attachments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - task_id
 *               - file_name
 *               - file_url
 *             properties:
 *               task_id:
 *                 type: integer
 *               file_name:
 *                 type: string
 *               file_url:
 *                 type: string
 *     responses:
 *       201:
 *         description: Attachment added successfully
 */
router.post('/', verifyToken, requireRole('Admin', 'Project Manager', 'Collaborator'), AttachmentController.addAttachment);

/**
 * @swagger
 * /api/attachments/{id}:
 *   delete:
 *     summary: Delete an attachment
 *     tags: [Attachments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Attachment deleted successfully
 */
router.delete('/:id', verifyToken, requireRole('Admin', 'Project Manager'), AttachmentController.deleteAttachment);

module.exports = router;