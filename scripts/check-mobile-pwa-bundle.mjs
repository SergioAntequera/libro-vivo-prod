import fs from "node:fs/promises";
import path from "node:path";

const publicMobileDir = path.join(process.cwd(), "public", "mobile");
const indexHtmlPath = path.join(publicMobileDir, "index.html");
const manifestPath = path.join(publicMobileDir, "manifest.json");

async function readRequiredFile(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    throw new Error(`Missing required mobile bundle file: ${filePath}`, { cause: error });
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
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
  assert(manifest.id === "/mobile", 'Mobile manifest id must be "/mobile".');
  assert(manifest.start_url === "/mobile", 'Mobile manifest start_url must be "/mobile".');
  assert(manifest.scope === "/mobile/", 'Mobile manifest scope must be "/mobile/".');
  assert(Array.isArray(manifest.icons) && manifest.icons.length > 0, "Mobile manifest must include icons.");

  console.log("[mobile:pwa:check] Mobile PWA bundle is valid for /mobile deployment.");
}

main().catch((error) => {
  console.error("[mobile:pwa:check] Failed:", error);
  process.exitCode = 1;
});
