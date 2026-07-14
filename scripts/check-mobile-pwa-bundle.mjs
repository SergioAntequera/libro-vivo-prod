import fs from "node:fs/promises";
import path from "node:path";

const publicMobileDir = path.join(process.cwd(), "public", "mobile");
const indexHtmlPath = path.join(publicMobileDir, "index.html");
const manifestPath = path.join(publicMobileDir, "manifest.json");
const bundledJsDir = path.join(publicMobileDir, "_expo", "static", "js", "web");

async function readRequiredFile(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    throw new Error(`Missing required mobile bundle file: ${filePath}`, { cause: error });
  }
}

async function readOptionalFile(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function collectFiles(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await collectFiles(fullPath)));
      } else {
        files.push(fullPath);
      }
    }
    return files;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function main() {
  const [indexHtml, manifestRaw] = await Promise.all([
    readRequiredFile(indexHtmlPath),
    readRequiredFile(manifestPath),
  ]);

  let manifest;
  try {
    manifest = JSON.parse(manifestRaw);
  } catch (error) {
    throw new Error("public/mobile/manifest.json is not valid JSON.", { cause: error });
  }

  assert(
    indexHtml.includes('<base href="/mobile/" />'),
    'Mobile bundle index.html must include <base href="/mobile/" />.',
  );
  assert(
    indexHtml.includes('/mobile/manifest.json'),
    "Mobile bundle index.html must link /mobile/manifest.json.",
  );
  const entryMatch = indexHtml.match(
    /\/mobile\/_expo\/static\/js\/web\/(entry-[a-f0-9]+\.js)/i,
  );
  assert(entryMatch, "Mobile bundle index.html must reference a versioned JavaScript entry.");

  const entryPath = path.join(bundledJsDir, entryMatch[1]);
  const entrySource = await readRequiredFile(entryPath);
  assert(entrySource.length > 100_000, "Mobile JavaScript entry is unexpectedly small.");
  assert(
    !entrySource.trimStart().startsWith("<"),
    "Mobile JavaScript entry contains HTML instead of JavaScript.",
  );
  assert(manifest.id === "/mobile", 'Mobile manifest id must be "/mobile".');
  assert(manifest.start_url === "/mobile", 'Mobile manifest start_url must be "/mobile".');
  assert(manifest.scope === "/mobile/", 'Mobile manifest scope must be "/mobile/".');
  assert(Array.isArray(manifest.icons) && manifest.icons.length > 0, "Mobile manifest must include icons.");

  const bundledJsFiles = (await collectFiles(bundledJsDir)).filter((filePath) => filePath.endsWith(".js"));
  let scopedPathFound = false;
  for (const jsFile of bundledJsFiles) {
    const content = await readOptionalFile(jsFile);
    if (content?.includes("/assets/node_modules/@")) {
      scopedPathFound = true;
      break;
    }
  }
  assert(!scopedPathFound, "Mobile bundle still references scoped node_modules asset paths with '@'.");

  console.log("[mobile:pwa:check] Mobile PWA bundle is valid for /mobile deployment.");
}

main().catch((error) => {
  console.error("[mobile:pwa:check] Failed:", error);
  process.exitCode = 1;
});
