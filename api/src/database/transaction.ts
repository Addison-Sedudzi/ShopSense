import type { Pool, PoolClient } from 'pg';

/**
 * Runs fn inside a BEGIN/COMMIT transaction on a single acquired client, so every
 * statement fn issues shares one connection rather than being spread across the
 * pool — statements on different pooled connections would not see each other's
 * uncommitted writes and would not roll back together. Always releases the
 * client back to the pool, even if fn throws or the commit fails.
 */
export async function withTransaction<T>(
  pool: Pool,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
