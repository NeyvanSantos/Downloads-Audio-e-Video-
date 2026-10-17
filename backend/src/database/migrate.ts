import 'dotenv/config';
import pool from './connection';
import { readFile } from 'fs/promises';
import path from 'path';

void (async () => {
  try {
    const migrationPath = path.resolve(__dirname, '../../src/database/migrations/001_create_downloads_table.sql');
    await pool.query(await readFile(migrationPath, 'utf8'));
    console.log('Database ready');
  } finally {
    await pool.end();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
