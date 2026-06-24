const db = require('../config/db');

const errorResponse = (res, statusCode, errorCode, message, description = null) => {
  return res.status(statusCode).json({ errorCode, message, description });
};

const AttachmentController = {

  getAttachmentsByTask: (req, res) => {
    const { task_id } = req.params;

    if (!task_id || isNaN(task_id)) {
      return errorResponse(res, 400, 'INVALID_TASK_ID', 'Invalid task ID', 'Task ID must be a valid number');
    }

    const sql = `SELECT attachments.*, users.full_name as uploaded_by_name 
                 FROM attachments 
                 JOIN users ON attachments.uploaded_by = users.id 
                 WHERE attachments.task_id = ?`;

    db.query(sql, [task_id], (err, results) => {
      if (err) {
        return errorResponse(res, 500, 'FETCH_ERROR', 'Failed to get attachments', err.message);
      }
      res.status(200).json({ success: true, data: results });
    });
  },

  addAttachment: (req, res) => {
    const { task_id, file_name, file_url } = req.body;
    const uploaded_by = req.user.id;

    if (!task_id || !file_name || !file_url) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'Missing required fields', 'task_id, file_name and file_url are required');
    }

    const sql = `INSERT INTO attachments (task_id, uploaded_by, file_name, file_url) 
                 VALUES (?, ?, ?, ?)`;

    db.query(sql, [task_id, uploaded_by, file_name, file_url], (err, result) => {
      if (err) {
        return errorResponse(res, 500, 'CREATE_ERROR', 'Failed to add attachment', err.message);
      }
      res.status(201).json({ success: true, message: 'Attachment added successfully', attachmentId: result.insertId });
    });
  },

  deleteAttachment: (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(id)) {
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
  }

};

module.exports = AttachmentController;