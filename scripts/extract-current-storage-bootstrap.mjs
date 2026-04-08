import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pg = require("pg");

const PROD_ROOT = process.cwd();
const ENV_PATH = path.resolve(PROD_ROOT, ".env.local");
const OUTPUT_PATH = path.resolve(
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
    application_name: "libro-vivo-prod-extract-storage-bootstrap",
    connectionTimeoutMillis: 5000,
  };
}

function quoteIdent(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function quoteQualified(schemaName, objectName) {
  return `${quoteIdent(schemaName)}.${quoteIdent(objectName)}`;
}

function formatRole(roleName) {
  if (String(roleName).toUpperCase() === "PUBLIC") return "PUBLIC";
  return quoteIdent(roleName);
}

async function main() {
  await loadEnvFile(ENV_PATH);

  const connectionString = String(process.env.CURRENT_SUPABASE_DB_URL ?? "").trim();
  if (!connectionString) {
    throw new Error("Falta CURRENT_SUPABASE_DB_URL en .env.local");
  }

  const client = new pg.Client(buildPgConfig(connectionString));
  await client.connect();

  try {
    const bucketResult = await client.query(
      `
        select
          id,
          name,
          public,
          file_size_limit,
          allowed_mime_types
        from storage.buckets
        order by id;
      `,
    );

    const policyResult = await client.query(
      `
        select
          policyname,
          permissive,
          roles,
          cmd,
          qual,
          with_check
        from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
        order by policyname;
      `,
    );

    const lines = [];
    lines.push("-- Libro Vivo - bootstrap vivo de storage");
    lines.push("-- Fuente: proyecto Supabase actual en funcionamiento");
    lines.push("-- Generado automaticamente el 2026-04-08");
    lines.push("");

    if (bucketResult.rows.length) {
      const payload = JSON.stringify(bucketResult.rows);
      lines.push("-- Buckets");
      lines.push("-- -------");
      lines.push(
        `insert into ${quoteQualified("storage", "buckets")} ("id", "name", "public", "file_size_limit", "allowed_mime_types")`,
      );
      lines.push(`select "id", "name", "public", "file_size_limit", "allowed_mime_types"`);
      lines.push(
        `from json_populate_recordset(null::${quoteQualified("storage", "buckets")}, $storage_buckets$${payload}$storage_buckets$::json)`,
      );
      lines.push(
        "on conflict (id) do update set name = excluded.name, public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;",
      );
      lines.push("");
    }

    lines.push("-- Storage object policies");
    lines.push("-- ----------------------");
    lines.push(`alter table ${quoteQualified("storage", "objects")} enable row level security;`);
    for (const policy of policyResult.rows) {
      const roles =
        Array.isArray(policy.roles) && policy.roles.length
          ? ` to ${policy.roles.map((role) => formatRole(role)).join(", ")}`
          : "";
      const permissive = policy.permissive ? ` as ${policy.permissive}` : "";
      const cmd = policy.cmd && policy.cmd !== "*" ? ` for ${policy.cmd.toLowerCase()}` : "";
      const usingClause = policy.qual ? ` using (${policy.qual})` : "";
      const withCheckClause = policy.with_check
        ? ` with check (${policy.with_check})`
        : "";
      lines.push(`drop policy if exists ${quoteIdent(policy.policyname)} on ${quoteQualified("storage", "objects")};`);
      lines.push(
        `create policy ${quoteIdent(policy.policyname)} on ${quoteQualified("storage", "objects")}${permissive}${cmd}${roles}${usingClause}${withCheckClause};`,
      );
    }
    lines.push("");

    await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await writeFile(OUTPUT_PATH, `${lines.join("\n")}\n`, "utf8");

    console.log(
      JSON.stringify(
        {
          buckets: bucketResult.rows.length,
          policies: policyResult.rows.length,
          outputPath: path.relative(PROD_ROOT, OUTPUT_PATH).replace(/\\/g, "/"),
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
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
