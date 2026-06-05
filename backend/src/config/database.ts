import { Pool } from 'pg';
import { env } from './env';

let pool: Pool | null = null;

if (!env.DB_MOCK) {
  pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle database client', err);
  });
} else {
  console.log('⚠️ Database Mock Mode Enabled. Database connections will not be established.');
}

export const db = {
  query: async (text: string, params?: any[]) => {
    if (env.DB_MOCK) {
      throw new Error('Database is in Mock Mode. Avoid calling db.query directly.');
    }
    if (!pool) {
      throw new Error('Database pool not initialized.');
    }
    return pool.query(text, params);
  },
  pool,
};
