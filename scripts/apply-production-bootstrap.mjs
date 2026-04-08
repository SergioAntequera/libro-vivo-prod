import { readFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pg = require("pg");

const PROD_ROOT = process.cwd();
const ENV_PATH = path.resolve(PROD_ROOT, ".env.local");
const BASELINE_PATH = path.resolve(
  PROD_ROOT,
  "supabase",
  "baseline",
  "000_current_live_public_schema_2026_04_08.sql",
);
const SEED_DATA_PATH = path.resolve(
  PROD_ROOT,
  "supabase",
  "baseline",
  "010_current_live_public_seed_data_2026_04_08.sql",
);
const BASELINE_SECTIONS = [
  "Required extensions",
  "Tables",
  "Functions",
  "Column defaults",
  "Views",
  "Constraints",
  "Foreign keys",
  "Indexes",
  "Row level security",
  "Policies",
  "Triggers",
];

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
    application_name: "libro-vivo-prod-bootstrap-all",
    connectionTimeoutMillis: 5000,
  };
}

function parseBaselineSections(rawSql) {
  const sections = new Map(BASELINE_SECTIONS.map((title) => [title, []]));
  const lines = rawSql.replace(/\r\n/g, "\n").split("\n");
  let currentSection = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const nextLine = lines[index + 1] ?? "";
    const maybeTitle = line.startsWith("-- ") ? line.slice(3).trim() : "";

    if (
      BASELINE_SECTIONS.includes(maybeTitle) &&
      nextLine.startsWith("-- ") &&
      /^-+$/.test(nextLine.slice(3).trim())
    ) {
      currentSection = maybeTitle;
      index += 1;
      continue;
    }

    const trimmed = line.trim();
    if (!currentSection || !trimmed || trimmed === "begin;" || trimmed === "commit;") {
      continue;
    }

    sections.get(currentSection).push(line);
  }

  return sections;
}

function splitSimpleStatements(sql) {
  return sql
    .split(/;\s*\n/g)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => `${chunk};`);
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

  const baselineSql = (await readFile(BASELINE_PATH, "utf8")).replace(/^\uFEFF/, "");
  const baselineSections = parseBaselineSections(baselineSql);
  const seedDataSql = stripTransactionWrappers(
    (await readFile(SEED_DATA_PATH, "utf8")).replace(/^\uFEFF/, ""),
  );

  const client = new pg.Client(buildPgConfig(connectionString));
  const notices = [];
  client.on("notice", (notice) => {
    const message = String(notice?.message ?? "").trim();
    if (message) notices.push(message);
  });

  await client.connect();
  try {
    console.log(`[baseline] ${path.relative(PROD_ROOT, BASELINE_PATH).replace(/\\/g, "/")}`);
    await client.query("begin");

    for (const title of BASELINE_SECTIONS) {
      const sql = baselineSections.get(title)?.join("\n").trim() ?? "";
      if (!sql) continue;

      console.log(`[baseline:${title}]`);
      if (["Constraints", "Foreign keys", "Indexes", "Row level security", "Policies", "Triggers", "Column defaults", "Required extensions"].includes(title)) {
        const statements = splitSimpleStatements(sql);
        for (let index = 0; index < statements.length; index += 1) {
          try {
            await client.query(statements[index]);
          } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            err.message = `${title} statement ${index + 1}/${statements.length} failed: ${err.message}`;
            throw err;
          }
        }
      } else {
        await client.query(sql);
      }
    }

    console.log(`[seed] ${path.relative(PROD_ROOT, SEED_DATA_PATH).replace(/\\/g, "/")}`);
    await client.query(seedDataSql);

    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end().catch(() => {});
  }

  if (notices.length) {
    console.log("NOTICES:");
    for (const notice of notices) {
      console.log(`- ${notice}`);
    }
  }

  console.log("Baseline + seed data aplicadas correctamente.");
  console.log(
    "Siguiente paso: sincronizar buckets por API y ejecutar las policies de storage en SQL Editor.",
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
