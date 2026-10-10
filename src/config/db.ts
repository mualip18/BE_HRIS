
import { Pool } from 'pg';

// ============================================================
// DATABASE CONFIGURATION
// LOCAL      : PostgreSQL di laptop
// PRODUCTION : PostgreSQL Railway melalui DATABASE_URL
// ============================================================

const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;

// Jangan biarkan Railway diam-diam memakai localhost.
if (isProduction && !databaseUrl) {
  throw new Error(
    'DATABASE_URL belum dikonfigurasi di Railway. ' +
    'Tambahkan reference variable dari layanan PostgreSQL.'
  );
}

const pool = databaseUrl && isProduction
  ? new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
  : new Pool({
      // Konfigurasi PostgreSQL lokal tetap dipertahankan.
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME || 'hris_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '123',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

// Log error koneksi yang terjadi setelah pool dibuat.
pool.on('error', (error) => {
  console.error('Unexpected database pool error:', error.message);
});

export default pool;
