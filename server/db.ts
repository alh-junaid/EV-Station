import { Pool as PgPool } from 'pg';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '@shared/schema';

if (!process.env.DATABASE_URL) {
    throw new Error(
        'DATABASE_URL must be set. Did you forget to provision a database?',
    );
}

const DATABASE_URL = process.env.DATABASE_URL;
const isLocal = /localhost|127\.0\.0\.1/.test(DATABASE_URL || '');

let poolImpl: any;
let dbImpl: any;

if (isLocal) {
    // Use node-postgres + drizzle node-postgres adapter for local Postgres
    poolImpl = new PgPool({ connectionString: DATABASE_URL });
    dbImpl = drizzlePg(poolImpl, { schema });
} else {
    // Use Neon serverless adapter for non-local (serverless) Neon databases
    neonConfig.webSocketConstructor = ws;
    poolImpl = new NeonPool({ connectionString: DATABASE_URL });
    dbImpl = drizzleNeon({ client: poolImpl, schema });
}

export const pool = poolImpl;
export const db = dbImpl;
