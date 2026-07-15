import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, devices, request } from "playwright";

const DEFAULT_BASE_URL = "https://www.libro-vivo.es/mobile";
const EXPECTED_PRODUCTION_BACKEND = "wmmaxlykngeszwvvifqj.supabase.co";
const OUT_DIR = path.join("tmp", "qa-mobile-pwa-public");
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const DEEP_ROUTES = ["/capsules", "/settings", "/map", "/plans", "/memories"];

function readArg(name) {
  const prefix = `--${name}=`;
  const value = process.argv.find((argument) => argument.startsWith(prefix));
  return value ? value.slice(prefix.length).trim() : null;
}

function normalizeBaseUrl(value) {
  const parsed = new URL(value);
  parsed.hash = "";
  parsed.search = "";
  parsed.pathname = parsed.pathname.replace(/\/$/, "") || "/mobile";
  return parsed;
}

function routeUrl(baseUrl, pathname = "") {
  const url = new URL(baseUrl.origin);
  url.pathname = `${baseUrl.pathname}${pathname}`.replace(/\/+/g, "/");
  return url.toString();
}

function nowIso() {
  return new Date().toISOString();
}

function createReport(baseUrl) {
  return {
    startedAt: nowIso(),
    baseUrl: baseUrl.toString(),
    mode: "read-only",
    steps: [],
    diagnostics: [],
    screenshots: [],
  };
}

async function step(report, title, operation) {
  const startedAt = Date.now();
  try {
    const detail = await operation();
    report.steps.push({ title, status: "ok", durationMs: Date.now() - startedAt, detail });
    console.log(`[qa:pwa] OK ${title}`);
    return detail;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    report.steps.push({ title, status: "fail", durationMs: Date.now() - startedAt, detail: message });
    console.error(`[qa:pwa] FAIL ${title}: ${message}`);
    throw error;
  }
}

async function fetchRequired(api, url, expectedContentType) {
  const response = await api.get(url.toString(), {
    failOnStatusCode: false,
    timeout: 30_000,
  });
  assert.equal(response.ok(), true, `${url} respondio ${response.status()}.`);
  const contentType = response.headers()["content-type"] ?? "";
  assert.match(contentType, expectedContentType, `${url} devolvio Content-Type ${contentType}.`);
  return response;
}

async function checkDeploymentContract(report, api, baseUrl, expectedBackend) {
  await step(report, "shell HTML y entry JavaScript", async () => {
    const response = await fetchRequired(api, routeUrl(baseUrl), /text\/html/i);
    const html = await response.text();
    assert.match(html, /<base href="\/mobile\/"\s*\/>/i);
    assert.match(html, /href="\/mobile\/manifest\.json"/i);
    const entry = html.match(/\/mobile\/_expo\/static\/js\/web\/(entry-[a-f0-9]+\.js)/i)?.[1];
    assert.ok(entry, "No se encontro el entry versionado de Expo.");

    const entryUrl = new URL(`/mobile/_expo/static/js/web/${entry}`, baseUrl.origin);
    const entryResponse = await fetchRequired(api, entryUrl, /(javascript|application\/octet-stream)/i);
    const source = await entryResponse.text();
    assert.ok(source.length > 100_000, "El entry JavaScript es demasiado pequeno.");
    assert.equal(source.trimStart().startsWith("<"), false, "El entry contiene HTML.");
    return { entry, bytes: source.length };
  });

  const buildInfo = await step(report, "identidad de release y backend", async () => {
    const response = await fetchRequired(api, new URL("/mobile/build-info.json", baseUrl.origin), /application\/json/i);
    const payload = await response.json();
    assert.equal(payload.schemaVersion, 1);
    assert.equal(payload.environment, "production");
    assert.equal(payload.backendHost, expectedBackend);
    assert.match(payload.releaseRevision, /^[a-f0-9]{7,40}$/i);
    return payload;
  });

  await step(report, "manifest e iconos instalables", async () => {
    const response = await fetchRequired(api, new URL("/mobile/manifest.json", baseUrl.origin), /application\/json/i);
    const manifest = await response.json();
    assert.equal(manifest.id, "/mobile");
    assert.equal(manifest.start_url, "/mobile");
    assert.equal(manifest.scope, "/mobile/");
    assert.equal(manifest.display, "standalone");
    assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 4);
    for (const icon of manifest.icons) {
      await fetchRequired(api, new URL(icon.src, baseUrl.origin), /^image\//i);
    }
    return { icons: manifest.icons.length };
  });

  await step(report, "service worker enlazado con la release", async () => {
    const response = await fetchRequired(api, new URL("/sw.js", baseUrl.origin), /(javascript|application\/octet-stream)/i);
    const source = await response.text();
    assert.ok(source.includes(buildInfo.releaseRevision) || source.includes("mobile/_expo/static/js/web/entry-"));
    assert.ok(source.includes("mobile-pwa-navigation"));
    assert.ok(source.includes("NetworkFirst"));
    assert.ok(source.includes("/pwa-catch-handler.js"));
    assert.ok(source.includes('"url": "/mobile"') || source.includes('"url":"/mobile"'));
    await fetchRequired(api, new URL("/pwa-catch-handler.js", baseUrl.origin), /(javascript|application\/octet-stream)/i);
    assert.doesNotMatch(source, /["']\/_next\/precache\./i);
    const precachePaths = [...source.matchAll(/["']\/(precache\.[^"']+\.js)["']/gi)].map(
      (match) => match[1],
    );
    assert.ok(precachePaths.length > 0, "El service worker no importa su precache.");
    for (const fileName of precachePaths) {
      await fetchRequired(api, new URL(`/${fileName}`, baseUrl.origin), /(javascript|application\/octet-stream)/i);
    }
    return { bytes: source.length, precacheFiles: precachePaths };
  });

  await step(report, "rutas profundas sirven el shell", async () => {
    for (const pathname of DEEP_ROUTES) {
      const response = await fetchRequired(api, routeUrl(baseUrl, pathname), /text\/html/i);
      const body = await response.text();
      assert.match(body, /id="root"/i, `${pathname} no devolvio el shell Expo.`);
      assert.doesNotMatch(body, /Unmatched Route|Page could not be found/i);
    }
    return { routes: DEEP_ROUTES };
  });
}

function attachReadOnlyDiagnostics(context, page, report, profile) {
  const state = {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    httpErrors: [],
    writeRequests: [],
  };

  context.route("**/*", async (route) => {
    const request = route.request();
    if (!SAFE_METHODS.has(request.method())) {
      state.writeRequests.push(`${request.method()} ${request.url()}`);
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });

  page.on("console", (message) => {
    if (message.type() === "error") state.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => state.pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "unknown";
    if (!failure.includes("ERR_ABORTED")) {
      state.failedRequests.push(`${request.method()} ${request.url()} :: ${failure}`);
    }
  });
  page.on("response", (response) => {
    if (response.status() < 400) return;
    const url = new URL(response.url());
    if (url.origin !== new URL(report.baseUrl).origin) return;
    state.httpErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`);
  });

  report.diagnostics.push({ profile, ...state });
  return state;
}

async function waitForLogin(page) {
  await page.getByText("Entrar a", { exact: true }).waitFor({ state: "visible", timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  assert.doesNotMatch(await page.locator("body").innerText(), /Unmatched Route|Page could not be found/i);
}

async function assertVisualHealth(page) {
  await page.waitForFunction(
    () => Array.from(document.images).every((image) => image.complete),
    null,
    { timeout: 15_000 },
  );
  const health = await page.evaluate(() => {
    const title = Array.from(document.querySelectorAll("div")).find(
      (element) => element.textContent?.trim() === "Entrar a",
    );
    const email = document.querySelector('input[placeholder="Email"]');
    const brokenImages = Array.from(document.images)
      .filter((image) => !image.complete || image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src);
    const fonts = Array.from(document.fonts).map((font) => ({
      family: font.family,
      status: font.status,
    }));
    return {
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      brokenImages,
      fonts,
      titleFont: title ? getComputedStyle(title).fontFamily : "",
      inputFont: email ? getComputedStyle(email).fontFamily : "",
    };
  });

  assert.ok(health.documentWidth <= health.viewportWidth + 2, "Hay overflow horizontal.");
  assert.deepEqual(health.brokenImages, [], "Hay imagenes rotas.");
  assert.match(health.titleFont, /PlayfairDisplay/i, "La fuente editorial no esta aplicada.");
  assert.match(health.inputFont, /Inter/i, "La fuente de interfaz no esta aplicada.");
  const usedFonts = health.fonts.filter((font) => /PlayfairDisplay_700|Inter_400|ionicons/i.test(font.family));
  assert.ok(usedFonts.length >= 2, "No se detectaron las fuentes principales.");
  assert.ok(usedFonts.every((font) => font.status === "loaded"), "Hay fuentes principales sin cargar.");
  return health;
}

async function exerciseAuthControls(page) {
  const email = page.locator('input[placeholder="Email"]');
  const password = page.locator('input[placeholder^="Contras"]');
  const submit = page.getByRole("button", { name: "Entrar", exact: true });

  assert.equal(await password.evaluate((input) => input.type), "password");
  assert.equal(await submit.isDisabled(), true);
  await email.fill("qa.readonly@example.com");
  await password.fill("Readonly-2026");
  assert.equal(await submit.isEnabled(), true);

  await page.getByRole("button", { name: /Mostrar contrase/i }).click();
  assert.equal(await password.evaluate((input) => input.type), "text");
  assert.equal(await password.inputValue(), "Readonly-2026");
  await page.getByRole("button", { name: /Ocultar contrase/i }).click();
  assert.equal(await password.evaluate((input) => input.type), "password");

  await page.getByText("Crear cuenta", { exact: true }).click();
  await page.getByText("Crea tu", { exact: true }).waitFor({ state: "visible" });
  assert.equal(await page.getByRole("button", { name: "Crear cuenta", exact: true }).isEnabled(), true);
  await page.getByText("Volver al login", { exact: true }).click();

  await email.clear();
  await password.clear();
  await page.getByText(/Olvidaste tu contrasena/i).click();
  await page.getByText("Recupera", { exact: true }).waitFor({ state: "visible" });
  assert.equal(await page.locator('input[placeholder^="Contras"]').count(), 0);
  const recover = page.getByRole("button", { name: "Enviar enlace", exact: true });
  assert.equal(await recover.isDisabled(), true);
  await page.locator('input[placeholder="Email"]').fill("qa.readonly@example.com");
  assert.equal(await recover.isEnabled(), true);
  await page.getByText("Volver al login", { exact: true }).click();
}

async function checkDeepRouteRedirects(page, baseUrl) {
  for (const pathname of DEEP_ROUTES) {
    await page.goto(routeUrl(baseUrl, pathname), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await waitForLogin(page);
    assert.match(new URL(page.url()).pathname, /^\/mobile\/login\/?$/);
  }
}

async function checkBrowserProfile(report, browser, baseUrl, profile) {
  const device = profile === "iphone" ? devices["iPhone 13"] : devices["Desktop Chrome"];
  const context = await browser.newContext({
    ...device,
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
    serviceWorkers: "allow",
  });
  const page = await context.newPage();
  const diagnostics = attachReadOnlyDiagnostics(context, page, report, profile);

  try {
    await page.goto(routeUrl(baseUrl), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await waitForLogin(page);
    const health = await assertVisualHealth(page);

    if (profile === "iphone") {
      await exerciseAuthControls(page);
      await checkDeepRouteRedirects(page, baseUrl);
    }

    const screenshotPath = path.join(OUT_DIR, `${profile}-login.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    report.screenshots.push(screenshotPath);

    const supportsServiceWorker = await page.evaluate(() => "serviceWorker" in navigator);
    if (profile === "iphone" && supportsServiceWorker) {
      const serviceWorkerUrl = await page.evaluate(async () => {
        const registration = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 60_000)),
        ]);
        return registration.active?.scriptURL ?? "";
      });
      assert.match(serviceWorkerUrl, /\/sw\.js$/);
      await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, {
        timeout: 15_000,
      });
      await context.setOffline(true);
      try {
        await page.reload({ waitUntil: "domcontentloaded", timeout: 20_000 });
        await waitForLogin(page);
      } finally {
        await context.setOffline(false);
      }
    }

    assert.deepEqual(diagnostics.writeRequests, [], "La QA intento realizar peticiones de escritura.");
    assert.deepEqual(diagnostics.pageErrors, [], "La pagina lanzo errores JavaScript.");
    assert.deepEqual(diagnostics.consoleErrors, [], "La pagina escribio errores en consola.");
    assert.deepEqual(diagnostics.failedRequests, [], "Hubo peticiones de red fallidas.");
    assert.deepEqual(diagnostics.httpErrors, [], "Hubo respuestas HTTP fallidas.");
    return health;
  } finally {
    await context.close();
  }
}

async function saveReport(report) {
  report.finishedAt = nowIso();
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2), "utf8");
  const lines = [
    "# QA PWA publica",
    "",
    `- Inicio: ${report.startedAt}`,
    `- Fin: ${report.finishedAt}`,
    `- URL: ${report.baseUrl}`,
    `- Modo: ${report.mode}`,
    "",
    "## Comprobaciones",
    "",
    ...report.steps.map((item) => `- ${item.status.toUpperCase()} ${item.title} (${item.durationMs} ms)`),
    "",
    "## Capturas",
    "",
    ...report.screenshots.map((file) => `- ${file}`),
    "",
  ];
  await writeFile(path.join(OUT_DIR, "report.md"), lines.join("\n"), "utf8");
}

async function main() {
  const baseUrl = normalizeBaseUrl(readArg("base-url") || DEFAULT_BASE_URL);
  const expectedBackend = readArg("expected-backend") || EXPECTED_PRODUCTION_BACKEND;
  const report = createReport(baseUrl);
  await mkdir(OUT_DIR, { recursive: true });

  let browser;
  let api;
  try {
    // Chromium validates the public certificate during the browser checks. The API
    // client ignores the local corporate proxy certificate used by this workstation.
    api = await request.newContext({ ignoreHTTPSErrors: true });
    await checkDeploymentContract(report, api, baseUrl, expectedBackend);
    browser = await chromium.launch({ headless: !process.argv.includes("--headed") });
    await step(report, "login y navegacion en iPhone", () =>
      checkBrowserProfile(report, browser, baseUrl, "iphone"),
    );
    await step(report, "layout de login en escritorio", () =>
      checkBrowserProfile(report, browser, baseUrl, "desktop"),
    );
    console.log(`[qa:pwa] Suite publica OK. Informe: ${path.join(OUT_DIR, "report.md")}`);
  } finally {
    await browser?.close().catch(() => undefined);
    await api?.dispose().catch(() => undefined);
    await saveReport(report).catch(() => undefined);
  }
}

main().catch((error) => {
  console.error("[qa:pwa] Suite publica FAILED");
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
