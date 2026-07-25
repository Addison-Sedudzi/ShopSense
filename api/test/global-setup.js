const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const CONTAINER_NAME = 'shopsense-e2e-postgres';
const DB_PORT = 15433;
const DATABASE_URL = `postgresql://postgres:test@localhost:${DB_PORT}/postgres`;

// Postgres has no built-in stand-in for Supabase's auth schema, and the real
// schema.sql references auth.users(id) directly (users.id mirrors it). This
// stub provides just enough — a bare id column — for that foreign key to
// resolve against a plain Postgres container; it is never used against the
// real Supabase database.
const AUTH_STUB_SQL = `
  create schema if not exists auth;
  create table if not exists auth.users (
    id uuid primary key
  );
`;

async function waitForPostgres(maxAttempts = 40) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const client = new Client({ connectionString: DATABASE_URL });
    try {
      await client.connect();
      await client.end();
      return;
    } catch {
      await client.end().catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error('Postgres test container did not become ready in time');
}

module.exports = async () => {
  try {
    execSync(`podman rm -f ${CONTAINER_NAME}`, { stdio: 'ignore' });
  } catch {
    // no leftover container from a previous run -- fine
  }

  execSync(
    `podman run --rm -d --name ${CONTAINER_NAME} -e POSTGRES_PASSWORD=test -p ${DB_PORT}:5432 docker.io/library/postgres:16-alpine`,
    { stdio: 'inherit' },
  );

  await waitForPostgres();

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    await client.query(AUTH_STUB_SQL);
    const schemaSql = fs.readFileSync(
      path.resolve(__dirname, '../../supabase/schema.sql'),
      'utf8',
    );
    await client.query(schemaSql);
  } finally {
    await client.end();
  }
};
