import withPWA from "next-pwa";
import path from "path";
import { fileURLToPath } from "url";

const isDev = process.env.NODE_ENV !== "production";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const safeRuntimeCaching = [
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
  navigateFallback: "/offline",
  navigateFallbackBlacklist: [/^\/api\//],
  // Do not cache generic GET requests. The default catch-all from next-pwa
  // was serving stale /api and Supabase responses, which broke realtime flows.
  runtimeCaching: safeRuntimeCaching,
};

const baseConfig = withPWA({
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
});

const originalWebpack = baseConfig.webpack;

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...baseConfig,
  webpack(config, options) {
    options.config.pwa = pwaOptions;
    if (typeof originalWebpack === "function") {
      return originalWebpack(config, options);
    }
    return config;
  },
};

export default nextConfig;
