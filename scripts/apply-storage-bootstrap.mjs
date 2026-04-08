import { readFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pg = require("pg");

const PROD_ROOT = process.cwd();
const ENV_PATH = path.resolve(PROD_ROOT, ".env.local");
const STORAGE_BOOTSTRAP_PATH = path.resolve(
  PROD_ROOT,
  "supabase",
  "baseline",
  "020_current_live_storage_bootstrap_2026_04_08.sql",
);

async function loadEnvFile(filePath) {
  const raw = await readFile(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function buildPgConfig(connectionString) {
  const parsed = new URL(connectionString);
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 5432,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, "") || "postgres",
    ssl: { rejectUnauthorized: false },
    application_name: "libro-vivo-prod-apply-storage-bootstrap",
    connectionTimeoutMillis: 5000,
  };
}

function stripTransactionWrappers(sql) {
  return sql
    .replace(/^\s*begin;\s*/i, "")
    .replace(/\s*commit;\s*$/i, "")
    .trim();
}

async function main() {
  await loadEnvFile(ENV_PATH);

  const connectionString = String(process.env.SUPABASE_DB_URL ?? "").trim();
  if (!connectionString) {
    throw new Error("Falta SUPABASE_DB_URL en .env.local");
  }

  const sql = stripTransactionWrappers(
    (await readFile(STORAGE_BOOTSTRAP_PATH, "utf8")).replace(/^\uFEFF/, ""),
  );

  const client = new pg.Client(buildPgConfig(connectionString));
  await client.connect();
  try {
    await client.query("begin");
    await client.query(sql);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end().catch(() => {});
  }

  console.log("Storage bootstrap aplicada correctamente.");
}

main().catch((error) => {
  let message = error instanceof Error ? error.message : String(error);
  if (/must be owner of table objects/i.test(message)) {
    message = `${message}\nUsa el SQL Editor con el archivo docs/STORAGE_POLICY_MANUAL_STEP_2026_04_08.md como guia.`;
  }
  console.error(message);
  process.exit(1);
});
