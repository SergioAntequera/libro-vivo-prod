import fs from "node:fs/promises";
import path from "node:path";

const webProjectRoot = process.cwd();
const mobileDistDir = path.resolve(webProjectRoot, "..", "libro-vivo-mobile", "dist-web");
const targetDir = path.join(webProjectRoot, "public", "mobile");
const mobileBuildInfoPath = path.join(mobileDistDir, "build-info.json");

function normalizeEnvValue(value) {
  const trimmed = String(value ?? "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

async function readEnvFile(fileName) {
  try {
    const contents = await fs.readFile(path.join(webProjectRoot, fileName), "utf8");
    return Object.fromEntries(
      contents
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => {
          const separator = line.indexOf("=");
          return [
            line.slice(0, separator).trim(),
            normalizeEnvValue(line.slice(separator + 1)),
          ];
        }),
    );
  } catch {
    return {};
  }
}

function resolveHost(value) {
  try {
    return new URL(String(value ?? "").trim()).hostname;
  } catch {
    return null;
  }
}

async function validateMobileBuildTarget() {
  const buildInfo = JSON.parse(await fs.readFile(mobileBuildInfoPath, "utf8"));
  if (buildInfo.environment !== "production") {
    throw new Error(
      `Refusing to publish a ${String(buildInfo.environment)} mobile build into production.`,
    );
  }
  if (!buildInfo.releaseRevision || buildInfo.releaseRevision === "local") {
    throw new Error("Refusing to publish a mobile build without a source revision.");
  }

  const localEnv = await readEnvFile(".env.local");
  const defaultEnv = await readEnvFile(".env");
  const expectedHost = resolveHost(
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
      localEnv.NEXT_PUBLIC_SUPABASE_URL ??
      defaultEnv.NEXT_PUBLIC_SUPABASE_URL,
  );
  const mobileHost = String(buildInfo.backendHost ?? "").trim().toLowerCase();
  if (!expectedHost || !mobileHost || expectedHost !== mobileHost) {
    throw new Error(
      `Mobile backend mismatch: expected ${expectedHost ?? "unknown"}, received ${mobileHost || "unknown"}.`,
    );
  }

  return buildInfo;
}

async function ensureReadableDirectory(dirPath) {
  const stats = await fs.stat(dirPath);
  if (!stats.isDirectory()) {
    throw new Error(`Expected a directory at ${dirPath}`);
  }
}

async function main() {
  await ensureReadableDirectory(mobileDistDir);
  const buildInfo = await validateMobileBuildTarget();
  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.mkdir(path.dirname(targetDir), { recursive: true });
  await fs.cp(mobileDistDir, targetDir, { recursive: true });
  console.log(
    `[sync-mobile-pwa] Synced ${mobileDistDir} -> ${targetDir} ` +
      `(${buildInfo.environment}, ${buildInfo.releaseRevision}, ${buildInfo.backendHost}).`,
  );
}

main().catch((error) => {
  console.error("[sync-mobile-pwa] Failed:", error);
  process.exitCode = 1;
});
