import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const PROD_ROOT = process.cwd();
const SOURCE_ROOT = path.resolve(PROD_ROOT, "..", "libro-vivo");
const ALLOWLIST_PATH = path.resolve(
  PROD_ROOT,
  "supabase",
  "allowlists",
  "production-sql-allowlist-2026-04-08.txt",
);
const TARGET_SQL_DIR = path.resolve(PROD_ROOT, "supabase", "sql");
const TARGET_README_PATH = path.resolve(TARGET_SQL_DIR, "README.md");

async function main() {
  const rawAllowlist = await readFile(ALLOWLIST_PATH, "utf8");
  const files = rawAllowlist
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  await mkdir(TARGET_SQL_DIR, { recursive: true });

  for (const relPath of files) {
    const sourcePath = path.resolve(SOURCE_ROOT, relPath);
    const targetPath = path.resolve(PROD_ROOT, relPath);
    const sqlText = await readFile(sourcePath, "utf8");
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, sqlText, "utf8");
  }

  const readme = [
    "# Production SQL",
    "",
    "SQL allowlisted para reconstruir el schema productivo de `libro-vivo-prod`.",
    "",
    "Origen:",
    "- repo fuente: `../libro-vivo`",
    "- allowlist: `supabase/allowlists/production-sql-allowlist-2026-04-08.txt`",
    "",
    "Reglas:",
    "- aqui solo viven SQL incluidos en la allowlist productiva",
    "- no copiar `WIPE_*`, `*_gate*`, `*_audit*`, tests ni `archive/dev`",
    "- el orden de aplicacion es el orden lexicografico de estos ficheros",
    "",
    `Total copiados: ${files.length}`,
    "",
  ].join("\n");

  await writeFile(TARGET_README_PATH, readme, "utf8");

  console.log(`Copiados ${files.length} SQL a ${TARGET_SQL_DIR}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
