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
  "000_current_live_public_schema_2026_04_08.sql",
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
    application_name: "libro-vivo-prod-extract-baseline",
    connectionTimeoutMillis: 5000,
  };
}

function quoteIdent(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function quotePublic(name) {
  return `${quoteIdent("public")}.${quoteIdent(name)}`;
}

function formatRole(roleName) {
  if (String(roleName).toUpperCase() === "PUBLIC") return "PUBLIC";
  return quoteIdent(roleName);
}

function pushSection(lines, title, bodyLines = []) {
  lines.push("");
  lines.push(`-- ${title}`);
  lines.push(`-- ${"-".repeat(Math.max(1, title.length))}`);
  if (bodyLines.length) lines.push(...bodyLines);
}

function ensureTrailingSemicolon(sql) {
  const trimmed = String(sql).trimEnd();
  return trimmed.endsWith(";") ? trimmed : `${trimmed};`;
}

async function fetchAll(client, sql) {
  const result = await client.query(sql);
  return result.rows;
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
    const extensions = await fetchAll(
      client,
      `
        select extname
        from pg_extension
        where extname in ('pgcrypto', 'uuid-ossp')
        order by extname;
      `,
    );

    const tables = await fetchAll(
      client,
      `
        select
          c.oid,
          c.relname as table_name,
          c.relrowsecurity as rls_enabled,
          c.relforcerowsecurity as force_rls
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relkind = 'r'
        order by c.relname;
      `,
    );

    const columns = await fetchAll(
      client,
      `
        select
          c.relname as table_name,
          a.attnum,
          a.attname as column_name,
          pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
          a.attnotnull as not_null,
          pg_get_expr(ad.adbin, ad.adrelid) as column_default
        from pg_attribute a
        join pg_class c on c.oid = a.attrelid
        join pg_namespace n on n.oid = c.relnamespace
        left join pg_attrdef ad
          on ad.adrelid = a.attrelid
         and ad.adnum = a.attnum
        where n.nspname = 'public'
          and c.relkind = 'r'
          and a.attnum > 0
          and not a.attisdropped
        order by c.relname, a.attnum;
      `,
    );

    const constraints = await fetchAll(
      client,
      `
        select
          c.relname as table_name,
          con.conname as constraint_name,
          con.contype as constraint_type,
          pg_get_constraintdef(con.oid, true) as constraint_def
        from pg_constraint con
        join pg_class c on c.oid = con.conrelid
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relkind = 'r'
        order by
          c.relname,
          case con.contype
            when 'p' then 1
            when 'u' then 2
            when 'c' then 3
            when 'f' then 4
            else 9
          end,
          con.conname;
      `,
    );

    const indexes = await fetchAll(
      client,
      `
        select
          tbl.relname as table_name,
          idx.relname as index_name,
          pg_get_indexdef(idx.oid) as index_def
        from pg_index i
        join pg_class tbl on tbl.oid = i.indrelid
        join pg_namespace n on n.oid = tbl.relnamespace
        join pg_class idx on idx.oid = i.indexrelid
        left join pg_constraint con on con.conindid = idx.oid
        where n.nspname = 'public'
          and tbl.relkind = 'r'
          and con.oid is null
        order by tbl.relname, idx.relname;
      `,
    );

    const functions = await fetchAll(
      client,
      `
        select
          p.oid,
          p.proname as function_name,
          pg_get_functiondef(p.oid) as function_def
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
        order by p.proname, p.oid;
      `,
    );

    const views = await fetchAll(
      client,
      `
        select
          c.relname as view_name,
          c.relkind as relkind,
          pg_get_viewdef(c.oid, true) as view_def
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relkind in ('v', 'm')
        order by c.relname;
      `,
    );

    const policies = await fetchAll(
      client,
      `
        select
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd,
          qual,
          with_check
        from pg_policies
        where schemaname = 'public'
        order by tablename, policyname;
      `,
    );

    const triggers = await fetchAll(
      client,
      `
        select
          c.relname as table_name,
          t.tgname as trigger_name,
          pg_get_triggerdef(t.oid, true) as trigger_def
        from pg_trigger t
        join pg_class c on c.oid = t.tgrelid
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relkind = 'r'
          and not t.tgisinternal
        order by c.relname, t.tgname;
      `,
    );

    const columnMap = new Map();
    for (const column of columns) {
      if (!columnMap.has(column.table_name)) columnMap.set(column.table_name, []);
      columnMap.get(column.table_name).push(column);
    }

    const lines = [];
    lines.push("-- Libro Vivo - baseline vivo del schema public");
    lines.push("-- Fuente: proyecto Supabase actual en funcionamiento");
    lines.push("-- Generado automaticamente el 2026-04-08");
    lines.push("");
    lines.push("begin;");

    if (extensions.length) {
      pushSection(
        lines,
        "Required extensions",
        extensions.map(
          ({ extname }) =>
            `create extension if not exists ${quoteIdent(extname)} with schema extensions;`,
        ),
      );
    }

    pushSection(lines, "Tables");
    for (const table of tables) {
      const tableColumns = columnMap.get(table.table_name) ?? [];
      const columnLines = tableColumns.map((column) => {
        const parts = [`${quoteIdent(column.column_name)} ${column.data_type}`];
        if (column.not_null) parts.push("not null");
        return `  ${parts.join(" ")}`;
      });
      lines.push(`create table if not exists ${quotePublic(table.table_name)} (`);
      lines.push(columnLines.join(",\n"));
      lines.push(");");
      lines.push("");
    }

    pushSection(lines, "Functions");
    for (const fn of functions) {
      lines.push(ensureTrailingSemicolon(fn.function_def));
      lines.push("");
    }

    pushSection(
      lines,
      "Column defaults",
      columns
        .filter((column) => column.column_default)
        .map(
          (column) =>
            `alter table ${quotePublic(column.table_name)} alter column ${quoteIdent(column.column_name)} set default ${column.column_default};`,
        ),
    );

    pushSection(
      lines,
      "Views",
      views.map((view) => {
        const prefix =
          view.relkind === "m"
            ? `create materialized view ${quotePublic(view.view_name)} as`
            : `create or replace view ${quotePublic(view.view_name)} as`;
        return `${prefix}\n${view.view_def};`;
      }),
    );

    const nonForeignKeyConstraints = constraints.filter(
      (constraint) => constraint.constraint_type !== "f",
    );
    const foreignKeyConstraints = constraints.filter(
      (constraint) => constraint.constraint_type === "f",
    );

    pushSection(
      lines,
      "Constraints",
      nonForeignKeyConstraints.map(
        (constraint) =>
          `alter table ${quotePublic(constraint.table_name)} add constraint ${quoteIdent(constraint.constraint_name)} ${constraint.constraint_def};`,
      ),
    );

    pushSection(
      lines,
      "Foreign keys",
      foreignKeyConstraints.map(
        (constraint) =>
          `alter table ${quotePublic(constraint.table_name)} add constraint ${quoteIdent(constraint.constraint_name)} ${constraint.constraint_def};`,
      ),
    );

    pushSection(
      lines,
      "Indexes",
      indexes.map((index) => `${index.index_def};`),
    );

    const rlsLines = [];
    for (const table of tables) {
      if (table.rls_enabled) {
        rlsLines.push(`alter table ${quotePublic(table.table_name)} enable row level security;`);
      }
      if (table.force_rls) {
        rlsLines.push(`alter table ${quotePublic(table.table_name)} force row level security;`);
      }
    }
    pushSection(lines, "Row level security", rlsLines);

    pushSection(
      lines,
      "Policies",
      policies.map((policy) => {
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
        return `create policy ${quoteIdent(policy.policyname)} on ${quotePublic(policy.tablename)}${permissive}${cmd}${roles}${usingClause}${withCheckClause};`;
      }),
    );

    pushSection(
      lines,
      "Triggers",
      triggers.map((trigger) => `${trigger.trigger_def};`),
    );

    lines.push("");
    lines.push("commit;");
    lines.push("");

    await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await writeFile(OUTPUT_PATH, `${lines.join("\n")}\n`, "utf8");

    console.log(
      JSON.stringify(
        {
          tables: tables.length,
          columns: columns.length,
          constraints: constraints.length,
          indexes: indexes.length,
          functions: functions.length,
          views: views.length,
          policies: policies.length,
          triggers: triggers.length,
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
