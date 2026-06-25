const NotificationModel = require('../models/notificationModel');
const { emitToUser, emitTaskUpdated } = require('./socketService');

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
          userId: normalizedUserId,
          title,
          message,
          type,
          task_id: taskId,
          project_id: projectId,
          is_read: false,
          created_at: result.createdAt || new Date().toISOString(),
        };

        emitToUser(normalizedUserId, 'notification', payload);
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
      emitTaskUpdated(options.taskId);
    }
    return;
  }

  await Promise.all(
    uniqueIds.map((userId) => createNotification(userId, title, message, type, meta))
  );

  if (options.emitTaskUpdate) {
    emitTaskUpdated(options.taskId);
  }
}

module.exports = {
  createNotification,
  notifyUsers,
};
