import { readFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let pg;

try {
  pg = require("pg");
} catch {
  pg = require(path.resolve(process.cwd(), "..", "libro-vivo", "node_modules", "pg"));
}

async function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  const raw = await readFile(envPath, "utf8");

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

async function main() {
  await loadLocalEnv();

  const envVarName = String(process.argv[2] ?? "SUPABASE_DB_URL").trim() || "SUPABASE_DB_URL";
  const connectionString = String(process.env[envVarName] ?? "").trim();
  if (!connectionString) {
    throw new Error(`Falta ${envVarName} en .env.local`);
  }

  const parsed = new URL(connectionString);

  const client = new pg.Client({
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 5432,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, "") || "postgres",
    connectionTimeoutMillis: 5000,
    application_name: `libro-vivo-prod-check-db-connection-${envVarName.toLowerCase()}`,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    const result = await client.query(
      "select current_user, current_database(), now() at time zone 'utc' as utc_now",
    );
    console.log(
      JSON.stringify(
        {
          envVarName,
          ...result.rows[0],
        },
        null,
        2,
      ),
    );
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
