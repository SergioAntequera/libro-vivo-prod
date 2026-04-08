import withPWA from "next-pwa";
import path from "path";
import { fileURLToPath } from "url";

const isDev = process.env.NODE_ENV !== "production";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pwaOptions = {
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: isDev,
  navigateFallback: "/offline",
  navigateFallbackBlacklist: [/^\/api\//],
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
