const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway')
    ? { rejectUnauthorized: false }
    : false,
});

// Create tables on first run
async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          SERIAL PRIMARY KEY,
        username    TEXT UNIQUE NOT NULL,
        password    TEXT NOT NULL,
        key         TEXT UNIQUE NOT NULL,
        expiry_date BIGINT NOT NULL,
        created_at  BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS configs (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        configs    JSONB NOT NULL DEFAULT '{}',
        updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
        UNIQUE(user_id)
      );
    `);

    console.log('[db] tables ready');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDb };
