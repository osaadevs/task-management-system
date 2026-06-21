const dotenv = require('dotenv');

dotenv.config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const db = require('./config/db');
const { hasDatabaseConfig } = require('./config/dbConfig');
const taskRoutes = require('./routes/taskRoutes');
const commentRoutes = require('./routes/commentRoutes');
const projectRoutes = require('./routes/projectRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: allowedOrigins.length ? allowedOrigins : '*' },
});

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true,
  })
);
app.use(express.json());

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/projects', projectRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Task Management System API is running!' });
});

app.get('/api/health', (req, res) => {
  if (!hasDatabaseConfig()) {
    return res.status(503).json({
      status: 'error',
      database: 'missing',
      message: 'Set DATABASE_URL or DB_HOST, DB_USER, DB_NAME on the server',
    });
  }

  db.query('SELECT 1 AS ok', (err) => {
    if (err) {
      return res.status(503).json({
        status: 'error',
        database: 'disconnected',
        message: 'Database connection failed',
        detail: err.message,
      });
    }

    res.json({
      status: 'ok',
      database: 'connected',
      connection: db.getActiveConfigLabel(),
      message: 'API and database are healthy',
    });
  });
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (hasDatabaseConfig()) {
      await db.connectWithFallback();
    }
  } catch (error) {
    console.error('Database initialization failed:', error.message);
  }

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`DATABASE_URL configured: ${Boolean(process.env.DATABASE_URL)}`);
    if (db.getActiveConfigLabel()) {
      console.log(`DB connected via: ${db.getActiveConfigLabel()}`);
    }
    console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
  });
}

startServer();