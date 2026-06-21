const dns = require('dns');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const { getConnectionCandidates } = require('./dbConfig');

dns.setDefaultResultOrder('ipv4first');
dotenv.config();

let pool = null;
let activeConfigLabel = null;

async function connectWithFallback() {
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
    };
    const testPool = new Pool(config);

    try {
      await testPool.query('SELECT 1 AS ok');
      if (pool) {
        await pool.end().catch(() => {});
      }
      pool = testPool;
      activeConfigLabel = label;
      console.log(`PostgreSQL connected via ${label}`);
      return pool;
    } catch (error) {
      console.error(`Database attempt failed (${label}): ${error.message}`);
      await testPool.end().catch(() => {});
    }
  }

  throw new Error('All database connection attempts failed');
}

function getPool() {
  if (!pool) {
    throw new Error('Database pool is not initialized');
  }
  return pool;
}

function toPgSql(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function isSelectQuery(sql) {
  return /^\s*select\b/i.test(sql);
}

function toMutationResult(result) {
  return {
    affectedRows: result.rowCount,
    insertId: result.rows[0]?.id,
  };
}

function query(sql, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = [];
  }

  const pgSql = toPgSql(sql);

  getPool()
    .query(pgSql, params)
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
      getPool()
        .query(toPgSql(sql), params)
        .then((result) => [result.rows, result.fields]),
  }),
  connectWithFallback,
  getActiveConfigLabel: () => activeConfigLabel,
};

module.exports = db;
