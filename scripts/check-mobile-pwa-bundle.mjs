import fs from "node:fs/promises";
import path from "node:path";

const publicMobileDir = path.join(process.cwd(), "public", "mobile");
const indexHtmlPath = path.join(publicMobileDir, "index.html");
const manifestPath = path.join(publicMobileDir, "manifest.json");
const buildInfoPath = path.join(publicMobileDir, "build-info.json");
const serviceWorkerRegistrationPath = path.join(publicMobileDir, "register-service-worker.js");
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
  const [indexHtml, manifestRaw, buildInfoRaw, serviceWorkerRegistration] = await Promise.all([
    readRequiredFile(indexHtmlPath),
    readRequiredFile(manifestPath),
    readRequiredFile(buildInfoPath),
    readRequiredFile(serviceWorkerRegistrationPath),
  ]);

  let manifest;
  let buildInfo;
  try {
    manifest = JSON.parse(manifestRaw);
  } catch (error) {
    throw new Error("public/mobile/manifest.json is not valid JSON.", { cause: error });
  }
  try {
    buildInfo = JSON.parse(buildInfoRaw);
  } catch (error) {
    throw new Error("public/mobile/build-info.json is not valid JSON.", { cause: error });
  }

  assert(
    indexHtml.includes('<base href="/mobile/" />'),
    'Mobile bundle index.html must include <base href="/mobile/" />.',
  );
  assert(
    indexHtml.includes('/mobile/manifest.json'),
    "Mobile bundle index.html must link /mobile/manifest.json.",
  );
  assert(
    indexHtml.includes('/mobile/register-service-worker.js'),
    "Mobile bundle index.html must load its service worker registration.",
  );
  assert(
    serviceWorkerRegistration.includes('navigator.serviceWorker.register("/sw.js"'),
    "Mobile service worker registration must target the production root worker.",
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
  assert(buildInfo.schemaVersion === 1, "Mobile build info schema is unsupported.");
  assert(buildInfo.environment === "production", "Mobile PWA must be a production build.");
  assert(
    typeof buildInfo.releaseRevision === "string" &&
      buildInfo.releaseRevision.length >= 7 &&
      buildInfo.releaseRevision !== "local",
    "Mobile PWA must include a source revision.",
  );
  assert(
    typeof buildInfo.backendHost === "string" && buildInfo.backendHost.endsWith(".supabase.co"),
    "Mobile PWA must identify its Supabase backend host.",
  );

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

  console.log(
    `[mobile:pwa:check] Mobile PWA bundle is valid for /mobile deployment ` +
      `(${buildInfo.environment}, ${buildInfo.releaseRevision}, Sentry ` +
      `${buildInfo.sentryConfigured ? "configured" : "not configured"}).`,
  );
}

main().catch((error) => {
  console.error("[mobile:pwa:check] Failed:", error);
  process.exitCode = 1;
});
