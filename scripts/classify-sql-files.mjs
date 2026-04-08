import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const PROD_ROOT = process.cwd();
const SOURCE_SQL_ROOT = path.resolve(PROD_ROOT, "..", "libro-vivo", "supabase", "sql");
const REPORTS_DIR = path.resolve(PROD_ROOT, "reports");
const JSON_REPORT_PATH = path.resolve(REPORTS_DIR, "sql-file-classification-2026-04-08.json");
const MD_REPORT_PATH = path.resolve(PROD_ROOT, "docs", "SQL_FILE_CLASSIFICATION_2026_04_08.md");

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const absPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await walk(absPath)));
      continue;
    }

    results.push(absPath);
  }

  return results;
}

function normalize(relPath) {
  return relPath.replace(/\\/g, "/");
}

function classifySqlFile(relPath) {
  const normalized = normalize(relPath);
  const base = path.basename(normalized).toLowerCase();

  if (!normalized.endsWith(".sql")) {
    return null;
  }

  if (normalized.includes("/archive/dev/")) {
    return {
      classification: "DROP",
      reason: "archivado en supabase/sql/archive/dev, fuera de la ruta canonica",
    };
  }

  if (base.startsWith("wipe_")) {
    return {
      classification: "META",
      reason: "script destructivo/utilitario, no migracion de producto",
    };
  }

  if (base.includes("_gate") || base.includes("_audit")) {
    return {
      classification: "META",
      reason: "gate/audit operativo, no forma parte del schema productivo",
    };
  }

  if (base.includes("test") || base.includes("fixture") || base.includes("cleanup")) {
    return {
      classification: "DROP",
      reason: "test/fixture/cleanup, no apto para baseline de produccion",
    };
  }

  if (base.includes("hotfix")) {
    return {
      classification: "REVIEW",
      reason: "hotfix historico, revisar si quedo absorbido por migraciones posteriores",
    };
  }

  return {
    classification: "KEEP_CANDIDATE",
    reason: "sql raiz activo; candidato a baseline si el schema vivo y el runtime lo confirman",
  };
}

function summarize(items) {
  const counts = new Map();
  for (const item of items) {
    counts.set(item.classification, (counts.get(item.classification) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

function toMarkdown(items, summary) {
  const lines = [];
  lines.push("# SQL File Classification");
  lines.push("");
  lines.push("Fecha: 2026-04-08");
  lines.push("");
  lines.push("Inventario heuristico inicial para separar SQL productivo del SQL de test, operacion o archivo.");
  lines.push("");
  lines.push("## Resumen");
  lines.push("");
  for (const [classification, count] of Object.entries(summary)) {
    lines.push(`- \`${classification}\`: ${count}`);
  }
  lines.push("");
  lines.push("## Reglas aplicadas");
  lines.push("");
  lines.push("- `DROP`: archivos en `archive/dev`, `test`, `fixture` o `cleanup`.");
  lines.push("- `META`: `WIPE_*`, `*_gate*`, `*_audit*`.");
  lines.push("- `REVIEW`: `*hotfix*`.");
  lines.push("- `KEEP_CANDIDATE`: resto de SQL raiz activos.");
  lines.push("");
  lines.push("## Detalle");
  lines.push("");
  for (const item of items) {
    lines.push(`- \`${item.classification}\` [${item.path}](${item.absolutePath})`);
    lines.push(`  Motivo: ${item.reason}`);
  }
  lines.push("");
  lines.push("## Siguiente uso");
  lines.push("");
  lines.push("- Cruzar `KEEP_CANDIDATE` con el schema vivo del proyecto actual.");
  lines.push("- Mover los confirmados a una allowlist o baseline de produccion.");
  lines.push("- Mantener `META` fuera del bootstrap, pero disponibles para validacion.");
  return `${lines.join("\n")}\n`;
}

async function main() {
  const allFiles = await walk(SOURCE_SQL_ROOT);
  const sqlFiles = allFiles
    .map((absPath) => {
      const rel = normalize(path.relative(SOURCE_SQL_ROOT, absPath));
      const classification = classifySqlFile(rel);
      if (!classification) return null;
      return {
        path: `supabase/sql/${rel}`,
        absolutePath: absPath,
        ...classification,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.path.localeCompare(b.path));

  const summary = summarize(sqlFiles);

  await mkdir(REPORTS_DIR, { recursive: true });
  await writeFile(
    JSON_REPORT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sourceSqlRoot: SOURCE_SQL_ROOT,
        summary,
        files: sqlFiles,
      },
      null,
      2,
    ),
    "utf8",
  );
  await writeFile(MD_REPORT_PATH, toMarkdown(sqlFiles, summary), "utf8");

  console.log(`JSON: ${JSON_REPORT_PATH}`);
  console.log(`MD: ${MD_REPORT_PATH}`);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
