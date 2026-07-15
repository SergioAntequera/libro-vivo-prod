import fs from "node:fs/promises";
import path from "node:path";

const publicDir = path.join(process.cwd(), "public");
const mobileDir = path.join(publicDir, "mobile");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readRequired(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    throw new Error(`Missing required generated file: ${filePath}`, { cause: error });
  }
}

async function main() {
  const indexHtml = await readRequired(path.join(mobileDir, "index.html"));
  const entryMatch = indexHtml.match(
    /\/mobile\/_expo\/static\/js\/web\/(entry-[a-f0-9]+\.js)/i,
  );
  assert(entryMatch, "Could not resolve the mobile JavaScript entry from index.html.");

  const entryUrl = `mobile/_expo/static/js/web/${entryMatch[1]}`;
  const serviceWorker = await readRequired(path.join(publicDir, "sw.js"));
  assert(
    !/["']\/_next\/precache\./i.test(serviceWorker),
    "Service worker imports its precache manifest from /_next instead of the public root.",
  );
  assert(serviceWorker.includes(entryUrl), "Service worker does not precache the current mobile entry.");
  assert(
    serviceWorker.includes("mobile-pwa-navigation") &&
      serviceWorker.includes("workbox.strategies.NetworkFirst"),
    "Service worker is missing the NetworkFirst mobile navigation cache.",
  );
  assert(
    serviceWorker.includes('/pwa-catch-handler.js'),
    "Service worker does not import the mobile offline fallback handler.",
  );
  assert(
    serviceWorker.includes('"url": "/mobile"') || serviceWorker.includes('"url":"/mobile"'),
    "Service worker does not precache the /mobile shell URL.",
  );
  assert(
    !serviceWorker.includes('registerNavigationRoute(workbox.precaching.getCacheKeyForURL("/offline")'),
    "Service worker still intercepts every Next navigation with the global offline page.",
  );
  assert(
    !/mobile\/assets\/(?:generated|illustrations)\//i.test(serviceWorker),
    "Service worker precaches heavy mobile artwork that should load on demand.",
  );

  const publicFiles = await fs.readdir(publicDir);
  const precacheFiles = publicFiles.filter((name) => /^precache\..+\.js$/i.test(name));
  assert(precacheFiles.length > 0, "No generated Workbox precache manifest was found.");
  for (const fileName of precacheFiles) {
    assert(
      serviceWorker.includes(`/${fileName}`),
      `${fileName} exists but is not imported by the service worker from the public root.`,
    );
    const source = await readRequired(path.join(publicDir, fileName));
    assert(
      !/["']\/_next\/server\//i.test(source),
      `${fileName} includes private Next server files that are not publicly reachable.`,
    );
    assert(
      !/mobile\/assets\/(?:generated|illustrations)\//i.test(source),
      `${fileName} precaches heavy mobile artwork that should load on demand.`,
    );
  }

  console.log(
    `[mobile:pwa:check:sw] ${entryMatch[1]} is precached and mobile navigation is offline-ready.`,
  );
}

main().catch((error) => {
  console.error("[mobile:pwa:check:sw] Failed:", error);
  process.exitCode = 1;
});
