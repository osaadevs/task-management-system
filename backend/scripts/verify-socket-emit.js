/**
 * Verifies socket emit helpers work when destructured (the bug that broke realtime).
 * Run: node scripts/verify-socket-emit.js
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'verify-socket-emit-secret';
process.env.NODE_ENV = 'test';

const http = require('http');
const socketService = require('../services/socketService');

const server = http.createServer();
socketService.init(server, { allowedOrigins: ['http://localhost:5173'] });

if (!socketService.io) {
  console.error('FAIL: socket io not initialized');
  process.exit(1);
}

const originalTo = socketService.io.to.bind(socketService.io);
const originalEmit = socketService.io.emit.bind(socketService.io);

let userRoomEmit = null;
let broadcastEmit = null;

socketService.io.to = (room) => ({
  emit: (event, payload) => {
    userRoomEmit = { room, event, payload };
  },
});

socketService.io.emit = (event, payload) => {
  broadcastEmit = { event, payload };
};

const { emitToUser, emitTaskUpdated } = require('../services/socketService');

emitToUser(42, 'notification', { title: 'Test' });
emitTaskUpdated(99);

if (!userRoomEmit || userRoomEmit.room !== 'user_42' || userRoomEmit.event !== 'notification') {
  console.error('FAIL: destructured emitToUser did not emit', userRoomEmit);
  process.exit(1);
}

if (!broadcastEmit || broadcastEmit.event !== 'taskUpdated' || broadcastEmit.payload.taskId !== 99) {
  console.error('FAIL: destructured emitTaskUpdated did not emit', broadcastEmit);
  process.exit(1);
}

console.log('PASS: realtime socket emits work when methods are destructured');
