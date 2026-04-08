import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const PROD_ROOT = process.cwd();
const REPORTS_DIR = path.resolve(PROD_ROOT, "reports");
const DOCS_DIR = path.resolve(PROD_ROOT, "docs");
const ALLOWLIST_DIR = path.resolve(PROD_ROOT, "supabase", "allowlists");

const CLASSIFICATION_PATH = path.resolve(REPORTS_DIR, "sql-file-classification-2026-04-08.json");
const LINKAGE_PATH = path.resolve(REPORTS_DIR, "sql-runtime-linkage-2026-04-08.json");
const COVERAGE_PATH = path.resolve(REPORTS_DIR, "current-project-runtime-coverage-2026-04-08.json");

const JSON_REPORT_PATH = path.resolve(REPORTS_DIR, "production-sql-allowlist-2026-04-08.json");
const MD_REPORT_PATH = path.resolve(DOCS_DIR, "PRODUCTION_SQL_ALLOWLIST_2026_04_08.md");
const TXT_REPORT_PATH = path.resolve(ALLOWLIST_DIR, "production-sql-allowlist-2026-04-08.txt");

const MANUAL_DECISIONS = {
  "supabase/sql/2026-03-05_storage_stickers_assets.sql": {
    decision: "INCLUDE",
    group: "support_bucket",
    reason:
      "bucket de stickers usado por admin/uploadStickerAsset; existe en el proyecto actual aunque el parser de runtime no lo detecte por usar constante",
  },
  "supabase/sql/2026-03-07_annual_tree_engine_foundation.sql": {
    decision: "INCLUDE",
    group: "schema_parity",
    reason:
      "crea tablas que siguen existiendo en el proyecto actual (annual_tree_growth_profiles, annual_tree_snapshots); mantener paridad aunque la ruta viva principal hoy sea garden_year_tree_states",
  },
  "supabase/sql/2026-03-11_core_garden_not_null_enforcement.sql": {
    decision: "INCLUDE",
    group: "structural",
    reason:
      "cierra la compatibilidad y fija garden_id NOT NULL en contenido core; requisito de integridad del modelo multi-jardin",
  },
  "supabase/sql/2026-03-23_storage_plan_type_assets.sql": {
    decision: "INCLUDE",
    group: "support_bucket",
    reason:
      "bucket de assets de plan types usado por admin/uploadPlanTypeAsset; existe en el proyecto actual",
  },
  "supabase/sql/2026-03-24_custom_flower_families.sql": {
    decision: "EXCLUDE",
    group: "noop_doc",
    reason:
      "archivo documental/no-op; no crea ni modifica schema y solo deja comentarios sobre un catalogo ya soportado por catalog_items",
  },
  "supabase/sql/2026-03-26_profiles_identity_fields.sql": {
    decision: "INCLUDE",
    group: "structural",
    reason:
      "last_name y pronoun se usan hoy en home/chat/profileBootstrap; columna necesaria aunque no salga como tabla nueva",
  },
  "supabase/sql/2026-03-26_storage_garden_chat_media.sql": {
    decision: "INCLUDE",
    group: "support_bucket",
    reason:
      "bucket privado de chat media usado por upload de adjuntos/voz; existe en el proyecto actual",
  },
  "supabase/sql/2026-03-26_year_cycle_states_realtime.sql": {
    decision: "INCLUDE",
    group: "realtime_support",
    reason:
      "publica year_cycle_states en supabase_realtime; soporte necesario para suscripciones en la vista anual",
  },
  "supabase/sql/2026-04-06_garden_invitations_garden_title.sql": {
    decision: "INCLUDE",
    group: "structural",
    reason:
      "garden_title se usa hoy en APIs de invitaciones y creacion de jardin personal",
  },
  "supabase/sql/2026-04-07_core_garden_delete_fk_alignment.sql": {
    decision: "INCLUDE",
    group: "structural",
    reason:
      "alinea FKs a on delete cascade con garden_id NOT NULL; evita inconsistencias al borrar jardines",
  },
  "supabase/sql/2026-03-11_private_bond_invitation_functions_hotfix_ambiguous_refs.sql": {
    decision: "INCLUDE",
    group: "patch",
    reason:
      "hotfix vivo para RPCs accept_private_garden_invitation y create_private_personal_garden que el runtime usa hoy",
  },
  "supabase/sql/2026-03-11_private_bond_invitation_functions_hotfix_pgcrypto_search_path.sql": {
    decision: "INCLUDE",
    group: "patch",
    reason:
      "hotfix vivo para create_private_garden_invitation, RPC usada por runtime y e2e",
  },
};

function includeByDefault(item) {
  if (item.classification === "KEEP_CANDIDATE") {
    return {
      decision: "INCLUDE",
      group: item.runtimeLinked ? "linked_runtime" : "manual_review_resolved",
      reason: item.runtimeLinked
        ? "enlaza con tablas/RPC/buckets usados por el runtime actual"
        : "candidato activo confirmado manualmente",
    };
  }

  if (item.classification === "REVIEW") {
    return {
      decision: "EXCLUDE",
      group: "review_pending",
      reason: "sql marcado para review y sin override manual",
    };
  }

  return {
    decision: "EXCLUDE",
    group: "non_candidate",
    reason: "fuera de candidatos productivos",
  };
}

function toMarkdown(report) {
  const lines = [];
  lines.push("# Production SQL Allowlist");
  lines.push("");
  lines.push("Fecha: 2026-04-08");
  lines.push("");
  lines.push("Allowlist provisional para reconstruir el schema productivo de `libro-vivo-prod`.");
  lines.push("");
  lines.push("## Resumen");
  lines.push("");
  lines.push(`- SQL totales inventariados: ${report.totalSqlFiles}`);
  lines.push(`- INCLUDE: ${report.include.length}`);
  lines.push(`- EXCLUDE: ${report.exclude.length}`);
  lines.push("");
  lines.push("## Criterios");
  lines.push("");
  lines.push("- Se incluye por defecto todo `KEEP_CANDIDATE` enlazado al runtime.");
  lines.push("- Se incluyen manualmente buckets, paridad de schema y hotfixes vivos.");
  lines.push("- Se excluyen `DROP`, `META` y el SQL documental/no-op.");
  lines.push("");
  lines.push("## INCLUDE");
  lines.push("");
  for (const item of report.include) {
    lines.push(`- \`${item.group}\` [${item.path}](${item.absolutePath})`);
    lines.push(`  Motivo: ${item.reason}`);
  }
  lines.push("");
  lines.push("## EXCLUDE");
  lines.push("");
  for (const item of report.exclude) {
    lines.push(`- \`${item.group}\` [${item.path}](${item.absolutePath})`);
    lines.push(`  Motivo: ${item.reason}`);
  }
  lines.push("");
  lines.push("## Siguiente paso");
  lines.push("");
  lines.push("- Aplicar esta allowlist en el Supabase nuevo.");
  lines.push("- Correr gates de seguridad al final.");
  lines.push("- Si algo falla, revisar primero los excluidos de tipo `noop_doc` o `META` antes de tocar candidatos incluidos.");
  return `${lines.join("\n")}\n`;
}

async function main() {
  const classification = JSON.parse(await readFile(CLASSIFICATION_PATH, "utf8"));
  const linkage = JSON.parse(await readFile(LINKAGE_PATH, "utf8"));
  const coverage = JSON.parse(await readFile(COVERAGE_PATH, "utf8"));

  const linkageMap = new Map(linkage.files.map((item) => [item.path, item]));
  const coverageTableNames = new Set(coverage.tables.filter((item) => item.status === "ok").map((item) => item.name));
  const coverageBucketNames = new Set(coverage.buckets.filter((item) => item.status === "ok").map((item) => item.name));

  const include = [];
  const exclude = [];

  for (const file of classification.files) {
    const linked = linkageMap.get(file.path);
    const merged = {
      ...file,
      runtimeLinked: linked?.runtimeLinked ?? false,
      runtimeTables: linked?.runtimeTables ?? [],
      runtimeFunctions: linked?.runtimeFunctions ?? [],
      runtimeBuckets: linked?.runtimeBuckets ?? [],
      sqlTables: linked?.sqlTables ?? [],
      sqlFunctions: linked?.sqlFunctions ?? [],
      sqlBuckets: linked?.sqlBuckets ?? [],
    };

    const manual = MANUAL_DECISIONS[file.path];
    const decision = manual ?? includeByDefault(merged);

    const target = decision.decision === "INCLUDE" ? include : exclude;
    target.push({
      path: file.path,
      absolutePath: file.absolutePath,
      classification: file.classification,
      group: decision.group,
      reason: decision.reason,
      runtimeLinked: merged.runtimeLinked,
      sqlTables: merged.sqlTables,
      sqlFunctions: merged.sqlFunctions,
      sqlBuckets: merged.sqlBuckets,
    });
  }

  include.sort((a, b) => a.path.localeCompare(b.path));
  exclude.sort((a, b) => a.path.localeCompare(b.path));

  const report = {
    generatedAt: new Date().toISOString(),
    totalSqlFiles: classification.files.length,
    existingCurrentProjectTables: [...coverageTableNames].sort(),
    existingCurrentProjectBuckets: [...coverageBucketNames].sort(),
    include,
    exclude,
  };

  await mkdir(REPORTS_DIR, { recursive: true });
  await mkdir(DOCS_DIR, { recursive: true });
  await mkdir(ALLOWLIST_DIR, { recursive: true });

  await writeFile(JSON_REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  await writeFile(MD_REPORT_PATH, toMarkdown(report), "utf8");
  await writeFile(
    TXT_REPORT_PATH,
    `${include.map((item) => item.path).join("\n")}\n`,
    "utf8",
  );

  console.log(`JSON: ${JSON_REPORT_PATH}`);
  console.log(`MD: ${MD_REPORT_PATH}`);
  console.log(`TXT: ${TXT_REPORT_PATH}`);
  console.log(
    JSON.stringify(
      {
        include: include.length,
        exclude: exclude.length,
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
