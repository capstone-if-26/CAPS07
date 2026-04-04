import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from './client';
import * as schema from './schema';

export const db = drizzle(sql, { schema });

export type DbClient = typeof db;