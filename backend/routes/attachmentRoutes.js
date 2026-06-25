const express = require('express');
const router = express.Router();
const AttachmentController = require('../controllers/attachmentController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const canView = requireRole('Admin', 'Project Manager', 'Collaborator');
const canUpload = requireRole('Admin', 'Project Manager', 'Collaborator');
const canDelete = requireRole('Admin', 'Project Manager');

router.post(
  '/upload',
  verifyToken,
  canUpload,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        const message =
          err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 5 MB)' : err.message;
        return res.status(400).json({ errorCode: 'UPLOAD_ERROR', message });
      }
      next();
    });
  },
  AttachmentController.uploadAttachment
);

router.get('/download/:id', verifyToken, canView, AttachmentController.downloadAttachment);

router.delete('/:id', verifyToken, canDelete, AttachmentController.deleteAttachment);

router.get('/:task_id', verifyToken, canView, AttachmentController.getAttachmentsByTask);

router.post('/', verifyToken, canUpload, AttachmentController.addAttachment);

module.exports = router;
