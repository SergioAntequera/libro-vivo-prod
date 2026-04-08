import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Repo-local scratch, archived one-off outputs and generated PWA files:
    ".claude/**",
    "archive/**",
    "supabase/.temp/**",
    "tmp*/**",
    "tmp*",
    "public/sw.js",
    "public/precache*.js",
    "public/workbox-*.js",
  ]),
]);

export default eslintConfig;
