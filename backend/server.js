const dotenv = require('dotenv');
dotenv.config({ override: true });

// BE-8: fail fast. Without JWT_SECRET, jwt.verify throws on every request and
// tokens cannot be trusted — refuse to start rather than run in a broken state.
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Set it in the environment before starting the server.');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const db = require('./config/db');
const { hasDatabaseConfig } = require('./config/dbConfig');
const socketService = require('./services/socketService');
const { notifyUsers } = require('./services/notificationService');
const { globalLimiter } = require('./middleware/rateLimiters');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const taskRoutes = require('./routes/taskRoutes');
const commentRoutes = require('./routes/commentRoutes');
const projectRoutes = require('./routes/projectRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const attachmentRoutes = require('./routes/attachmentRoutes');
const { getEmailStatus } = require('./utils/sendEmail');

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();
const server = http.createServer(app);

// Trust the first proxy hop (Render/most PaaS) so express-rate-limit keys on the
// real client IP from X-Forwarded-For rather than the proxy's address.
app.set('trust proxy', 1);

socketService.init(server, { allowedOrigins });

// BE-7: security headers. CSP is disabled because this is a JSON API and Swagger
// UI (/api-docs) needs inline assets; the remaining helmet headers (HSTS,
// nosniff, frameguard, etc.) still apply. CORP is set to cross-origin so the
// separate frontend origin can consume the API.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use((req, res, next) => {
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);

      // Swagger UI on /api-docs sends Origin matching this API host.
      const host = req.get('host');
      if (host && (origin === `http://${host}` || origin === `https://${host}`)) {
        return callback(null, true);
      }

      // BE-17: only allow ad-hoc localhost origins outside production.
      if (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost:\d+$/.test(origin)) {
        return callback(null, true);
      }

      console.warn(`CORS blocked for origin: ${origin}`);
      return callback(null, false);
    },
    credentials: true,
  })(req, res, next);
});
app.use(express.json());

// BE-2: global rate limit on all routes (login gets a stricter limiter in authRoutes).
app.use(globalLimiter);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/attachments', attachmentRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Task Management System API is running!' });
});

app.get('/api/health', async (req, res) => {
  if (!hasDatabaseConfig()) {
    return res.status(503).json({
      status: 'error',
      database: 'missing',
      message: 'Set DATABASE_URL or DB_HOST, DB_USER, DB_NAME on the server',
    });
  }

  const respondHealthy = () =>
    res.json({
      status: 'ok',
      database: 'connected',
      connection: db.getActiveConfigLabel(),
      message: 'API and database are healthy',
    });

  const pingDatabase = () =>
    new Promise((resolve, reject) => {
      db.query('SELECT 1 AS ok', (err) => (err ? reject(err) : resolve()));
    });

  try {
    await pingDatabase();
    return respondHealthy();
  } catch (firstErr) {
    try {
      await db.connectWithFallback();
      await pingDatabase();
      return respondHealthy();
    } catch (secondErr) {
      return res.status(503).json({
        status: 'error',
        database: 'disconnected',
        message: 'Database connection failed',
        detail: secondErr.message,
      });
    }
  }
});

app.get('/api/health/email', (req, res) => {
  const email = getEmailStatus();
  res.json({
    status: email.configured ? 'ok' : 'missing',
    email,
    hint: email.configured
      ? email.usingSandboxFrom
        ? 'Using Resend sandbox sender. Only verified recipient emails will receive mail until vendra.best is verified in Resend.'
        : 'Email is configured.'
      : 'Set RESEND_API_KEY on Render. Optionally set EMAIL_FROM to Taskora <noreply@vendra.best>.',
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
    // BE-10: don't leak internals in production.
    description: process.env.NODE_ENV === 'production' ? null : err.message,
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

async function connectDatabaseWithRetry(attempts = 5) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await db.connectWithFallback();
      return;
    } catch (error) {
      lastError = error;
      console.error(
        `Database connection attempt ${attempt}/${attempts} failed: ${error.message}`
      );
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
      }
    }
  }

  throw lastError;
}

async function startServer() {
  try {
    if (hasDatabaseConfig()) {
      await connectDatabaseWithRetry();
      setInterval(checkUpcomingDeadlines, 60 * 60 * 1000);
      checkUpcomingDeadlines();
    }
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    console.error(
      'Tip: If you see ECONNRESET/timeout, your network may block port 5432. ' +
        'Use Docker Postgres (USE_LOCAL_DB=true) or run the frontend with: npm run dev:cloud'
    );
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Stop the other backend first:`);
      console.error(`  Get-NetTCPConnection -LocalPort ${PORT} | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`);
      process.exit(1);
    }
    throw err;
  });
}

startServer();