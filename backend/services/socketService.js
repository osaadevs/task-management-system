const jwt = require('jsonwebtoken');

// Module-level io ref so emit helpers work when imported via destructuring
// (e.g. const { emitToUser } = require('./socketService')) — otherwise `this`
// is lost and realtime events are silently dropped after DB notifications save.
let io = null;

const socketService = {
  get io() {
    return io;
  },

  init(server, options = {}) {
    const allowedOrigins = options.allowedOrigins || [];
    const { Server } = require('socket.io');

    // DO-1: mirror the REST CORS allowlist instead of a wildcard on this authed
    // channel. No-origin (native clients) is allowed; localhost only outside prod.
    io = new Server(server, {
      cors: {
        origin(origin, callback) {
          if (!origin) return callback(null, true);
          if (allowedOrigins.includes(origin)) return callback(null, true);
          if (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost:\d+$/.test(origin)) {
            return callback(null, true);
          }
          return callback(new Error(`Socket CORS blocked for origin: ${origin}`));
        },
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    io.use((socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Unauthorized'));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = Number(decoded.id);
        if (!socket.userId) {
          return next(new Error('Unauthorized'));
        }
        next();
      } catch {
        next(new Error('Unauthorized'));
      }
    });

    io.on('connection', (socket) => {
      if (socket.userId) {
        socket.join(`user_${socket.userId}`);
      }

      socket.on('join', (userId) => {
        const roomId = Number(userId);
        if (roomId && roomId === socket.userId) {
          socket.join(`user_${roomId}`);
        }
      });

      socket.on('disconnect', () => {});
    });

    return io;
  },

  emitToUser(userId, event, payload) {
    if (!io || !userId) return;
    io.to(`user_${Number(userId)}`).emit(event, payload);
  },

  emitTaskUpdated(taskId) {
    if (!io) return;
    const payload = { taskId: taskId != null ? Number(taskId) : null };
    io.emit('taskUpdated', payload);
  },

  notifyTaskAssigned(userId, task) {
    this.emitToUser(userId, 'task_assigned', {
      message: `You have been assigned a new task: "${task.title}"`,
      task,
    });
  },

  notifyStatusChanged(userId, task) {
    this.emitToUser(userId, 'status_changed', {
      message: `Task "${task.title}" status changed to ${task.status}`,
      task,
    });
  },

  notifyComment(userId, taskTitle, commenterName) {
    this.emitToUser(userId, 'new_comment', {
      message: `${commenterName} commented on "${taskTitle}"`,
    });
  },

  notifyDeadline(userId, task) {
    this.emitToUser(userId, 'deadline_approaching', {
      message: `Task "${task.title}" is due soon!`,
      task,
    });
  },
};

module.exports = socketService;
