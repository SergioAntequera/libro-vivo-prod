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
  "010_current_live_public_seed_data_2026_04_08.sql",
);
const SEED_TABLES = [
  "rewards",
  "achievement_rules",
  "annual_tree_growth_profiles",
  "calendar_rules",
  "canvas_templates",
  "catalogs",
  "catalog_items",
  "forest_assets",
  "forest_narrative_templates",
  "forest_theme",
  "pdf_layout_presets",
  "pdf_text_templates",
  "pdf_theme_assets",
  "pdf_themes",
  "progression_conditions",
  "progression_graph_state",
  "progression_rewards",
  "progression_tree_nodes",
  "seed_defaults",
  "seed_status_flow",
  "sticker_packs",
  "stickers",
  "sticker_pack_items",
  "sticker_unlock_rules",
  "template_objects",
  "timeline_milestone_rules",
  "timeline_view_config",
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
    application_name: "libro-vivo-prod-extract-seed-data",
    connectionTimeoutMillis: 5000,
  };
}

function quoteIdent(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function quotePublic(name) {
  return `${quoteIdent("public")}.${quoteIdent(name)}`;
}

function topologicalOrder(nodes, dependencyPairs) {
  const incoming = new Map(nodes.map((node) => [node, 0]));
  const outgoing = new Map(nodes.map((node) => [node, []]));

  for (const [from, to] of dependencyPairs) {
    if (!incoming.has(from) || !incoming.has(to)) continue;
    outgoing.get(from).push(to);
    incoming.set(to, incoming.get(to) + 1);
  }

  const queue = nodes.filter((node) => incoming.get(node) === 0).sort();
  const ordered = [];

  while (queue.length) {
    const node = queue.shift();
    ordered.push(node);
    for (const next of outgoing.get(node)) {
      incoming.set(next, incoming.get(next) - 1);
      if (incoming.get(next) === 0) {
        queue.push(next);
        queue.sort();
      }
    }
  }

  const remaining = nodes.filter((node) => !ordered.includes(node)).sort();
  return [...ordered, ...remaining];
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
    const columnResult = await client.query(
      `
        select
          table_name,
          column_name
        from information_schema.columns
        where table_schema = 'public'
          and table_name = any($1::text[])
        order by table_name, ordinal_position;
      `,
      [SEED_TABLES],
    );

    const dependencyResult = await client.query(
      `
        select
          conf.relname as referenced_table,
          src.relname as dependent_table
        from pg_constraint con
        join pg_class src on src.oid = con.conrelid
        join pg_namespace src_ns on src_ns.oid = src.relnamespace
        join pg_class conf on conf.oid = con.confrelid
        join pg_namespace conf_ns on conf_ns.oid = conf.relnamespace
        where con.contype = 'f'
          and src_ns.nspname = 'public'
          and conf_ns.nspname = 'public'
          and src.relname = any($1::text[])
          and conf.relname = any($1::text[]);
      `,
      [SEED_TABLES],
    );

    const columnMap = new Map(SEED_TABLES.map((table) => [table, []]));
    for (const row of columnResult.rows) {
      columnMap.get(row.table_name)?.push(row.column_name);
    }

    const order = topologicalOrder(
      [...SEED_TABLES],
      dependencyResult.rows.map((row) => [row.referenced_table, row.dependent_table]),
    );

    const lines = [];
    lines.push("-- Libro Vivo - seed data viva del schema public");
    lines.push("-- Fuente: proyecto Supabase actual en funcionamiento");
    lines.push("-- Solo incluye configuracion/catalogos/sistema, no contenido de usuario");
    lines.push("-- Generado automaticamente el 2026-04-08");

    const summary = [];

    for (const tableName of order) {
      const columns = columnMap.get(tableName) ?? [];
      if (!columns.length) continue;

      const selectSql = `select * from ${quotePublic(tableName)}`;
      const rowResult = await client.query(selectSql);
      const rows = rowResult.rows;
      summary.push({ table_name: tableName, count: rows.length });

      if (!rows.length) continue;

      const tag = `$seed_${tableName}$`;
      const jsonPayload = JSON.stringify(rows);
      const quotedColumns = columns.map((column) => quoteIdent(column)).join(", ");

      lines.push("");
      lines.push(`-- ${tableName} (${rows.length})`);
      lines.push(
        `insert into ${quotePublic(tableName)} (${quotedColumns})`,
      );
      lines.push(`select ${quotedColumns}`);
      lines.push(
        `from json_populate_recordset(null::${quotePublic(tableName)}, ${tag}${jsonPayload}${tag}::json)`,
      );
      lines.push("on conflict do nothing;");
    }

    lines.push("");

    await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await writeFile(OUTPUT_PATH, `${lines.join("\n")}\n`, "utf8");

    console.log(
      JSON.stringify(
        {
          tables: summary,
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
