import withPWA from "next-pwa";
import { createHash } from "crypto";
import { readFileSync, readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { repairPwaArtifacts } from "./scripts/fix-pwa-precache-path.mjs";

const isDev = process.env.NODE_ENV !== "production";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobilePublicDir = path.join(__dirname, "public", "mobile");
const mobileShellRevision = createHash("sha256")
  .update(readFileSync(path.join(mobilePublicDir, "index.html")))
  .digest("hex")
  .slice(0, 16);

function collectMobilePrecacheEntries(directory = mobilePublicDir, relativeDir = "") {
  return readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const relativePath = path.join(relativeDir, entry.name);
      const publicPath = relativePath.split(path.sep).join("/");
      if (
        /^assets\/(?:generated|illustrations)\//i.test(publicPath) ||
        /^share\/email\//i.test(publicPath)
      ) {
        return [];
      }
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return collectMobilePrecacheEntries(absolutePath, relativePath);
      }
      const source = readFileSync(absolutePath);
      if (source.byteLength > 5 * 1024 * 1024) {
        throw new Error(`Mobile precache asset exceeds 5 MB: ${publicPath}`);
      }
      return [
        {
          url: `/mobile/${publicPath}`,
          revision: createHash("sha256").update(source).digest("hex").slice(0, 16),
        },
      ];
    });
}

const mobilePrecacheEntries = collectMobilePrecacheEntries();

class RepairPwaArtifactsPlugin {
  apply(compiler) {
    compiler.hooks.done.tapPromise("RepairPwaArtifactsPlugin", async () => {
      try {
        await repairPwaArtifacts(__dirname);
      } catch (error) {
        if (error && typeof error === "object" && error.code === "ENOENT") {
          console.warn(
            "[fix-pwa-precache-path] Service worker not emitted yet; deferring repair to postbuild.",
          );
          return;
        }
        throw error;
      }
    });
  }
}

function filterPrecacheEntries(entries) {
  return {
    manifest: entries.filter(
      ({ url }) =>
        !/^\/?mobile\/assets\/(?:generated|illustrations)\//i.test(url) &&
        !/^\/?mobile\/share\/email\//i.test(url) &&
        !/^\/?_next\/server\//i.test(url),
    ),
    warnings: [],
  };
}

const safeRuntimeCaching = [
  {
    urlPattern: /^https?:\/\/[^/]+\/mobile(?:\/[^.?#]*)?(?:\?[^#]*)?$/i,
    handler: "NetworkFirst",
    options: {
      cacheName: "mobile-pwa-navigation",
      networkTimeoutSeconds: 4,
      cacheableResponse: {
        statuses: [0, 200],
      },
      expiration: {
        maxEntries: 12,
        maxAgeSeconds: 7 * 24 * 60 * 60,
      },
    },
  },
  {
    urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
    handler: "CacheFirst",
    options: {
      cacheName: "google-fonts",
      expiration: {
        maxEntries: 4,
        maxAgeSeconds: 365 * 24 * 60 * 60,
      },
    },
  },
  {
    urlPattern: /^https:\/\/use\.fontawesome\.com\/releases\/.*/i,
    handler: "CacheFirst",
    options: {
      cacheName: "font-awesome",
      expiration: {
        maxEntries: 1,
        maxAgeSeconds: 365 * 24 * 60 * 60,
      },
    },
  },
  {
    urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "static-font-assets",
      expiration: {
        maxEntries: 4,
        maxAgeSeconds: 7 * 24 * 60 * 60,
      },
    },
  },
  {
    urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "static-image-assets",
      expiration: {
        maxEntries: 64,
        maxAgeSeconds: 24 * 60 * 60,
      },
    },
  },
  {
    urlPattern: /\.(?:js)$/i,
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "static-js-assets",
      expiration: {
        maxEntries: 16,
        maxAgeSeconds: 24 * 60 * 60,
      },
    },
  },
  {
    urlPattern: /\.(?:css|less)$/i,
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "static-style-assets",
      expiration: {
        maxEntries: 16,
        maxAgeSeconds: 24 * 60 * 60,
      },
    },
  },
];

const pwaOptions = {
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: isDev,
  importScripts: ["/pwa-catch-handler.js"],
  additionalManifestEntries: [
    { url: "/mobile", revision: mobileShellRevision },
    ...mobilePrecacheEntries,
  ],
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
  manifestTransforms: [filterPrecacheEntries],
  // Do not cache generic GET requests. The default catch-all from next-pwa
  // was serving stale /api and Supabase responses, which broke realtime flows.
  runtimeCaching: safeRuntimeCaching,
};

const withPwaConfig = withPWA(pwaOptions);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  outputFileTracingIncludes: {
    "/mobile/[[...slug]]": ["./public/mobile/**/*"],
    "/mobile/[[...slug]]/route": ["./public/mobile/**/*"],
  },
  webpack(config, options) {
    if (!options.dev && !options.isServer) {
      config.plugins.push(new RepairPwaArtifactsPlugin());
    }
    return config;
  },
};

export default withPwaConfig(nextConfig);
