
import { Pool } from "pg";

const isProduction = process.env.NODE_ENV === "production";
const databaseUrl = process.env.DATABASE_URL;

if (isProduction && !databaseUrl) {
  throw new Error(
    "DATABASE_URL belum dikonfigurasi di Railway"
  );
}

const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
  : new Pool({
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME || "hris_db",
      user: process.env.DB_USER || "postgres",
      password:
        process.env.DB_PASSWORD ||
        process.env.DB_PASS ||
        "123456",
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

pool.on("error", (error: Error) => {
  console.error("[DATABASE POOL ERROR]", error.message);
});

async function diagnoseDatabase(): Promise<void> {
  let client;

  try {
    client = await pool.connect();

    const result = await client.query(`
      SELECT
        current_database() AS database_name,
        current_user AS database_user,
        current_schema() AS schema_name,
        current_setting('search_path') AS search_path,
        to_regclass('public.users') AS users_table,
        to_regclass('public.profiles') AS profiles_table,
        to_regclass('public.hris_employees') AS employee_table
    `);

    console.log(
      "[DATABASE DIAGNOSTIC]",
      JSON.stringify(result.rows[0])
    );
  } catch (error: unknown) {
    console.error(
      "[DATABASE DIAGNOSTIC FAILED]",
      error instanceof Error ? error.message : String(error)
    );
  } finally {
    client?.release();
  }
}

void diagnoseDatabase();

export default pool;
