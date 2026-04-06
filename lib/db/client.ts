import { neon, NeonQueryFunction } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is missing.');
}

const globalForNeon = globalThis as unknown as {
  neonClient: NeonQueryFunction<boolean, boolean> | undefined;
};

export const sql = globalForNeon.neonClient ?? neon(databaseUrl);

if (process.env.NODE_ENV !== 'production') {
  globalForNeon.neonClient = sql;
}