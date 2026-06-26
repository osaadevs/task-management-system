const db = require('../config/db');
const { canAccessTask } = require('../utils/taskAccess');

const errorResponse = (res, statusCode, errorCode, message, description = null) => {
  return res.status(statusCode).json({ errorCode, message, description });
};

const AttachmentController = {
  getAttachmentsByTask: async (req, res) => {
    const { task_id } = req.params;

    if (!task_id || Number.isNaN(Number(task_id))) {
      return errorResponse(res, 400, 'INVALID_TASK_ID', 'Invalid task ID', 'Task ID must be a valid number');
    }

    // RC-1 (BE-5): a Collaborator may only list attachments on tasks they own/are assigned to.
    try {
      const access = await canAccessTask(task_id, req.user);
      if (!access.found) {
        return errorResponse(res, 404, 'NOT_FOUND', 'Task not found', `No task found with ID ${task_id}`);
      }
      if (!access.allowed) {
        return errorResponse(res, 403, 'FORBIDDEN', 'You do not have access to this task', 'Attachments are visible only to assigned members');
      }
    } catch (accessErr) {
      return errorResponse(res, 500, 'FETCH_ERROR', 'Failed to verify task access', accessErr.message);
    }

    const sql = `SELECT attachments.id, attachments.task_id, attachments.uploaded_by,
                        attachments.file_name, attachments.file_url, attachments.file_mime,
                        attachments.file_size, attachments.uploaded_at,
                        users.full_name AS uploaded_by_name
                 FROM attachments
                 JOIN users ON attachments.uploaded_by = users.id
                 WHERE attachments.task_id = ?
                 ORDER BY attachments.uploaded_at DESC`;

    db.query(sql, [task_id], (err, results) => {
      if (err) {
        return errorResponse(res, 500, 'FETCH_ERROR', 'Failed to get attachments', err.message);
      }
      res.status(200).json({ success: true, data: results });
    });
  },

  uploadAttachment: async (req, res) => {
    const taskId = Number(req.body.task_id);
    const uploadedBy = req.user.id;
    const file = req.file;

    if (!taskId || Number.isNaN(taskId)) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'Invalid task ID', 'task_id is required');
    }

    if (!file) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'No file uploaded', 'A file is required');
    }

    // RC-1 (BE-5, write side): a Collaborator may only attach files to tasks they own/are assigned to.
    try {
      const access = await canAccessTask(taskId, req.user);
      if (!access.found) {
        return errorResponse(res, 404, 'NOT_FOUND', 'Task not found', `No task found with ID ${taskId}`);
      }
      if (!access.allowed) {
        return errorResponse(res, 403, 'FORBIDDEN', 'You can only attach files to tasks assigned to you');
      }
    } catch (accessErr) {
      return errorResponse(res, 500, 'CREATE_ERROR', 'Failed to verify task access', accessErr.message);
    }

    const fileName = file.originalname;
    const fileMime = file.mimetype || 'application/octet-stream';
    const fileSize = file.size;
    const fileUrl = 'stored';

    const sql = `INSERT INTO attachments (task_id, uploaded_by, file_name, file_url, file_data, file_mime, file_size)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 RETURNING id`;

    db.query(
      sql,
      [taskId, uploadedBy, fileName, fileUrl, file.buffer, fileMime, fileSize],
      (err, result) => {
        if (err) {
          return errorResponse(res, 500, 'CREATE_ERROR', 'Failed to upload attachment', err.message);
        }

        const attachmentId = result.insertId;
        res.status(201).json({
          success: true,
          message: 'Attachment uploaded successfully',
          attachmentId,
          file_name: fileName,
          file_mime: fileMime,
          file_size: fileSize,
        });
      }
    );
  },

  downloadAttachment: (req, res) => {
    const { id } = req.params;

    if (!id || Number.isNaN(Number(id))) {
      return errorResponse(res, 400, 'INVALID_ID', 'Invalid attachment ID', 'Attachment ID must be a valid number');
    }

    const sql = `SELECT task_id, file_name, file_mime, file_data FROM attachments WHERE id = ?`;

    db.query(sql, [id], async (err, results) => {
      if (err) {
        return errorResponse(res, 500, 'FETCH_ERROR', 'Failed to get attachment', err.message);
      }

      if (!results.length || !results[0].file_data) {
        return errorResponse(res, 404, 'NOT_FOUND', 'Attachment not found', `No file found with ID ${id}`);
      }

      // RC-1 (BE-5): close the download IDOR — authorize against the owning task,
      // not just the caller's role, before streaming the bytes.
      try {
        const access = await canAccessTask(results[0].task_id, req.user);
        if (!access.allowed) {
          return errorResponse(res, 403, 'FORBIDDEN', 'You do not have access to this attachment');
        }
      } catch (accessErr) {
        return errorResponse(res, 500, 'FETCH_ERROR', 'Failed to verify attachment access', accessErr.message);
      }

      const { file_name: fileName, file_data: fileData } = results[0];
      const safeName = fileName.replace(/[^\w.\-() ]+/g, '_');

      // BE-12: never serve a stored file with its original (possibly executable)
      // MIME type. Force a generic download type and stop content-type sniffing.
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
      res.send(fileData);
    });
  },

  addAttachment: async (req, res) => {
    const { task_id, file_name, file_url } = req.body;
    const uploaded_by = req.user.id;

    if (!task_id || !file_name || !file_url) {
      return errorResponse(
        res,
        400,
        'VALIDATION_ERROR',
        'Missing required fields',
        'task_id, file_name and file_url are required'
      );
    }

    // RC-1 (BE-5, write side): only members of the owning task may attach files.
    try {
      const access = await canAccessTask(task_id, req.user);
      if (!access.found) {
        return errorResponse(res, 404, 'NOT_FOUND', 'Task not found', `No task found with ID ${task_id}`);
      }
      if (!access.allowed) {
        return errorResponse(res, 403, 'FORBIDDEN', 'You can only attach files to tasks assigned to you');
      }
    } catch (accessErr) {
      return errorResponse(res, 500, 'CREATE_ERROR', 'Failed to verify task access', accessErr.message);
    }

    const sql = `INSERT INTO attachments (task_id, uploaded_by, file_name, file_url)
                 VALUES (?, ?, ?, ?)
                 RETURNING id`;

    db.query(sql, [task_id, uploaded_by, file_name, file_url], (err, result) => {
      if (err) {
        return errorResponse(res, 500, 'CREATE_ERROR', 'Failed to add attachment', err.message);
      }
      res.status(201).json({ success: true, message: 'Attachment added successfully', attachmentId: result.insertId });
    });
  },

  deleteAttachment: (req, res) => {
    const { id } = req.params;

    if (!id || Number.isNaN(Number(id))) {
      return errorResponse(res, 400, 'INVALID_ID', 'Invalid attachment ID', 'Attachment ID must be a valid number');
    }

    const sql = `DELETE FROM attachments WHERE id = ?`;

    db.query(sql, [id], (err, result) => {
      if (err) {
        return errorResponse(res, 500, 'DELETE_ERROR', 'Failed to delete attachment', err.message);
      }
      if (result.affectedRows === 0) {
        return errorResponse(res, 404, 'NOT_FOUND', 'Attachment not found', `No attachment found with ID ${id}`);
      }
      res.status(200).json({ success: true, message: 'Attachment deleted successfully' });
    });
  },
};

module.exports = AttachmentController;
