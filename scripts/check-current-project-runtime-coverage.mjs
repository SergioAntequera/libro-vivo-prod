import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const PROD_ROOT = process.cwd();
const SOURCE_ROOT = path.resolve(PROD_ROOT, "..", "libro-vivo");
const REPORTS_DIR = path.resolve(PROD_ROOT, "reports");
const RUNTIME_REPORT_PATH = path.resolve(REPORTS_DIR, "runtime-supabase-usage-2026-04-08.json");
const JSON_REPORT_PATH = path.resolve(REPORTS_DIR, "current-project-runtime-coverage-2026-04-08.json");
const MD_REPORT_PATH = path.resolve(PROD_ROOT, "docs", "CURRENT_PROJECT_RUNTIME_COVERAGE_2026_04_08.md");

const require = createRequire(import.meta.url);
const { createClient } = require(path.resolve(SOURCE_ROOT, "node_modules", "@supabase", "supabase-js"));

async function loadEnvFile(filePath) {
  const raw = await readFile(filePath, "utf8");
  const env = {};

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
    env[key] = value;
  }

  return env;
}

function toMarkdown(report) {
  const lines = [];
  lines.push("# Current Project Runtime Coverage");
  lines.push("");
  lines.push("Fecha: 2026-04-08");
  lines.push("");
  lines.push("Verificacion por API del proyecto Supabase actual usando `service_role`, sin depender de la password Postgres.");
  lines.push("");
  lines.push("## Resumen");
  lines.push("");
  lines.push(`- Tablas runtime comprobadas: ${report.tables.length}`);
  lines.push(`- Tablas accesibles: ${report.tables.filter((item) => item.status === "ok").length}`);
  lines.push(`- Tablas con error: ${report.tables.filter((item) => item.status !== "ok").length}`);
  lines.push(`- Buckets runtime comprobados: ${report.buckets.length}`);
  lines.push(`- Buckets existentes: ${report.buckets.filter((item) => item.status === "ok").length}`);
  lines.push(`- Buckets ausentes: ${report.buckets.filter((item) => item.status !== "ok").length}`);
  lines.push("");
  lines.push("## Tablas");
  lines.push("");
  for (const item of report.tables) {
    lines.push(`- \`${item.status}\` \`${item.name}\``);
    if (item.error) {
      lines.push(`  Error: ${item.error}`);
    }
  }
  lines.push("");
  lines.push("## Buckets");
  lines.push("");
  for (const item of report.buckets) {
    lines.push(`- \`${item.status}\` \`${item.name}\``);
    if (item.error) {
      lines.push(`  Error: ${item.error}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

async function main() {
  const sourceEnv = await loadEnvFile(path.resolve(SOURCE_ROOT, ".env.local"));
  const runtimeReport = JSON.parse(await readFile(RUNTIME_REPORT_PATH, "utf8"));

  const url = String(sourceEnv.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const serviceRole = String(sourceEnv.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

  if (!url || !serviceRole) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en ../libro-vivo/.env.local");
  }

  const admin = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const tableResults = [];
  for (const table of runtimeReport.tables) {
    const { error } = await admin.from(table.name).select("*", { head: true, count: "exact" });
    tableResults.push({
      name: table.name,
      status: error ? "error" : "ok",
      error: error?.message ?? null,
      references: table.files,
    });
  }

  const listBucketsResult = await admin.storage.listBuckets();
  const existingBucketNames = new Set((listBucketsResult.data ?? []).map((bucket) => bucket.name));
  const bucketResults = runtimeReport.buckets.map((bucket) => ({
    name: bucket.name,
    status: existingBucketNames.has(bucket.name) ? "ok" : "missing",
    error: existingBucketNames.has(bucket.name) ? null : "bucket no encontrado en storage.listBuckets()",
    references: bucket.files,
  }));

  const report = {
    generatedAt: new Date().toISOString(),
    sourceProjectUrl: url,
    tables: tableResults,
    buckets: bucketResults,
    listBucketsError: listBucketsResult.error?.message ?? null,
  };

  await mkdir(REPORTS_DIR, { recursive: true });
  await writeFile(JSON_REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  await writeFile(MD_REPORT_PATH, toMarkdown(report), "utf8");

  console.log(`JSON: ${JSON_REPORT_PATH}`);
  console.log(`MD: ${MD_REPORT_PATH}`);
  console.log(
    JSON.stringify(
      {
        tables_ok: tableResults.filter((item) => item.status === "ok").length,
        tables_error: tableResults.filter((item) => item.status !== "ok").length,
        buckets_ok: bucketResults.filter((item) => item.status === "ok").length,
        buckets_missing: bucketResults.filter((item) => item.status !== "ok").length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
