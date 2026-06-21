const NotificationModel = require('../models/notificationModel');
const { errorResponse } = require('../utils/errors');

exports.getNotifications = (req, res) => {
  NotificationModel.getByUserId(req.user.id, (err, results) => {
    if (err) {
      return errorResponse(res, 500, 'NOTIFICATION_FETCH_ERROR', 'Failed to load notifications', err.message);
    }
    res.json({ success: true, data: results });
  });
};

exports.markAsRead = (req, res) => {
  const { id } = req.params;

  NotificationModel.markAsRead(id, req.user.id, (err, result) => {
    if (err) {
      return errorResponse(res, 500, 'NOTIFICATION_UPDATE_ERROR', 'Failed to mark notification as read', err.message);
    }
    if (result.affectedRows === 0) {
      return errorResponse(res, 404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
    }
    res.json({ success: true, message: 'Notification marked as read' });
  });
};

exports.markAllAsRead = (req, res) => {
  NotificationModel.markAllAsRead(req.user.id, (err) => {
    if (err) {
      return errorResponse(res, 500, 'NOTIFICATION_UPDATE_ERROR', 'Failed to mark notifications as read', err.message);
    }
    res.json({ success: true, message: 'All notifications marked as read' });
  });
};

exports.getUnreadCount = (req, res) => {
  NotificationModel.getUnreadCount(req.user.id, (err, results) => {
    if (err) {
      return errorResponse(res, 500, 'NOTIFICATION_FETCH_ERROR', 'Failed to load unread count', err.message);
    }
    res.json({ success: true, count: results[0]?.count || 0 });
  });
};
