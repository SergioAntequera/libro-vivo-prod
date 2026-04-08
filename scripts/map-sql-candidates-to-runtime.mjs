import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const PROD_ROOT = process.cwd();
const REPORTS_DIR = path.resolve(PROD_ROOT, "reports");
const SQL_CLASSIFICATION_PATH = path.resolve(REPORTS_DIR, "sql-file-classification-2026-04-08.json");
const RUNTIME_USAGE_PATH = path.resolve(REPORTS_DIR, "runtime-supabase-usage-2026-04-08.json");
const JSON_REPORT_PATH = path.resolve(REPORTS_DIR, "sql-runtime-linkage-2026-04-08.json");
const MD_REPORT_PATH = path.resolve(PROD_ROOT, "docs", "SQL_RUNTIME_LINKAGE_2026_04_08.md");

function extractEntitiesFromSql(sqlText) {
  const tables = new Set();
  const functions = new Set();
  const buckets = new Set();

  const tablePatterns = [
    /create table(?: if not exists)?\s+public\.([a-zA-Z0-9_]+)/gi,
    /alter table\s+public\.([a-zA-Z0-9_]+)/gi,
    /insert into\s+public\.([a-zA-Z0-9_]+)/gi,
    /update\s+public\.([a-zA-Z0-9_]+)/gi,
    /delete from\s+public\.([a-zA-Z0-9_]+)/gi,
    /create policy\s+[a-zA-Z0-9_"]+\s+on\s+public\.([a-zA-Z0-9_]+)/gi,
    /drop policy(?: if exists)?\s+[a-zA-Z0-9_"]+\s+on\s+public\.([a-zA-Z0-9_]+)/gi,
    /create index(?: if not exists)?\s+[a-zA-Z0-9_"]+\s+on\s+public\.([a-zA-Z0-9_]+)/gi,
  ];

  const functionPatterns = [
    /create or replace function\s+public\.([a-zA-Z0-9_]+)/gi,
    /create function\s+public\.([a-zA-Z0-9_]+)/gi,
  ];

  for (const pattern of tablePatterns) {
    for (const match of sqlText.matchAll(pattern)) {
      tables.add(match[1]);
    }
  }

  for (const pattern of functionPatterns) {
    for (const match of sqlText.matchAll(pattern)) {
      functions.add(match[1]);
    }
  }

  for (const match of sqlText.matchAll(/bucket_id\s*=\s*'([a-zA-Z0-9._-]+)'/gi)) {
    buckets.add(match[1]);
  }

  if (/insert into\s+storage\.buckets/gi.test(sqlText)) {
    for (const match of sqlText.matchAll(/\(\s*'([a-zA-Z0-9._-]+)'\s*,\s*'([a-zA-Z0-9._-]+)'/gi)) {
      if (match[1] === match[2]) {
        buckets.add(match[1]);
      }
    }
  }

  return {
    tables: [...tables].sort(),
    functions: [...functions].sort(),
    buckets: [...buckets].sort(),
  };
}

function toMarkdown(report) {
  const lines = [];
  lines.push("# SQL Runtime Linkage");
  lines.push("");
  lines.push("Fecha: 2026-04-08");
  lines.push("");
  lines.push("Cruce entre SQL candidato y entidades realmente usadas por el runtime.");
  lines.push("");
  lines.push("## Resumen");
  lines.push("");
  lines.push(`- Candidatos analizados: ${report.files.length}`);
  lines.push(`- Con enlace runtime: ${report.files.filter((item) => item.runtimeLinked).length}`);
  lines.push(`- Sin enlace runtime: ${report.files.filter((item) => !item.runtimeLinked).length}`);
  lines.push("");
  lines.push("## Detalle");
  lines.push("");
  for (const item of report.files) {
    lines.push(`- \`${item.runtimeLinked ? "LINKED" : "UNLINKED"}\` [${item.path}](${item.absolutePath})`);
    lines.push(`  Tablas SQL: ${item.sqlTables.length ? item.sqlTables.join(", ") : "-"}`);
    lines.push(`  Funciones SQL: ${item.sqlFunctions.length ? item.sqlFunctions.join(", ") : "-"}`);
    lines.push(`  Buckets SQL: ${item.sqlBuckets.length ? item.sqlBuckets.join(", ") : "-"}`);
    lines.push(`  Runtime tables: ${item.runtimeTables.length ? item.runtimeTables.join(", ") : "-"}`);
    lines.push(`  Runtime RPC: ${item.runtimeFunctions.length ? item.runtimeFunctions.join(", ") : "-"}`);
    lines.push(`  Runtime buckets: ${item.runtimeBuckets.length ? item.runtimeBuckets.join(", ") : "-"}`);
  }
  return `${lines.join("\n")}\n`;
}

async function main() {
  const sqlClassification = JSON.parse(await readFile(SQL_CLASSIFICATION_PATH, "utf8"));
  const runtimeUsage = JSON.parse(await readFile(RUNTIME_USAGE_PATH, "utf8"));

  const runtimeTables = new Set(runtimeUsage.tables.map((item) => item.name));
  const runtimeRpcs = new Set(runtimeUsage.rpcs.map((item) => item.name));
  const runtimeBuckets = new Set(runtimeUsage.buckets.map((item) => item.name));

  const candidates = sqlClassification.files.filter((item) =>
    item.classification === "KEEP_CANDIDATE" || item.classification === "REVIEW",
  );

  const files = [];
  for (const candidate of candidates) {
    const sqlText = await readFile(candidate.absolutePath, "utf8");
    const entities = extractEntitiesFromSql(sqlText);
    const linkedTables = entities.tables.filter((name) => runtimeTables.has(name));
    const linkedFunctions = entities.functions.filter((name) => runtimeRpcs.has(name));
    const linkedBuckets = entities.buckets.filter((name) => runtimeBuckets.has(name));

    files.push({
      path: candidate.path,
      absolutePath: candidate.absolutePath,
      classification: candidate.classification,
      sqlTables: entities.tables,
      sqlFunctions: entities.functions,
      sqlBuckets: entities.buckets,
      runtimeTables: linkedTables,
      runtimeFunctions: linkedFunctions,
      runtimeBuckets: linkedBuckets,
      runtimeLinked: linkedTables.length > 0 || linkedFunctions.length > 0 || linkedBuckets.length > 0,
    });
  }

  files.sort((a, b) => {
    if (a.runtimeLinked !== b.runtimeLinked) {
      return a.runtimeLinked ? -1 : 1;
    }
    return a.path.localeCompare(b.path);
  });

  const report = {
    generatedAt: new Date().toISOString(),
    files,
  };

  await mkdir(REPORTS_DIR, { recursive: true });
  await writeFile(JSON_REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  await writeFile(MD_REPORT_PATH, toMarkdown(report), "utf8");

  console.log(`JSON: ${JSON_REPORT_PATH}`);
  console.log(`MD: ${MD_REPORT_PATH}`);
  console.log(
    JSON.stringify(
      {
        files: files.length,
        linked: files.filter((item) => item.runtimeLinked).length,
        unlinked: files.filter((item) => !item.runtimeLinked).length,
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
