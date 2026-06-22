const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

let io = null;

function initSocket(server, allowedOrigins) {
  io = new Server(server, {
    cors: { origin: allowedOrigins.length ? allowedOrigins : '*' },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error('Unauthorized'));
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return next(new Error('Unauthorized'));
      }
      socket.user = decoded;
      next();
    });
  });

  io.on('connection', (socket) => {
    socket.join(`user:${Number(socket.user.id)}`);
    console.log(`Socket connected: user ${socket.user.id}`);
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: user ${socket.user.id}`);
    });
  });

  return io;
}

function getIO() {
  return io;
}

function emitToUser(userId, event, payload) {
  if (!io) return;
  io.to(`user:${Number(userId)}`).emit(event, payload);
}

function emitTaskUpdated(taskId) {
  if (!io) return;
  io.emit('taskUpdated', { taskId, at: new Date().toISOString() });
}

module.exports = {
  initSocket,
  getIO,
  emitToUser,
  emitTaskUpdated,
};
