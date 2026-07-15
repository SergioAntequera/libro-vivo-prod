import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function filterPrivateNextEntries(source, fileName) {
  const marker = ".concat(";
  const markerIndex = source.indexOf(marker);
  const arrayStart = source.indexOf("[", markerIndex + marker.length);
  const arrayEnd = source.lastIndexOf(");");
  assert(markerIndex >= 0 && arrayStart >= 0 && arrayEnd > arrayStart, `${fileName} has an unknown format.`);

  const entries = JSON.parse(source.slice(arrayStart, arrayEnd));
  assert(Array.isArray(entries), `${fileName} does not contain a precache array.`);
  const filtered = entries.filter(
    (entry) =>
      !entry ||
      typeof entry.url !== "string" ||
      !/^\/?_next\/server\//i.test(entry.url),
  );
  const removed = entries.length - filtered.length;
  const updated =
    removed > 0
      ? `${source.slice(0, arrayStart)}${JSON.stringify(filtered)}${source.slice(arrayEnd)}`
      : source;
  return { updated, removed };
}

export async function repairPwaArtifacts(rootDir = process.cwd()) {
  const publicDir = path.join(rootDir, "public");
  const serviceWorkerPath = path.join(publicDir, "sw.js");
  const source = await fs.readFile(serviceWorkerPath, "utf8");
  const brokenImports = [
    ...source.matchAll(/["']\/_next\/(precache\.[^"']+\.js)["']/gi),
  ];
  let updated = source;

  for (const match of brokenImports) {
    const fileName = match[1];
    await fs.access(path.join(publicDir, fileName));
    updated = updated.split(`/_next/${fileName}`).join(`/${fileName}`);
  }

  const precacheImports = [
    ...updated.matchAll(/["']\/(precache\.[^"']+\.js)["']/gi),
  ].map((match) => match[1]);
  assert(precacheImports.length > 0, "Service worker does not import a precache manifest.");

  let removedEntries = 0;
  for (const fileName of precacheImports) {
    const manifestPath = path.join(publicDir, fileName);
    await fs.access(manifestPath);
    const manifestSource = await fs.readFile(manifestPath, "utf8");
    const filteredManifest = filterPrivateNextEntries(manifestSource, fileName);
    removedEntries += filteredManifest.removed;
    if (filteredManifest.updated !== manifestSource) {
      await fs.writeFile(manifestPath, filteredManifest.updated, "utf8");
    }
    assert(
      !/["']\/_next\/server\//i.test(filteredManifest.updated),
      `${fileName} contains private Next server files that browsers cannot precache.`,
    );
  }

  if (updated !== source) {
    await fs.writeFile(serviceWorkerPath, updated, "utf8");
  }

  console.log(
    `[fix-pwa-precache-path] Verified ${precacheImports.length} root precache import(s)` +
      `${brokenImports.length ? `, repaired ${brokenImports.length} import path(s)` : ""}` +
      `${removedEntries ? ` and removed ${removedEntries} private Next entries` : ""}.`,
  );
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  repairPwaArtifacts().catch((error) => {
    console.error("[fix-pwa-precache-path] Failed:", error);
    process.exitCode = 1;
  });
}
