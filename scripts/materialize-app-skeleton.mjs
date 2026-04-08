import { cp, mkdir } from "node:fs/promises";
import path from "node:path";

const PROD_ROOT = process.cwd();
const SOURCE_ROOT = path.resolve(PROD_ROOT, "..", "libro-vivo");

const FILES_TO_COPY = [
  ".editorconfig",
  ".env.example",
  "eslint.config.mjs",
  "middleware.ts",
  "next-env.d.ts",
  "next.config.mjs",
  "package-lock.json",
  "package.json",
  "postcss.config.mjs",
  "tsconfig.json",
];

const DIRS_TO_COPY = ["src", "types"];

async function copyFileRelative(relPath) {
  const sourcePath = path.resolve(SOURCE_ROOT, relPath);
  const targetPath = path.resolve(PROD_ROOT, relPath);
  await mkdir(path.dirname(targetPath), { recursive: true });
  await cp(sourcePath, targetPath, { force: true });
}

async function copyDirRelative(relPath) {
  const sourcePath = path.resolve(SOURCE_ROOT, relPath);
  const targetPath = path.resolve(PROD_ROOT, relPath);
  await cp(sourcePath, targetPath, {
    recursive: true,
    force: true,
  });
}

async function copyPublic() {
  const sourcePath = path.resolve(SOURCE_ROOT, "public");
  const targetPath = path.resolve(PROD_ROOT, "public");
  await cp(sourcePath, targetPath, {
    recursive: true,
    force: true,
    filter(source) {
      const normalized = source.replace(/\\/g, "/");
      if (normalized.endsWith("/public/sw.js")) return false;
      if (/\/public\/precache\.[^/]+$/.test(normalized)) return false;
      return true;
    },
  });
}

async function main() {
  for (const file of FILES_TO_COPY) {
    await copyFileRelative(file);
  }

  for (const dir of DIRS_TO_COPY) {
    await copyDirRelative(dir);
  }

  await copyPublic();

  console.log("Esqueleto app copiado a libro-vivo-prod");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
