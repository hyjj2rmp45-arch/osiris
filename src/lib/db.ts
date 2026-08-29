import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/osiris';
const pool = new Pool({ connectionString });

export const db = drizzle(pool);