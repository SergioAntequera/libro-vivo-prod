import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const PROD_ROOT = process.cwd();
const SOURCE_ROOT = path.resolve(PROD_ROOT, "..", "libro-vivo");
const TARGET_DIRS = ["src", "scripts"];
const REPORTS_DIR = path.resolve(PROD_ROOT, "reports");
const JSON_REPORT_PATH = path.resolve(REPORTS_DIR, "runtime-supabase-usage-2026-04-08.json");
const MD_REPORT_PATH = path.resolve(PROD_ROOT, "docs", "RUNTIME_SUPABASE_USAGE_2026_04_08.md");

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(absPath)));
      continue;
    }
    files.push(absPath);
  }

  return files;
}

function normalize(filePath) {
  return filePath.replace(/\\/g, "/");
}

function addHit(map, key, filePath) {
  const current = map.get(key) ?? { count: 0, files: new Set() };
  current.count += 1;
  current.files.add(filePath);
  map.set(key, current);
}

function toSortedArray(map) {
  return [...map.entries()]
    .map(([name, value]) => ({
      name,
      count: value.count,
      files: [...value.files].sort(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function toMarkdown(report) {
  const lines = [];
  lines.push("# Runtime Supabase Usage");
  lines.push("");
  lines.push("Fecha: 2026-04-08");
  lines.push("");
  lines.push("Inventario de tablas, RPC y buckets referenciados directamente por el codigo fuente.");
  lines.push("");
  lines.push("## Resumen");
  lines.push("");
  lines.push(`- Tablas: ${report.tables.length}`);
  lines.push(`- RPC: ${report.rpcs.length}`);
  lines.push(`- Buckets: ${report.buckets.length}`);
  lines.push("");

  const sections = [
    ["Tablas", report.tables],
    ["RPC", report.rpcs],
    ["Buckets", report.buckets],
  ];

  for (const [title, items] of sections) {
    lines.push(`## ${title}`);
    lines.push("");
    for (const item of items) {
      const refs = item.files.map((file) => `[${file}](${path.resolve(SOURCE_ROOT, file)})`).join(", ");
      lines.push(`- \`${item.name}\` (${item.count})`);
      lines.push(`  Referencias: ${refs}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const tables = new Map();
  const rpcs = new Map();
  const buckets = new Map();

  for (const dir of TARGET_DIRS) {
    const absDir = path.resolve(SOURCE_ROOT, dir);
    const files = await walk(absDir);

    for (const absFile of files) {
      if (!/\.(mjs|js|ts|tsx)$/.test(absFile)) continue;

      const relFile = normalize(path.relative(SOURCE_ROOT, absFile));
      const source = await readFile(absFile, "utf8");

      for (const match of source.matchAll(/\.from\(\s*["'`]([a-zA-Z0-9._-]+)["'`]\s*\)/g)) {
        addHit(tables, match[1], relFile);
      }

      for (const match of source.matchAll(/\.rpc\(\s*["'`]([a-zA-Z0-9._-]+)["'`]\s*[,)]/g)) {
        addHit(rpcs, match[1], relFile);
      }

      for (const match of source.matchAll(/storage\.from\(\s*["'`]([a-zA-Z0-9._-]+)["'`]\s*\)/g)) {
        addHit(buckets, match[1], relFile);
      }
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    sourceRoot: SOURCE_ROOT,
    tables: toSortedArray(tables),
    rpcs: toSortedArray(rpcs),
    buckets: toSortedArray(buckets),
  };

  await mkdir(REPORTS_DIR, { recursive: true });
  await writeFile(JSON_REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  await writeFile(MD_REPORT_PATH, toMarkdown(report), "utf8");

  console.log(`JSON: ${JSON_REPORT_PATH}`);
  console.log(`MD: ${MD_REPORT_PATH}`);
  console.log(
    JSON.stringify(
      {
        tables: report.tables.length,
        rpcs: report.rpcs.length,
        buckets: report.buckets.length,
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
