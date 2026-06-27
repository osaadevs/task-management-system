const NotificationModel = require('../models/notificationModel');
const socketService = require('./socketService');

function createNotification(userId, title, message, type = 'info', meta = {}) {
  const normalizedUserId = Number(userId);
  const taskId = meta.taskId != null ? Number(meta.taskId) : null;
  const projectId = meta.projectId != null ? Number(meta.projectId) : null;

  return new Promise((resolve, reject) => {
    NotificationModel.create(
      { userId: normalizedUserId, title, message, type, taskId, projectId },
      (err, result) => {
        if (err) return reject(err);

        const payload = {
          id: result.insertId,
          // Contract: every socket notification carries recipientId (target user
          // id) so the client can drop payloads not meant for it (FE-1).
          recipientId: normalizedUserId,
          userId: normalizedUserId,
          title,
          message,
          type,
          task_id: taskId,
          project_id: projectId,
          is_read: false,
          created_at: result.createdAt || new Date().toISOString(),
        };

        socketService.emitToUser(normalizedUserId, 'notification', payload);
        resolve(payload);
      }
    );
  });
}

async function notifyUsers(userIds, title, message, type = 'info', options = {}) {
  const uniqueIds = [
    ...new Set(
      userIds
        .filter(Boolean)
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id))
    ),
  ];

  const meta = {
    taskId: options.taskId,
    projectId: options.projectId,
  };

  if (!uniqueIds.length) {
    if (options.emitTaskUpdate) {
      socketService.emitTaskUpdated(options.taskId);
    }
    return;
  }

  await Promise.all(
    uniqueIds.map((userId) => createNotification(userId, title, message, type, meta))
  );

  if (options.emitTaskUpdate) {
    socketService.emitTaskUpdated(options.taskId);
  }
}

module.exports = {
  createNotification,
  notifyUsers,
};
