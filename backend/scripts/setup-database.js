/**
 * Database setup via Prisma (PostgreSQL).
 *
 * Prerequisites in backend/.env:
 *   DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
 *
 * Usage:
 *   npm run db:setup
 */

const { execSync } = require('child_process');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is missing in backend/.env');
  console.error('\nRailway Postgres → Variables → copy DATABASE_URL or POSTGRES_URL');
  process.exit(1);
}

try {
  console.log('Pushing Prisma schema to PostgreSQL...');
  execSync('npx prisma db push', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

  console.log('Seeding database...');
  execSync('npx prisma db seed', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

  console.log('\nSetup complete.');
} catch (error) {
  console.error('Database setup failed.');
  process.exit(1);
}
