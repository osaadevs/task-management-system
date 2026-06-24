const socketService = {
  io: null,

  init(server) {
    const { Server } = require('socket.io');
    this.io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    this.io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      // User joins their own room (using their user ID)
      socket.on('join', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`User ${userId} joined their room`);
      });

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });
    });

    return this.io;
  },

  // Notify when a task is assigned to someone
  notifyTaskAssigned(userId, task) {
    if (this.io) {
      this.io.to(`user_${userId}`).emit('task_assigned', {
        message: `You have been assigned a new task: "${task.title}"`,
        task
      });
    }
  },

  // Notify when a task status changes
  notifyStatusChanged(userId, task) {
    if (this.io) {
      this.io.to(`user_${userId}`).emit('status_changed', {
        message: `Task "${task.title}" status changed to ${task.status}`,
        task
      });
    }
  },

  // Notify when someone comments on a task
  notifyComment(userId, taskTitle, commenterName) {
    if (this.io) {
      this.io.to(`user_${userId}`).emit('new_comment', {
        message: `${commenterName} commented on "${taskTitle}"`
      });
    }
  },

  // Notify when a deadline is approaching
  notifyDeadline(userId, task) {
    if (this.io) {
      this.io.to(`user_${userId}`).emit('deadline_approaching', {
        message: `Task "${task.title}" is due soon!`,
        task
      });
    }
  }
};

module.exports = socketService;