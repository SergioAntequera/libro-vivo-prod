import { readFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pg = require("pg");
const { createClient } = require("@supabase/supabase-js");

const PROD_ROOT = process.cwd();
const ENV_PATH = path.resolve(PROD_ROOT, ".env.local");

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
    application_name: "libro-vivo-prod-sync-storage-buckets",
    connectionTimeoutMillis: 5000,
  };
}

async function main() {
  await loadEnvFile(ENV_PATH);

  const currentDbUrl = String(process.env.CURRENT_SUPABASE_DB_URL ?? "").trim();
  const supabaseUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

  if (!currentDbUrl) throw new Error("Falta CURRENT_SUPABASE_DB_URL en .env.local");
  if (!supabaseUrl) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL en .env.local");
  if (!serviceRoleKey) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en .env.local");

  const sourceDb = new pg.Client(buildPgConfig(currentDbUrl));
  await sourceDb.connect();

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const { rows: buckets } = await sourceDb.query(`
      select
        id,
        name,
        public,
        file_size_limit,
        allowed_mime_types
      from storage.buckets
      order by id;
    `);

    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) throw listError;

    const existingMap = new Map((existingBuckets ?? []).map((bucket) => [bucket.id, bucket]));
    const results = [];

    for (const bucket of buckets) {
      const buildOptions = (includeFileSizeLimit = true) => {
        const options = {
          public: Boolean(bucket.public),
        };

        if (includeFileSizeLimit && bucket.file_size_limit !== null) {
          options.fileSizeLimit = Number(bucket.file_size_limit);
        }

        if (bucket.allowed_mime_types !== null) {
          options.allowedMimeTypes = bucket.allowed_mime_types;
        }

        return options;
      };

      const runUpsert = async (options) => {
        if (existingMap.has(bucket.id)) {
          return supabase.storage.updateBucket(bucket.id, options);
        }
        return supabase.storage.createBucket(bucket.id, options);
      };

      let mode = "full";
      let { error } = await runUpsert(buildOptions(true));

      if (error && /maximum allowed size/i.test(String(error.message ?? ""))) {
        mode = "without-file-size-limit";
        ({ error } = await runUpsert(buildOptions(false)));
      }

      if (error) throw error;

      results.push({
        bucket: bucket.id,
        action: existingMap.has(bucket.id) ? "updated" : "created",
        mode,
      });
    }

    console.log(JSON.stringify(results, null, 2));
  } finally {
    await sourceDb.end().catch(() => {});
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
