import { readFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pg = require("pg");

const PROD_ROOT = process.cwd();
const ENV_PATH = path.resolve(PROD_ROOT, ".env.local");
const ALLOWLIST_PATH = path.resolve(
  PROD_ROOT,
  "supabase",
  "allowlists",
  "production-sql-allowlist-2026-04-08.txt",
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
    application_name: "libro-vivo-prod-bootstrap",
    connectionTimeoutMillis: 5000,
  };
}

async function main() {
  await loadEnvFile(ENV_PATH);

  const connectionString = String(process.env.SUPABASE_DB_URL ?? "").trim();
  if (!connectionString) {
    throw new Error("Falta SUPABASE_DB_URL en .env.local");
  }

  const allowlistRaw = await readFile(ALLOWLIST_PATH, "utf8");
  const files = allowlistRaw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((relPath) => path.resolve(PROD_ROOT, relPath));

  const client = new pg.Client(buildPgConfig(connectionString));
  const notices = [];
  client.on("notice", (notice) => {
    const message = String(notice?.message ?? "").trim();
    if (message) notices.push(message);
  });

  await client.connect();
  try {
    for (let index = 0; index < files.length; index += 1) {
      const absPath = files[index];
      const relPath = path.relative(PROD_ROOT, absPath).replace(/\\/g, "/");
      const sql = (await readFile(absPath, "utf8")).replace(/^\uFEFF/, "");
      console.log(`[${index + 1}/${files.length}] ${relPath}`);
      await client.query(sql);
    }
  } finally {
    await client.end().catch(() => {});
  }

  if (notices.length) {
    console.log("NOTICES:");
    for (const notice of notices) {
      console.log(`- ${notice}`);
    }
  }

  console.log("Allowlist SQL aplicada correctamente.");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
