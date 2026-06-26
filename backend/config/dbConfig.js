const DEFAULT_PROJECT_REF = 'pxivckosjllfhzpzbqac';

const POOLER_HOSTS = [
  process.env.SUPABASE_POOLER_HOST,
  'aws-0-ap-southeast-1.pooler.supabase.com',
  'aws-1-ap-southeast-1.pooler.supabase.com',
].filter(Boolean);

function isRenderHost() {
  return Boolean(process.env.RENDER || process.env.RENDER_SERVICE_ID);
}

function parsePostgresUrl(url) {
  const parsed = new URL(url);
  return {
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    host: parsed.hostname,
    port: Number(parsed.port) || 5432,
    database: parsed.pathname.replace(/^\//, '') || 'postgres',
  };
}

function extractProjectRef(urlOrHost, user) {
  if (process.env.SUPABASE_PROJECT_REF) {
    return process.env.SUPABASE_PROJECT_REF;
  }

  const host = typeof urlOrHost === 'string' ? urlOrHost : urlOrHost.host;
  const hostMatch = host.match(/^db\.([^.]+)\.supabase\.co$/);
  if (hostMatch) return hostMatch[1];

  const userMatch = user?.match(/^postgres\.([^.]+)$/);
  if (userMatch) return userMatch[1];

  return DEFAULT_PROJECT_REF;
}

function shouldUsePooler(url, parsed) {
  if (parsed.host.includes('pooler.supabase.com')) return false;
  return (
    process.env.USE_SUPABASE_POOLER === 'true' ||
    process.env.SUPABASE_POOLER_URL ||
    isRenderHost()
  );
}

function buildPoolerAttempts(parsed) {
  const projectRef = extractProjectRef(parsed.host, parsed.user);
  const password = parsed.password;
  const database = parsed.database || 'postgres';

  // Session pooler (5432) only — transaction mode (6543) breaks parameterized queries
  // with node-pg on long-lived hosts like Render.
  return POOLER_HOSTS.map((host) => ({
    label: `${host}:5432 (session)`,
    host,
    port: 5432,
    user: `postgres.${projectRef}`,
    password,
    database,
  }));
}

function toPgConfig(parsed) {
  const isRemote = parsed.host !== 'localhost' && parsed.host !== '127.0.0.1';
  const useSsl = process.env.DB_SSL === 'true' || isRemote;

  return {
    host: parsed.host,
    port: parsed.port,
    user: parsed.user,
    password: parsed.password,
    database: parsed.database,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  };
}

function getConnectionCandidates() {
  const hasSplitConfig =
    process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME;

  if (hasSplitConfig) {
    const isRemote =
      process.env.DB_HOST !== 'localhost' &&
      process.env.DB_HOST !== '127.0.0.1';
    const useSsl = process.env.DB_SSL === 'true' || isRemote;

    return [
      {
        label: `${process.env.DB_HOST}:${process.env.DB_PORT || 5432}`,
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'postgres',
        ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      },
    ];
  }

  const databaseUrl =
    process.env.SUPABASE_POOLER_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_PRIVATE_URL;

  if (databaseUrl) {
    const parsed = parsePostgresUrl(databaseUrl);

    if (shouldUsePooler(databaseUrl, parsed)) {
      return buildPoolerAttempts(parsed);
    }

    return [toPgConfig(parsed)];
  }

  const isRemote =
    process.env.DB_HOST &&
    process.env.DB_HOST !== 'localhost' &&
    process.env.DB_HOST !== '127.0.0.1';
  const useSsl = process.env.DB_SSL === 'true' || isRemote;

  return [
    {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'tms_db',
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    },
  ];
}

function getPoolConfig() {
  return getConnectionCandidates()[0];
}

function hasDatabaseConfig() {
  return Boolean(
    process.env.DATABASE_URL ||
      process.env.SUPABASE_POOLER_URL ||
      process.env.POSTGRES_URL ||
      process.env.DATABASE_PRIVATE_URL ||
      (process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME)
  );
}

function normalizeDatabaseUrl(url) {
  if (!url) return url;
  const parsed = parsePostgresUrl(url);
  if (!shouldUsePooler(url, parsed)) return url;
  const attempt = buildPoolerAttempts(parsed)[0];
  return `postgresql://${attempt.user}:${encodeURIComponent(attempt.password)}@${attempt.host}:${attempt.port}/${attempt.database}`;
}

module.exports = {
  getPoolConfig,
  getConnectionCandidates,
  hasDatabaseConfig,
  normalizeDatabaseUrl,
};
