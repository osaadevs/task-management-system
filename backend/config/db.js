const dns = require('dns');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const { getConnectionCandidates } = require('./dbConfig');

dns.setDefaultResultOrder('ipv4first');
dotenv.config();

let pool = null;
let activeConfigLabel = null;
let connecting = null;

const STALE_CONNECTION =
  /connection is in closed state|Connection terminated|ECONNRESET|ENOTFOUND|ETIMEDOUT|connection timeout/i;

function attachPoolErrorHandler(activePool) {
  activePool.on('error', (err) => {
    console.error('PostgreSQL pool error:', err.message);
    if (pool === activePool) {
      pool = null;
      activeConfigLabel = null;
    }
  });
}

async function connectWithFallback() {
  if (connecting) return connecting;

  connecting = (async () => {
    const candidates = getConnectionCandidates();

    for (const candidate of candidates) {
      const label = candidate.label || `${candidate.host}:${candidate.port}`;
      const config = {
        host: candidate.host,
        port: candidate.port,
        user: candidate.user,
        password: candidate.password,
        database: candidate.database,
        ssl: candidate.ssl ?? { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 10_000,
        keepAlive: true,
      };
      const testPool = new Pool(config);

      try {
        await testPool.query('SELECT 1 AS ok');
        if (pool) {
          await pool.end().catch(() => {});
        }
        pool = testPool;
        activeConfigLabel = label;
        attachPoolErrorHandler(testPool);
        console.log(`PostgreSQL connected via ${label}`);
        return pool;
      } catch (error) {
        console.error(`Database attempt failed (${label}): ${error.message}`);
        await testPool.end().catch(() => {});
      }
    }

    throw new Error('All database connection attempts failed');
  })();

  try {
    return await connecting;
  } finally {
    connecting = null;
  }
}

async function getPool() {
  if (!pool) {
    await connectWithFallback();
  }
  return pool;
}

async function runQuery(pgSql, params) {
  try {
    const activePool = await getPool();
    return await activePool.query(pgSql, params);
  } catch (err) {
    if (STALE_CONNECTION.test(err.message)) {
      pool = null;
      activeConfigLabel = null;
      const activePool = await connectWithFallback();
      return activePool.query(pgSql, params);
    }
    throw err;
  }
}

function toPgSql(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function isSelectQuery(sql) {
  return /^\s*select\b/i.test(sql);
}

function toMutationResult(result) {
  const row = result.rows[0];
  return {
    affectedRows: result.rowCount,
    insertId: row?.id,
    createdAt: row?.created_at,
  };
}

function query(sql, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = [];
  }

  const pgSql = toPgSql(sql);

  runQuery(pgSql, params)
    .then((result) => {
      if (isSelectQuery(sql)) {
        callback(null, result.rows);
        return;
      }
      callback(null, toMutationResult(result));
    })
    .catch((err) => callback(err));
}

const db = {
  query,
  promise: () => ({
    query: (sql, params = []) =>
      runQuery(toPgSql(sql), params).then((result) => [result.rows, result.fields]),
  }),
  connectWithFallback,
  getActiveConfigLabel: () => activeConfigLabel,
};

module.exports = db;
