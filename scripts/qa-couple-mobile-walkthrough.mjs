import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { createClient } from "@supabase/supabase-js";
import { chromium, devices } from "playwright";
import { loadLocalEnv } from "./_load-env.mjs";

const EXPECTED_DEV_REF = "guvqsuyhdqrsbhwxwzjd";
const PROD_REF = "wmmaxlykngeszwvvifqj";
const OUT_DIR = path.join("tmp", "qa-couple-mobile");
const QA_USERS = {
  sergio: {
    label: "Sergio",
    email: "qa.sergio@libro-vivo.dev",
    password: "LibroVivoQA2026!",
  },
  carmen: {
    label: "Carmen",
    email: "qa.carmen@libro-vivo.dev",
    password: "LibroVivoQA2026!",
  },
};

function readArg(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length).trim() : null;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function assertCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function createSupabaseClient(url, key) {
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function projectRefFromUrl(supabaseUrl) {
  const hostname = new URL(supabaseUrl).hostname;
  return hostname.split(".")[0] ?? "";
}

function assertDevProject(supabaseUrl) {
  const projectRef = projectRefFromUrl(supabaseUrl);
  assertCondition(
    projectRef === EXPECTED_DEV_REF,
    `QA movil abortada: NEXT_PUBLIC_SUPABASE_URL apunta a ${projectRef}, no a dev ${EXPECTED_DEV_REF}.`,
  );
  assertCondition(
    projectRef !== PROD_REF,
    "QA movil abortada: nunca ejecutes este recorrido contra produccion.",
  );
  return projectRef;
}

function probeUrl(url) {
  const transport = url.startsWith("https://") ? https : http;
  return new Promise((resolve) => {
    const request = transport.get(url, (response) => {
      response.resume();
      resolve(true);
    });
    request.on("error", () => resolve(false));
    request.setTimeout(1500, () => {
      request.destroy();
      resolve(false);
    });
  });
}

function parsePort(baseUrl) {
  try {
    const url = new URL(baseUrl);
    if (url.port) return Number(url.port);
    if (url.protocol === "https:") return 443;
    return 80;
  } catch {
    return 3000;
  }
}

function buildLocalBaseUrl(port) {
  return `http://localhost:${port}`;
}

function tailText(value, max = 4000) {
  if (typeof value !== "string") return "";
  return value.length > max ? value.slice(-max) : value;
}

async function waitUntilReachable(baseUrl, devProcess, timeoutMs = 120_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt <= timeoutMs) {
    if (await probeUrl(baseUrl)) return true;
    if (devProcess && devProcess.exitCode != null) return false;
    await sleep(1500);
  }
  return false;
}

async function waitForExistingServer(baseUrl, timeoutMs = 15_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt <= timeoutMs) {
    if (await probeUrl(baseUrl)) return true;
    await sleep(1200);
  }
  return false;
}

async function findFreeLocalPort(start = 3700, end = 3799) {
  for (let port = start; port <= end; port += 1) {
    const isBusy = await probeUrl(buildLocalBaseUrl(port));
    if (!isBusy) return port;
  }
  throw new Error(`No hay puertos libres en rango ${start}-${end} para QA movil.`);
}

function spawnNode(args, options = {}) {
  return spawn(process.execPath, args, {
    cwd: process.cwd(),
    windowsHide: true,
    ...options,
  });
}

function buildSupabaseStorageKey(supabaseUrl) {
  const projectRef = projectRefFromUrl(supabaseUrl);
  assertCondition(!!projectRef, "No se pudo derivar storageKey de Supabase.");
  return `sb-${projectRef}-auth-token`;
}

async function authenticateQaUser(client, userInput) {
  const { data, error } = await client.auth.signInWithPassword({
    email: userInput.email,
    password: userInput.password,
  });
  if (error) throw new Error(`Login QA ${userInput.label} fallo: ${error.message}`);
  assertCondition(data.session?.access_token, `QA ${userInput.label} no devolvio sesion.`);
  assertCondition(data.user?.id, `QA ${userInput.label} no devolvio user id.`);
  return {
    ...userInput,
    session: data.session,
    user: data.user,
  };
}

async function readProfile(client, userId, label) {
  const { data, error } = await client
    .from("profiles")
    .select("id,name,role,invite_code,active_garden_id")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(`No se pudo leer perfil QA ${label}: ${error.message}`);
  assertCondition(data?.id, `No existe perfil QA ${label}. Ejecuta scripts/dev-reset-couple-qa.mjs.`);
  return data;
}

async function createAuthedMobileContext(browser, input) {
  const storageKey = buildSupabaseStorageKey(input.supabaseUrl);
  const context = await browser.newContext({
    ...devices["Pixel 5"],
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
  });
  await context.addInitScript(
    ({ key, session }) => {
      window.localStorage.setItem(key, JSON.stringify(session));
    },
    {
      key: storageKey,
      session: input.session,
    },
  );
  await context.grantPermissions(["microphone"], { origin: input.baseUrlOrigin }).catch(() => {});
  return context;
}

async function gotoPath(page, baseUrl, pathname) {
  await page.goto(`${baseUrl.replace(/\/$/, "")}${pathname}`, {
    waitUntil: "domcontentloaded",
  });
}

function createReport(baseUrl, projectRef) {
  return {
    startedAt: new Date().toISOString(),
    projectRef,
    baseUrl,
    viewport: "Pixel 5 / mobile emulation",
    steps: [],
    observations: [],
    screenshots: [],
    diagnostics: [],
  };
}

function nowIso() {
  return new Date().toISOString();
}

function addStep(report, status, title, detail = "") {
  const item = { time: nowIso(), status, title, detail };
  report.steps.push(item);
  const suffix = detail ? ` - ${detail}` : "";
  console.log(`[qa mobile] ${status.toUpperCase()} ${title}${suffix}`);
}

function addObservation(report, severity, title, detail = "") {
  report.observations.push({ time: nowIso(), severity, title, detail });
  const suffix = detail ? ` - ${detail}` : "";
  console.log(`[qa mobile] ${severity.toUpperCase()} ${title}${suffix}`);
}

function sanitizeFileName(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function bodyText(page) {
  return await page
    .locator("body")
    .innerText({ timeout: 8000 })
    .catch((error) => `[[no-body-text:${error instanceof Error ? error.message : String(error)}]]`);
}

async function noteMobileLayout(report, page, label) {
  const metrics = await page
    .evaluate(() => {
      const clientWidth = document.documentElement.clientWidth;
      const offenders = Array.from(document.querySelectorAll("body *"))
        .map((element) => {
          const rect = element.getBoundingClientRect();
          const htmlElement = element instanceof HTMLElement ? element : null;
          const className =
            typeof element.className === "string"
              ? element.className
              : String(element.getAttribute("class") ?? "");
          return {
            tag: element.tagName.toLowerCase(),
            id: element.id || "",
            testId: element.getAttribute("data-testid") || "",
            className: className.slice(0, 160),
            text: (element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
            scrollWidth: htmlElement?.scrollWidth ?? 0,
            clientWidth: htmlElement?.clientWidth ?? 0,
          };
        })
        .filter(
          (entry) =>
            entry.right > clientWidth + 4 ||
            entry.left < -4 ||
            entry.scrollWidth > entry.clientWidth + 4,
        )
        .sort((left, right) => right.right - left.right)
        .slice(0, 6);
      return {
        clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body?.scrollWidth ?? 0,
        scrollHeight: document.documentElement.scrollHeight,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        offenders,
      };
    })
    .catch((error) => ({
      error: error instanceof Error ? error.message : String(error),
    }));

  if ("error" in metrics) {
    addObservation(report, "warn", `${label}: no pude medir layout`, metrics.error);
    return;
  }

  if (metrics.scrollWidth > metrics.clientWidth + 4 || metrics.bodyScrollWidth > metrics.clientWidth + 4) {
    addObservation(
      report,
      "warn",
      `${label}: posible overflow horizontal en movil`,
      `client=${metrics.clientWidth}, doc=${metrics.scrollWidth}, body=${metrics.bodyScrollWidth}, offenders=${JSON.stringify(metrics.offenders)}`,
    );
  }
}

async function capture(report, page, label) {
  await mkdir(OUT_DIR, { recursive: true });
  const index = String(report.screenshots.length + 1).padStart(2, "0");
  const filePath = path.join(OUT_DIR, `${index}-${sanitizeFileName(label)}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  report.screenshots.push({ label, path: filePath, url: page.url() });
  await noteMobileLayout(report, page, label);

  const text = await bodyText(page);
  const lowered = text.toLowerCase();
  if (lowered.includes("cannot coerce the result to a single json object")) {
    addObservation(
      report,
      "error",
      `${label}: aparece aviso amarillo de Supabase`,
      "cannot coerce the result to a single json object",
    );
  }
  if (lowered.includes("error") || lowered.includes("no se pudo")) {
    addObservation(report, "warn", `${label}: texto de error visible`, text.slice(0, 500));
  }
  return { filePath, text };
}

function wirePageDiagnostics(report, label, page) {
  page.on("console", (message) => {
    if (!["error", "warning"].includes(message.type())) return;
    report.diagnostics.push({
      time: nowIso(),
      label,
      kind: `console:${message.type()}`,
      text: message.text().slice(0, 1000),
    });
  });
  page.on("pageerror", (error) => {
    report.diagnostics.push({
      time: nowIso(),
      label,
      kind: "pageerror",
      text: error.message.slice(0, 1000),
    });
  });
  page.on("requestfailed", (request) => {
    report.diagnostics.push({
      time: nowIso(),
      label,
      kind: "requestfailed",
      text: `${request.method()} ${request.url()} :: ${request.failure()?.errorText ?? "unknown"}`.slice(0, 1000),
    });
  });
}

async function callAppApi(baseUrl, auth, endpoint, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${auth.session.access_token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}${endpoint}`, {
    ...init,
    headers,
    credentials: "same-origin",
  });
  const contentType = res.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) {
    const detail =
      payload && typeof payload === "object" && typeof payload.error === "string"
        ? payload.error
        : String(payload);
    throw new Error(`${res.status} ${res.statusText}: ${detail}`);
  }
  return payload;
}

async function step(report, title, fn) {
  addStep(report, "start", title);
  const startedAt = Date.now();
  try {
    const result = await fn();
    addStep(report, "ok", title, `${Date.now() - startedAt}ms`);
    return result;
  } catch (error) {
    addStep(report, "fail", title, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

async function inspectApiState(report, baseUrl, authA, authB, label) {
  const [meA, meB, gardensA, gardensB, invitationsA, invitationsB] = await Promise.all([
    callAppApi(baseUrl, authA, "/api/bonds/me"),
    callAppApi(baseUrl, authB, "/api/bonds/me"),
    callAppApi(baseUrl, authA, "/api/gardens"),
    callAppApi(baseUrl, authB, "/api/gardens"),
    callAppApi(baseUrl, authA, "/api/bonds/invitations"),
    callAppApi(baseUrl, authB, "/api/bonds/invitations"),
  ]);

  const summary = {
    label,
    sergio: {
      name: meA.me?.name ?? null,
      activeGardenId: meA.me?.activeGardenId ?? gardensA.activeGardenId ?? null,
      gardenCount: gardensA.gardens?.length ?? 0,
      invitationCount: invitationsA.invitations?.length ?? 0,
    },
    carmen: {
      name: meB.me?.name ?? null,
      activeGardenId: meB.me?.activeGardenId ?? gardensB.activeGardenId ?? null,
      gardenCount: gardensB.gardens?.length ?? 0,
      invitationCount: invitationsB.invitations?.length ?? 0,
    },
  };
  report.diagnostics.push({ time: nowIso(), kind: "api-state", ...summary });
  return { meA, meB, gardensA, gardensB, invitationsA, invitationsB };
}

async function tryClickByRole(page, role, options, timeout = 5000) {
  const locator = page.getByRole(role, options).first();
  const visible = await locator
    .waitFor({ state: "visible", timeout })
    .then(() => true)
    .catch(() => false);
  if (!visible) return false;
  await locator.click();
  return true;
}

async function dismissPlansWalkthroughIfPresent(page) {
  const walkthrough = page.getByTestId("plans-first-walkthrough");
  const visible = await walkthrough
    .waitFor({ state: "visible", timeout: 4000 })
    .then(() => true)
    .catch(() => false);
  if (!visible) return false;
  await walkthrough.getByText("Saltar", { exact: true }).click();
  await walkthrough.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
  return true;
}

function tomorrowIsoDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

async function runMobileJourney(input) {
  const report = input.report;
  const browser = await chromium.launch({
    headless: !input.headed,
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
    ],
  });
  const baseUrlOrigin = new URL(input.baseUrl).origin;
  const contextA = await createAuthedMobileContext(browser, {
    supabaseUrl: input.supabaseUrl,
    session: input.authA.session,
    baseUrlOrigin,
  });
  const contextB = await createAuthedMobileContext(browser, {
    supabaseUrl: input.supabaseUrl,
    session: input.authB.session,
    baseUrlOrigin,
  });
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  wirePageDiagnostics(report, "Sergio", pageA);
  wirePageDiagnostics(report, "Carmen", pageB);

  try {
    await step(report, "estado inicial API", async () => {
      const state = await inspectApiState(report, input.baseUrl, input.authA, input.authB, "inicial");
      const totalGardens =
        (state.gardensA.gardens?.length ?? 0) + (state.gardensB.gardens?.length ?? 0);
      if (totalGardens > 0) {
        addObservation(
          report,
          "warn",
          "La QA no empieza totalmente limpia",
          `gardens Sergio=${state.gardensA.gardens?.length ?? 0}, Carmen=${state.gardensB.gardens?.length ?? 0}`,
        );
      }
    });

    await step(report, "welcome movil de Sergio y Carmen", async () => {
      await Promise.all([
        gotoPath(pageA, input.baseUrl, "/welcome"),
        gotoPath(pageB, input.baseUrl, "/welcome"),
      ]);
      await pageA.getByText("primero necesitamos preparar", { exact: false }).waitFor({
        state: "visible",
        timeout: 45_000,
      });
      await pageB.getByText("primero necesitamos preparar", { exact: false }).waitFor({
        state: "visible",
        timeout: 45_000,
      });
      const sergioWelcome = await capture(report, pageA, "sergio-welcome-inicial");
      await capture(report, pageB, "carmen-welcome-inicial");
      const welcomeText = sergioWelcome.text.toLowerCase();
      if (welcomeText.includes("vuestro jardin")) {
        addObservation(
          report,
          "warn",
          "Welcome sigue usando 'vuestro jardin'",
          "El copy acordado era 'tu jardin' en la primera frase.",
        );
      }
      if (welcomeText.includes("senalaremos") || welcomeText.includes("acompanaremos")) {
        addObservation(
          report,
          "warn",
          "Welcome tiene textos sin tildes visibles",
          "Detectado 'senalaremos'/'acompanaremos' en la pantalla movil.",
        );
      }
    });

    await step(report, "Sergio abre invitacion y busca a Carmen por codigo", async () => {
      await gotoPath(pageA, input.baseUrl, "/bonds/invite");
      await pageA.getByRole("heading", { name: "Invitar a alguien" }).first().waitFor({
        state: "visible",
        timeout: 45_000,
      });
      await capture(report, pageA, "sergio-bonds-invite-vacio");

      await pageA.getByPlaceholder("Codigo de 8 caracteres").fill(input.profileB.invite_code);
      await pageA.getByRole("button", { name: "Comprobar codigo" }).click();
      await pageA.getByText("Persona encontrada", { exact: false }).waitFor({
        state: "visible",
        timeout: 30_000,
      });
      await capture(report, pageA, "sergio-bonds-invite-carmen-encontrada");

      const gardenTitleInput = pageA.getByLabel("Nombre del jardin").first();
      await gardenTitleInput.fill("Jardin QA pareja movil");
      await pageA.getByRole("button", { name: "Enviar invitacion" }).click();
      await pageA.getByText("Invitacion enviada", { exact: false }).waitFor({
        state: "visible",
        timeout: 30_000,
      });
      await capture(report, pageA, "sergio-bonds-invitacion-enviada");
    });

    await step(report, "comprobar invitacion pendiente por API", async () => {
      const state = await inspectApiState(report, input.baseUrl, input.authA, input.authB, "tras enviar invitacion");
      const invitations = state.invitationsB.invitations ?? [];
      const pending = invitations.find(
        (invitation) =>
          invitation.status === "pending" &&
          invitation.invitedByUserId !== input.authB.user.id,
      );
      assertCondition(!!pending?.id, "Carmen no ve invitacion pendiente por API.");
      if ((state.gardensA.gardens?.length ?? 0) > 0 || (state.gardensB.gardens?.length ?? 0) > 0) {
        addObservation(
          report,
          "error",
          "Enviar la invitacion ha creado jardin antes de aceptar",
          `gardens Sergio=${state.gardensA.gardens?.length ?? 0}, Carmen=${state.gardensB.gardens?.length ?? 0}`,
        );
      }
    });

    await step(report, "Carmen ve la invitacion desde welcome", async () => {
      await gotoPath(pageB, input.baseUrl, "/welcome");
      await pageB.getByText("Aceptar", { exact: false }).first().waitFor({
        state: "visible",
        timeout: 45_000,
      });
      await capture(report, pageB, "carmen-welcome-con-invitacion");
    });

    await step(report, "Carmen acepta desde pantalla de pendientes en onboarding", async () => {
      await gotoPath(pageB, input.baseUrl, "/bonds/pending?onboarding=1");
      await pageB.getByRole("button", { name: "Aceptar y crear jardin" }).click();
      await pageB.waitForURL(/\/home(?:\?|$)/, { timeout: 45_000 }).catch(async () => {
        await capture(report, pageB, "carmen-aceptacion-no-redirigio-home");
        throw new Error(`Tras aceptar no redirigio a home. URL actual: ${pageB.url()}`);
      });
      await capture(report, pageB, "carmen-home-tras-aceptar");
    });

    await step(report, "comparar jardines activos tras aceptar", async () => {
      const state = await inspectApiState(report, input.baseUrl, input.authA, input.authB, "tras aceptar");
      const activeA = state.gardensA.activeGardenId ?? state.meA.me?.activeGardenId ?? null;
      const activeB = state.gardensB.activeGardenId ?? state.meB.me?.activeGardenId ?? null;
      assertCondition(!!activeA, "Sergio queda sin activeGardenId tras aceptar Carmen.");
      assertCondition(!!activeB, "Carmen queda sin activeGardenId tras aceptar.");
      assertCondition(activeA === activeB, `No comparten garden activo: Sergio=${activeA}, Carmen=${activeB}`);
      assertCondition((state.gardensA.gardens?.length ?? 0) === 1, "Sergio no ve exactamente un jardin.");
      assertCondition((state.gardensB.gardens?.length ?? 0) === 1, "Carmen no ve exactamente un jardin.");
    });

    await step(report, "Sergio abre home con tour guiado", async () => {
      await gotoPath(pageA, input.baseUrl, "/home?tour=1");
      await pageA.getByText("Libro Vivo", { exact: false }).first().waitFor({
        state: "visible",
        timeout: 45_000,
      });
      const tourVisible = await pageA
        .getByTestId("home-first-walkthrough")
        .waitFor({ state: "visible", timeout: 12_000 })
        .then(() => true)
        .catch(() => false);
      await capture(report, pageA, tourVisible ? "sergio-home-tour-visible" : "sergio-home-sin-tour");
      if (!tourVisible) {
        addObservation(
          report,
          "warn",
          "No salio tour guiado en home",
          "El flujo con ?tour=1 no ha mostrado el primer paseo.",
        );
      }
    });

    await step(report, "chat movil: abrir ambos, probar realtime y mensaje", async () => {
      await Promise.all([
        gotoPath(pageA, input.baseUrl, "/chat"),
        gotoPath(pageB, input.baseUrl, "/chat"),
      ]);
      await pageA.getByTestId("garden-chat-draft").waitFor({ state: "visible", timeout: 60_000 });
      await pageB.getByTestId("garden-chat-draft").waitFor({ state: "visible", timeout: 60_000 });
      await capture(report, pageA, "sergio-chat-abierto");
      await capture(report, pageB, "carmen-chat-abierto");

      const realtimeA = await pageA
        .getByText("Realtime activo", { exact: false })
        .first()
        .waitFor({ state: "visible", timeout: 20_000 })
        .then(() => true)
        .catch(() => false);
      const realtimeB = await pageB
        .getByText("Realtime activo", { exact: false })
        .first()
        .waitFor({ state: "visible", timeout: 20_000 })
        .then(() => true)
        .catch(() => false);
      if (!realtimeA || !realtimeB) {
        addObservation(
          report,
          "warn",
          "Realtime no se confirmo visualmente en chat",
          `Sergio=${realtimeA}, Carmen=${realtimeB}`,
        );
      }

      const chatTextA = (await pageA.locator("body").innerText()).toLowerCase();
      const chatTextB = (await pageB.locator("body").innerText()).toLowerCase();
      if (!chatTextA.includes("2 miembro") || !chatTextB.includes("2 miembro")) {
        addObservation(
          report,
          "warn",
          "El chat no muestra claramente a las dos personas del jardin",
          `Sergio ve 2=${chatTextA.includes("2 miembro")}, Carmen ve 2=${chatTextB.includes("2 miembro")}`,
        );
      }
      if (!chatTextA.includes("carmen") || !chatTextB.includes("sergio")) {
        addObservation(
          report,
          "warn",
          "El panel lateral del chat no nombra a la otra persona",
          `Sergio ve Carmen=${chatTextA.includes("carmen")}, Carmen ve Sergio=${chatTextB.includes("sergio")}`,
        );
      }

      const message = `QA movil chat ${Date.now()}`;
      await pageA.getByTestId("garden-chat-draft").fill(message);
      await pageA.getByTestId("garden-chat-send").click();
      const seenByCarmen = await pageB
        .getByText(message, { exact: false })
        .waitFor({ state: "visible", timeout: 25_000 })
        .then(() => true)
        .catch(() => false);
      if (!seenByCarmen) {
        addObservation(report, "error", "Carmen no vio el mensaje de chat sin recargar", message);
      }
      await capture(report, pageB, seenByCarmen ? "carmen-chat-recibe-mensaje" : "carmen-chat-no-recibe-mensaje");
    });

    await step(report, "planes movil: abrir semilla rapida y observar interfaz", async () => {
      await gotoPath(pageA, input.baseUrl, "/plans");
      await pageA.getByTestId("plans-new-seed").waitFor({ state: "visible", timeout: 60_000 });
      await dismissPlansWalkthroughIfPresent(pageA);
      await capture(report, pageA, "sergio-plans-inicial");

      await pageA.getByTestId("plans-new-seed").click();
      await pageA.getByTestId("seed-planting-mode-modal").waitFor({ state: "visible", timeout: 20_000 });
      await capture(report, pageA, "sergio-plans-modal-nueva-semilla");

      await pageA.getByTestId("seed-planting-mode-quick").click();
      await pageA.getByPlaceholder(/t/i).first().waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
      await capture(report, pageA, "sergio-plans-semilla-rapida");

      const titleInput = pageA.getByPlaceholder(/t/i).first();
      const titleVisible = await titleInput
        .waitFor({ state: "visible", timeout: 8000 })
        .then(() => true)
        .catch(() => false);
      if (titleVisible) {
        await titleInput.fill(`Semilla QA movil ${Date.now()}`);
        const saveClicked = await tryClickByRole(pageA, "button", { name: "Guardar semilla" }, 8000);
        if (!saveClicked) {
          addObservation(report, "warn", "No encontre el boton Guardar semilla tras abrir modo rapido");
        } else {
          await pageA
            .getByText("Semilla QA movil", { exact: false })
            .first()
            .waitFor({ state: "visible", timeout: 30_000 })
            .catch(() => {});
          await capture(report, pageA, "sergio-plans-tras-guardar-semilla");
        }
      } else {
        addObservation(report, "warn", "No encontre el campo titulo de semilla rapida en movil");
      }
    });

    await step(report, "preparacion compartida: abrir dossier en dos moviles", async () => {
      await gotoPath(pageA, input.baseUrl, "/plans");
      await dismissPlansWalkthroughIfPresent(pageA);
      await pageA.getByTestId("plans-new-seed").click();
      await pageA.getByTestId("seed-planting-mode-prepare").click();
      await pageA.getByTestId("seed-preparation-editor-modal").waitFor({
        state: "visible",
        timeout: 45_000,
      });
      await pageA.getByTestId("seed-preparation-title").fill(`Dossier QA movil ${Date.now()}`);
      await pageA.getByTestId("seed-preparation-summary").fill("Prueba movil compartida");
      await pageA.getByTestId("seed-preparation-starts-on").fill(tomorrowIsoDate()).catch(() => {});
      await capture(report, pageA, "sergio-dossier-preparacion-abierto");
      await pageA.getByTestId("seed-preparation-collaboration-shared").click();
      await pageA.getByTestId("seed-preparation-save").click();
      await pageA.getByTestId("plans-preparation-card").first().waitFor({ state: "visible", timeout: 30_000 });

      await gotoPath(pageB, input.baseUrl, "/plans");
      await dismissPlansWalkthroughIfPresent(pageB);
      const carmenCardVisible = await pageB
        .getByTestId("plans-preparation-card")
        .first()
        .waitFor({ state: "visible", timeout: 30_000 })
        .then(() => true)
        .catch(() => false);
      if (!carmenCardVisible) {
        addObservation(
          report,
          "error",
          "Carmen no ve el dossier compartido en Preparando",
          "Posible problema de sync/visibilidad.",
        );
        await capture(report, pageB, "carmen-no-ve-dossier-compartido");
        return;
      }
      await pageB.getByTestId("plans-preparation-card").first().getByRole("button", { name: /Abrir dossier/i }).click();
      await pageB.getByTestId("seed-preparation-editor-modal").waitFor({ state: "visible", timeout: 30_000 });
      await capture(report, pageB, "carmen-dossier-compartido-abierto");

      const presenceSeen = await pageA
        .getByText(/Dentro ahora:\s*2/i)
        .waitFor({ state: "visible", timeout: 20_000 })
        .then(() => true)
        .catch(() => false);
      if (!presenceSeen) {
        addObservation(
          report,
          "error",
          "Sergio no detecta a Carmen dentro del dossier",
          "Reproduce el problema de presencia/sync.",
        );
        await capture(report, pageA, "sergio-dossier-sin-presencia-carmen");
      }
    });
  } catch (error) {
    await capture(report, pageA, "failure-sergio").catch(() => {});
    await capture(report, pageB, "failure-carmen").catch(() => {});
    throw error;
  } finally {
    await contextA.close().catch(() => {});
    await contextB.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

function renderReportMarkdown(report) {
  const lines = [
    "# QA movil pareja",
    "",
    `- Fecha: ${report.startedAt}`,
    `- Proyecto Supabase: ${report.projectRef}`,
    `- Base URL: ${report.baseUrl}`,
    `- Dispositivo: ${report.viewport}`,
    "",
    "## Pasos",
    "",
    ...report.steps.map((item) => (
      `- ${item.status.toUpperCase()} ${item.title}${item.detail ? `: ${item.detail}` : ""}`
    )),
    "",
    "## Observaciones",
    "",
    ...(report.observations.length
      ? report.observations.map((item) => (
          `- ${item.severity.toUpperCase()} ${item.title}${item.detail ? `: ${item.detail}` : ""}`
        ))
      : ["- Sin observaciones automaticas."]),
    "",
    "## Capturas",
    "",
    ...(report.screenshots.length
      ? report.screenshots.map((shot) => `- ${shot.label}: ${shot.path} (${shot.url})`)
      : ["- Sin capturas."]),
    "",
    "## Diagnosticos",
    "",
    ...(report.diagnostics.length
      ? report.diagnostics.map((item) => `- ${item.kind ?? "diagnostic"} ${item.label ?? ""}: ${JSON.stringify(item)}`)
      : ["- Sin diagnosticos."]),
    "",
  ];
  return lines.join("\n");
}

async function saveReport(report) {
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2), "utf8");
  await writeFile(path.join(OUT_DIR, "report.md"), renderReportMarkdown(report), "utf8");
}

async function run() {
  await loadLocalEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  assertCondition(!!supabaseUrl, "Falta NEXT_PUBLIC_SUPABASE_URL.");
  assertCondition(!!anonKey, "Falta NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  const projectRef = assertDevProject(supabaseUrl);

  const explicitBaseUrl = readArg("base-url");
  const useEnvBaseUrl = hasFlag("--use-env-base-url");
  const envBaseUrl =
    useEnvBaseUrl && process.env.E2E_APP_BASE_URL ? process.env.E2E_APP_BASE_URL.trim() : "";
  const resolvedBaseUrl = explicitBaseUrl || envBaseUrl;
  const devPort = resolvedBaseUrl ? parsePort(resolvedBaseUrl) : await findFreeLocalPort();
  const baseUrl = resolvedBaseUrl || buildLocalBaseUrl(devPort);
  const report = createReport(baseUrl, projectRef);

  const clientA = createSupabaseClient(supabaseUrl, anonKey);
  const clientB = createSupabaseClient(supabaseUrl, anonKey);
  const authA = await authenticateQaUser(clientA, QA_USERS.sergio);
  const authB = await authenticateQaUser(clientB, QA_USERS.carmen);
  const profileA = await readProfile(clientA, authA.user.id, QA_USERS.sergio.label);
  const profileB = await readProfile(clientB, authB.user.id, QA_USERS.carmen.label);

  report.diagnostics.push({
    time: nowIso(),
    kind: "qa-users",
    sergio: {
      id: authA.user.id,
      email: authA.email,
      name: profileA.name,
      inviteCode: profileA.invite_code,
      activeGardenId: profileA.active_garden_id,
    },
    carmen: {
      id: authB.user.id,
      email: authB.email,
      name: profileB.name,
      inviteCode: profileB.invite_code,
      activeGardenId: profileB.active_garden_id,
    },
  });

  let devProcess = null;
  let devStdout = "";
  let devStderr = "";
  const fallbackBaseUrls = [
    process.env.E2E_APP_BASE_URL?.trim() ?? "",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3600",
  ].filter(Boolean);

  if (!resolvedBaseUrl) {
    devProcess = spawnNode(
      ["node_modules/next/dist/bin/next", "dev", "--webpack", "--port", String(devPort)],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    devProcess.stdout?.on("data", (chunk) => {
      devStdout += chunk.toString();
      devStdout = tailText(devStdout, 12000);
    });
    devProcess.stderr?.on("data", (chunk) => {
      devStderr += chunk.toString();
      devStderr = tailText(devStderr, 12000);
    });
  }

  try {
    let appBaseUrl = baseUrl;
    if (devProcess) {
      const ready = await waitUntilReachable(baseUrl, devProcess);
      if (!ready) {
        const lockDetected = /unable to acquire lock/i.test(devStderr);
        if (lockDetected) {
          for (const candidate of [...new Set(fallbackBaseUrls)]) {
            if (!(await waitForExistingServer(candidate))) continue;
            appBaseUrl = candidate;
            report.baseUrl = candidate;
            addObservation(report, "warn", "Reutilizando servidor Next existente", candidate);
            break;
          }
        }

        if (appBaseUrl === baseUrl) {
          throw new Error(
            `No se pudo levantar app para QA movil en ${baseUrl}.\n` +
              `STDOUT tail:\n${tailText(devStdout)}\n` +
              `STDERR tail:\n${tailText(devStderr)}`,
          );
        }
      }
    }

    await runMobileJourney({
      baseUrl: appBaseUrl,
      supabaseUrl,
      headed: hasFlag("--headed"),
      authA,
      authB,
      profileA,
      profileB,
      report,
    });
  } catch (error) {
    addObservation(report, "error", "QA movil interrumpida", error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    await saveReport(report).catch(() => {});
    if (devProcess?.exitCode == null) {
      devProcess.kill("SIGTERM");
      await sleep(800);
      if (devProcess.exitCode == null) devProcess.kill("SIGKILL");
    }
  }

  console.log(`QA movil pareja OK. Informe: ${path.join(OUT_DIR, "report.md")}`);
}

run().catch((error) => {
  console.error("QA movil pareja FAILED");
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
