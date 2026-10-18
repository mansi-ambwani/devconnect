import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Hosted databases (Aiven, Neon, Azure) put "?sslmode=require" in their connection strings.
 * node-postgres would treat that as strict certificate checking, which fails on providers that use
 * their own certificate authority. When DB_SSL=true we remove it and use our own SSL setting instead.
 */
function connectionString(url, ssl) {
  if (!ssl) return url;
  try {
    const u = new URL(url);
    u.searchParams.delete('sslmode');
    return u.toString();
  } catch {
    return url;
  }
}

export const pool = new pg.Pool({
  connectionString: connectionString(config.databaseUrl, config.dbSsl),
  // Hosted databases require SSL. Locally (docker-compose) we turn it off.
  ssl: config.dbSsl ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
});

export const query = (text, params) => pool.query(text, params);

/** Creates tables if they don't exist. Runs automatically when the API starts. */
export async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
}

/** Waits for the database to accept connections (useful when Docker starts DB and API together). */
export async function waitForDb(retries = 15, delayMs = 2000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      console.log(`Waiting for database (attempt ${i}/${retries}): ${err.message}`);
      if (i === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}
