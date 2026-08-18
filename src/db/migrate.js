const fs = require("fs").promises;
const path = require("path");
const { pool } = require("../config/db");

const migrationsPath = path.join(__dirname, "migrations");

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations(client) {
  const result = await client.query(
    "SELECT filename FROM schema_migrations ORDER BY filename",
  );
  return new Set(result.rows.map((row) => row.filename));
}

async function loadMigrations() {
  const files = await fs.readdir(migrationsPath);
  return files.filter((file) => file.endsWith(".sql")).sort();
}

async function runMigration(client, filename) {
  const filePath = path.join(migrationsPath, filename);
  const sql = await fs.readFile(filePath, "utf8");

  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query(
      "INSERT INTO schema_migrations(filename) VALUES ($1) ON CONFLICT DO NOTHING",
      [filename],
    );
    await client.query("COMMIT");
    console.log(`✅ Applied migration: ${filename}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function migrate() {
  const client = await pool.connect();
  try {
    const LOCK_KEY = 1234567890;
    await client.query("SELECT pg_advisory_lock($1)", [LOCK_KEY]);

    await ensureMigrationsTable(client);
    const applied = await getAppliedMigrations(client);
    const migrations = await loadMigrations();

    const pending = migrations.filter((filename) => !applied.has(filename));
    if (pending.length === 0) {
      console.log("No pending migrations. Database is up to date.");
      return;
    }

    for (const filename of pending) {
      await runMigration(client, filename);
    }
  } finally {
    try {
      const LOCK_KEY = 1234567890;
      await client.query("SELECT pg_advisory_unlock($1)", [LOCK_KEY]);
    } catch {
      // ignore unlock errors
    }
    client.release();
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
