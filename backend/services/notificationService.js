const NotificationModel = require('../models/notificationModel');
const { emitToUser, emitTaskUpdated } = require('./socketService');

function createNotification(userId, title, message, type = 'info') {
  const normalizedUserId = Number(userId);

  return new Promise((resolve, reject) => {
    NotificationModel.create(
      { userId: normalizedUserId, title, message, type },
      (err, result) => {
        if (err) return reject(err);

        const payload = {
          id: result.insertId,
          userId: normalizedUserId,
          title,
          message,
          type,
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

  if (!uniqueIds.length) {
    if (options.emitTaskUpdate) {
      emitTaskUpdated(options.taskId);
    }
    return;
  }

  await Promise.all(
    uniqueIds.map((userId) => createNotification(userId, title, message, type))
  );

  if (options.emitTaskUpdate) {
    emitTaskUpdated(options.taskId);
  }
}

module.exports = {
  createNotification,
  notifyUsers,
};
