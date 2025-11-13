import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const { Pool } = pg;

export const pool = new Pool({
    host: 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    user: process.env.POSTGRES_USER || 'bankuser',
    password: process.env.POSTGRES_PASSWORD || 'bankpass',
    database: process.env.POSTGRES_DB || 'bankdb'
});

pool.on('connect', () => console.log('[Postgres] connected'));
pool.on('error', (err) => console.error('[Postgres] error', err.stack));
