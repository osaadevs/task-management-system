const NotificationModel = require('../models/notificationModel');
const { emitToUser, emitTaskUpdated } = require('./socketService');

function createNotification(userId, title, message, type = 'info', options = {}) {
  return new Promise((resolve, reject) => {
    NotificationModel.create({ userId, title, message, type }, (err, result) => {
      if (err) return reject(err);

      const payload = {
        id: result.insertId,
        userId,
        title,
        message,
        type,
        is_read: false,
        created_at: new Date().toISOString(),
      };

      emitToUser(userId, 'notification', payload);

      if (options.emitTaskUpdate) {
        emitTaskUpdated(options.taskId);
      }

      resolve(payload);
    });
  });
}

async function notifyUsers(userIds, title, message, type = 'info', options = {}) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  await Promise.all(
    uniqueIds.map((userId) => createNotification(userId, title, message, type, options))
  );
}

module.exports = {
  createNotification,
  notifyUsers,
};
