const dotenv = require('dotenv');

dotenv.config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const db = require('./config/db');
const { hasDatabaseConfig } = require('./config/dbConfig');
const { isEmailConfigured } = require('./utils/sendEmail');
const { initSocket } = require('./services/socketService');
const { notifyUsers } = require('./services/notificationService');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const taskRoutes = require('./routes/taskRoutes');
const commentRoutes = require('./routes/commentRoutes');
const projectRoutes = require('./routes/projectRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();
const server = http.createServer(app);

initSocket(server, allowedOrigins);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (/^http:\/\/localhost:\d+$/.test(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Taskora API is running!' });
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
      email: isEmailConfigured() ? 'configured' : 'not_configured',
      connection: db.getActiveConfigLabel(),
      message: 'API and database are healthy',
    });
  });
});

app.use((req, res) => {
  res.status(404).json({
    errorCode: 'NOT_FOUND',
    message: 'Route not found',
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    errorCode: 'INTERNAL_ERROR',
    message: 'Internal server error',
    description: err.message,
  });
});

const PORT = process.env.PORT || 5000;
const notifiedDeadlines = new Set();

async function checkUpcomingDeadlines() {
  if (!hasDatabaseConfig()) return;

  const sql = `
    SELECT t.id, t.title, t.due_date, ta.user_id
    FROM tasks t
    JOIN task_assignments ta ON ta.task_id = t.id
    WHERE t.status != 'Completed'
      AND t.due_date IS NOT NULL
      AND t.due_date <= CURRENT_DATE + INTERVAL '1 day'
      AND t.due_date >= CURRENT_DATE
  `;

  try {
    const [rows] = await db.promise().query(sql);
    for (const row of rows) {
      const key = `${row.id}-${row.user_id}-${row.due_date}`;
      if (notifiedDeadlines.has(key)) continue;
      notifiedDeadlines.add(key);
      await notifyUsers(
        [row.user_id],
        'Deadline approaching',
        `"${row.title}" is due on ${new Date(row.due_date).toLocaleDateString()}`,
        'deadline'
      );
    }
  } catch (error) {
    console.error('Deadline check failed:', error.message);
  }
}

async function startServer() {
  if (!process.env.JWT_SECRET) {
    console.warn('Warning: JWT_SECRET is not set');
  }

  try {
    if (hasDatabaseConfig()) {
      await db.connectWithFallback();
      setInterval(checkUpcomingDeadlines, 60 * 60 * 1000);
      checkUpcomingDeadlines();
    }
  } catch (error) {
    console.error('Database initialization failed:', error.message);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
    console.log(
      `Email (Resend): ${isEmailConfigured() ? 'configured' : 'NOT configured — set RESEND_API_KEY and EMAIL_FROM'}`
    );
  });
}

startServer();
