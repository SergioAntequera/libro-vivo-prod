import fs from "node:fs/promises";
import path from "node:path";

const webProjectRoot = process.cwd();
const mobileDistDir = path.resolve(webProjectRoot, "..", "libro-vivo-mobile", "dist-web");
const targetDir = path.join(webProjectRoot, "public", "mobile");

async function ensureReadableDirectory(dirPath) {
  const stats = await fs.stat(dirPath);
  if (!stats.isDirectory()) {
    throw new Error(`Expected a directory at ${dirPath}`);
  }
}

async function main() {
  await ensureReadableDirectory(mobileDistDir);
  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.mkdir(path.dirname(targetDir), { recursive: true });
  await fs.cp(mobileDistDir, targetDir, { recursive: true });
  console.log(`[sync-mobile-pwa] Synced ${mobileDistDir} -> ${targetDir}`);
}

main().catch((error) => {
  console.error("[sync-mobile-pwa] Failed:", error);
  process.exitCode = 1;
});
