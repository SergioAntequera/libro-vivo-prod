"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { toErrorMessage } from "@/lib/errorMessage";
import { ensureSuperadminOrRedirect, getSettings } from "@/lib/auth";
import { PRODUCT_HOME_WELCOME_PLACEHOLDER, resolveHomeWelcomeText } from "@/lib/productIdentity";
import { supabase } from "@/lib/supabase";
import {
  getUiThemeTokenCatalogCodeHints,
  getUiThemeTokenDefinition,
  UI_THEME_TOKEN_DEFINITIONS,
  UI_THEME_TOKEN_CATALOG_KEY,
  UI_THEME_TOKEN_DEFAULTS,
  UI_THEME_TOKEN_GROUPS,
  UI_THEME_TOKEN_TO_CSS_VAR,
  type UiThemeTokenCode,
} from "@/lib/uiThemeTokens";

type SystemPanel = "welcome" | "tokens" | "bridge" | null;
type SystemPanelId = Exclude<SystemPanel, null>;
type SystemPanelDrag =
  | {
      panel: SystemPanelId;
      startClientX: number;
      startClientY: number;
      startOffsetX: number;
      startOffsetY: number;
    }
  | null;

type TokenCatalogRow = {
  code: string | null;
  label: string | null;
  sort_order: number | null;
  enabled: boolean | null;
  color: string | null;
  metadata: Record<string, unknown> | null;
};

type TokenDraft = {
  code: UiThemeTokenCode;
  label: string;
  value: string;
  enabled: boolean;
  sortOrder: number;
};

type TokenGroupKey = (typeof UI_THEME_TOKEN_GROUPS)[number]["key"];

const TOKEN_GROUPS: Array<{
  key: TokenGroupKey;
  label: string;
  definitions: Array<(typeof UI_THEME_TOKEN_DEFINITIONS)[number]>;
}> = UI_THEME_TOKEN_GROUPS.map((group) => ({
  key: group.key,
  label: group.label,
  definitions: UI_THEME_TOKEN_DEFINITIONS.filter((definition) => definition.group === group.key),
}));

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function isMissingSettingsGardenNameColumn(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const message =
    "message" in error && typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message
      : "";
  const code =
    "code" in error && typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: string }).code
      : "";

  return code === "PGRST204" && /garden_name/i.test(message) && /settings/i.test(message);
}

function humanizeTokenCode(code: UiThemeTokenCode) {
  return getUiThemeTokenDefinition(code).label;
}

function extractTokenValue(row: TokenCatalogRow | undefined, code: UiThemeTokenCode) {
  const direct = normalizeText(row?.color);
  if (direct) return direct;
  const metadataValue =
    row?.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? normalizeText((row.metadata as Record<string, unknown>).value)
      : "";
  if (metadataValue) return metadataValue;
  return UI_THEME_TOKEN_DEFAULTS[code];
}

function buildTokenDrafts(rows: TokenCatalogRow[]) {
  const rowByCode = new Map(
    rows
      .map((row) => [normalizeText(row.code).toLowerCase(), row] as const)
      .filter(([code]) => code.length > 0),
  );

  return getUiThemeTokenCatalogCodeHints().map((hint, index) => {
    const code = hint as UiThemeTokenCode;
    const row = rowByCode.get(code);
    return {
      code,
      label: normalizeText(row?.label) || humanizeTokenCode(code),
      value: extractTokenValue(row, code),
      enabled: row?.enabled ?? true,
      sortOrder: row?.sort_order ?? (index + 1) * 10,
    } satisfies TokenDraft;
  });
}

function isHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim()) || /^#[0-9a-fA-F]{3}$/.test(value.trim());
}

function togglePanel(current: SystemPanel, next: Exclude<SystemPanel, null>) {
  return current === next ? null : next;
}

function SystemFloatingPanel(props: {
  eyebrow: string;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  style?: CSSProperties;
  onHeaderPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <aside
      style={props.style}
      className={`mt-4 flex w-full flex-col overflow-hidden rounded-[30px] border border-[#dfe8da] bg-[rgba(255,255,255,0.98)] p-5 shadow-[0_18px_42px_rgba(21,36,24,0.12)] lg:absolute lg:right-4 lg:top-4 lg:mt-0 lg:max-h-[calc(100%-2rem)] lg:w-[400px] ${props.className ?? ""}`}
    >
      <div
        className={`mb-4 flex items-start justify-between gap-3 ${
          props.onHeaderPointerDown ? "cursor-grab active:cursor-grabbing" : ""
        }`}
        onPointerDown={props.onHeaderPointerDown}
      >
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[#61755c]">
            {props.eyebrow}
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            {props.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={props.onClose}
          className="rounded-full border border-[#d9e4d3] px-2.5 py-1 text-xs text-slate-600 transition hover:bg-[#f7faf4]"
        >
          Cerrar
        </button>
      </div>
      {props.description ? (
        <p className="mb-4 text-sm leading-6 text-slate-600">{props.description}</p>
      ) : null}
      <div className={`min-h-0 flex-1 overflow-y-auto ${props.contentClassName ?? ""}`}>
        {props.children}
      </div>
    </aside>
  );
}

function SystemPreviewCard(props: {
  groupKey: TokenGroupKey;
  activeGroupKey: TokenGroupKey;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
  soft?: boolean;
}) {
  const isActive = props.groupKey === props.activeGroupKey;
  return (
    <section
      className={`border p-5 ${props.className ?? ""}`}
      style={{
        borderRadius: "var(--lv-radius-lg)",
        borderColor: isActive ? "var(--lv-primary)" : "var(--lv-border)",
        background: props.soft ? "var(--lv-surface-soft)" : "var(--lv-surface)",
        boxShadow: isActive ? "var(--lv-shadow-md)" : "var(--lv-shadow-sm)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div
            className="text-[11px] uppercase tracking-[0.18em]"
            style={{ color: "var(--lv-text-muted)" }}
          >
            {props.title}
          </div>
          <p className="mt-2 text-sm leading-6" style={{ color: "var(--lv-text-muted)" }}>
            {props.description}
          </p>
        </div>
        {isActive ? (
          <div
            className="shrink-0 rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.16em]"
            style={{
              borderColor: "var(--lv-primary)",
              background: "var(--lv-primary-soft)",
              color: "var(--lv-primary-strong)",
            }}
          >
            Activa
          </div>
        ) : null}
      </div>
      <div className="mt-4">{props.children}</div>
    </section>
  );
}

function SystemTokenMiniPreview(props: {
  definition: (typeof UI_THEME_TOKEN_DEFINITIONS)[number];
}) {
  const { definition } = props;
  const tokenValue = `var(${definition.cssVar})`;

  if (definition.code === "lv_bg") {
    return (
      <div className="mt-3 rounded-[18px] border p-2" style={{ borderColor: "var(--lv-border)", background: "var(--lv-bg)" }}>
        <div className="text-[10px] uppercase tracking-[0.16em]" style={{ color: "var(--lv-text-muted)" }}>
          Shell
        </div>
      </div>
    );
  }

  if (definition.code === "lv_bg_soft") {
    return (
      <div className="mt-3 rounded-[18px] border p-2" style={{ borderColor: "var(--lv-border)", background: "var(--lv-bg-soft)" }}>
        <div className="text-[10px] uppercase tracking-[0.16em]" style={{ color: "var(--lv-text-muted)" }}>
          Fondo suave
        </div>
      </div>
    );
  }

  if (definition.code === "lv_surface" || definition.code === "lv_surface_soft") {
    return (
      <div
        className="mt-3 rounded-[18px] border px-3 py-2"
        style={{
          borderColor: "var(--lv-border)",
          background:
            definition.code === "lv_surface" ? "var(--lv-surface)" : "var(--lv-surface-soft)",
          boxShadow: "var(--lv-shadow-sm)",
        }}
      >
        <div className="text-xs font-medium" style={{ color: "var(--lv-text)" }}>
          Tarjeta de ejemplo
        </div>
      </div>
    );
  }

  if (definition.code === "lv_border" || definition.code === "lv_border_strong") {
    return (
      <div
        className="mt-3 rounded-[18px] border px-3 py-2 text-xs"
        style={{
          borderColor: tokenValue,
          background: "var(--lv-surface)",
          color: "var(--lv-text-muted)",
        }}
      >
        Contorno visible
      </div>
    );
  }

  if (definition.code === "lv_text") {
    return (
      <div className="mt-3">
        <div className="text-sm font-semibold" style={{ color: "var(--lv-text)" }}>
          Titulo de ejemplo
        </div>
      </div>
    );
  }

  if (definition.code === "lv_text_muted") {
    return (
      <div className="mt-3 text-xs leading-5" style={{ color: "var(--lv-text-muted)" }}>
        Este es el tono auxiliar para ayudas, descripciones y contexto.
      </div>
    );
  }

  if (definition.code === "lv_focus") {
    return (
      <div
        className="mt-3 rounded-[18px] border bg-[var(--lv-surface)] px-3 py-2"
        style={{
          borderColor: "var(--lv-border-strong)",
          boxShadow: "0 0 0 3px color-mix(in srgb, var(--lv-focus) 28%, transparent)",
        }}
      >
        <div className="text-xs" style={{ color: "var(--lv-text)" }}>
          Estado enfocado
        </div>
      </div>
    );
  }

  if (definition.group === "primary") {
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {definition.code === "lv_primary" ? (
          <div
            className="px-3 py-2 text-xs font-medium text-white"
            style={{
              borderRadius: "var(--lv-radius-sm)",
              background: "var(--lv-primary)",
              boxShadow: "var(--lv-shadow-sm)",
            }}
          >
            CTA
          </div>
        ) : null}
        {definition.code === "lv_primary_strong" ? (
          <div
            className="px-3 py-2 text-xs font-medium text-white"
            style={{
              borderRadius: "var(--lv-radius-sm)",
              background: "var(--lv-primary-strong)",
              boxShadow: "var(--lv-shadow-sm)",
            }}
          >
            Hover
          </div>
        ) : null}
        {definition.code === "lv_primary_soft" ? (
          <div
            className="rounded-full border px-3 py-1 text-xs"
            style={{
              borderColor: "color-mix(in srgb, var(--lv-primary) 16%, var(--lv-surface))",
              background: "var(--lv-primary-soft)",
              color: "var(--lv-primary-strong)",
            }}
          >
            Fondo suave
          </div>
        ) : null}
      </div>
    );
  }

  if (definition.group === "semantic") {
    const label = definition.code.startsWith("lv_success")
      ? "Exito"
      : definition.code.startsWith("lv_info")
        ? "Info"
        : definition.code.startsWith("lv_warning")
          ? "Warning"
          : "Error";
    const tone = definition.code.startsWith("lv_success")
      ? { color: "var(--lv-success)", background: "var(--lv-success-soft)" }
      : definition.code.startsWith("lv_info")
        ? { color: "var(--lv-info)", background: "var(--lv-info-soft)" }
        : definition.code.startsWith("lv_warning")
          ? { color: "var(--lv-warning)", background: "var(--lv-warning-soft)" }
          : { color: "var(--lv-danger)", background: "var(--lv-danger-soft)" };
    return (
      <div
        className="mt-3 rounded-[18px] border px-3 py-2 text-xs"
        style={{
          borderColor: tone.color,
          background: tone.background,
          color: tone.color,
        }}
      >
        {label} visible
      </div>
    );
  }

  if (definition.group === "shape") {
    return (
      <div
        className="mt-3 h-10 border"
        style={{
          borderRadius: tokenValue,
          borderColor: "var(--lv-border)",
          background: "var(--lv-surface-soft)",
        }}
      />
    );
  }

  if (definition.group === "depth") {
    return (
      <div
        className="mt-3 rounded-[18px] border bg-[var(--lv-surface)] px-3 py-3 text-xs"
        style={{
          borderColor: "var(--lv-border)",
          boxShadow: tokenValue,
          color: "var(--lv-text)",
        }}
      >
        Elevacion
      </div>
    );
  }

  if (definition.group === "feedback") {
    if (definition.code === "lv_overlay_scrim") {
      return (
        <div className="mt-3 rounded-[18px] border p-2" style={{ borderColor: "var(--lv-border)", background: "var(--lv-overlay-scrim)" }}>
          <div className="mx-auto rounded-[14px] border bg-[var(--lv-surface)] px-3 py-2 text-xs" style={{ borderColor: "var(--lv-border)", color: "var(--lv-text)" }}>
            Modal
          </div>
        </div>
      );
    }
    return (
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--lv-progress-track)]">
        <div className="h-full w-[62%] rounded-full bg-[var(--lv-progress-fill)]" />
      </div>
    );
  }

  if (definition.group === "map") {
    return (
      <div className="mt-3 flex gap-2">
        <div
          className="flex h-9 min-w-9 items-center justify-center px-3 text-xs"
          style={{
            borderRadius: "var(--lv-radius-md)",
            border: "1px solid var(--lv-map-chrome-border)",
            background: "var(--lv-map-chrome-bg)",
            color: "var(--lv-map-chrome-text)",
            boxShadow: "var(--lv-map-chrome-shadow)",
          }}
        >
          +
        </div>
        <div
          className="flex h-9 items-center justify-center px-3 text-xs"
          style={{
            borderRadius: "999px",
            border: "1px solid var(--lv-map-chrome-border)",
            background: "var(--lv-map-chrome-bg)",
            color: "var(--lv-map-chrome-text)",
            boxShadow: "var(--lv-map-chrome-shadow)",
          }}
        >
          Overlay
        </div>
      </div>
    );
  }

  return null;
}

export default function AdminSystemPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<SystemPanel>(null);
  const [persistedWelcomeText, setPersistedWelcomeText] = useState("");
  const [persistedGardenName, setPersistedGardenName] = useState("");
  const [persistedTokens, setPersistedTokens] = useState<TokenDraft[]>([]);
  const [welcomeText, setWelcomeText] = useState("");
  const [gardenName, setGardenName] = useState("");
  const [tokenDrafts, setTokenDrafts] = useState<TokenDraft[]>([]);
  const [activeTokenGroup, setActiveTokenGroup] = useState<TokenGroupKey>(TOKEN_GROUPS[0].key);
  const [panelDrag, setPanelDrag] = useState<SystemPanelDrag>(null);
  const [panelOffsets, setPanelOffsets] = useState<Record<SystemPanelId, { x: number; y: number }>>({
    welcome: { x: 0, y: 0 },
    tokens: { x: 0, y: 0 },
    bridge: { x: 0, y: 0 },
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const session = await ensureSuperadminOrRedirect(router);
      if (!session || cancelled) {
        setLoading(false);
        return;
      }

      try {
        const [settings, tokenRowsRes] = await Promise.all([
          getSettings(),
          supabase
            .from("catalog_items")
            .select("code,label,sort_order,enabled,color,metadata")
            .eq("catalog_key", UI_THEME_TOKEN_CATALOG_KEY)
            .order("sort_order", { ascending: true })
            .order("code", { ascending: true }),
        ]);

        if (tokenRowsRes.error) throw tokenRowsRes.error;

        const drafts = buildTokenDrafts((tokenRowsRes.data as TokenCatalogRow[] | null) ?? []);
        const nextWelcome = String(settings?.welcome_text ?? "");
        const nextGardenName = String(settings?.garden_name ?? "");

        if (cancelled) return;
        setPersistedWelcomeText(nextWelcome);
        setPersistedGardenName(nextGardenName);
        setWelcomeText(nextWelcome);
        setGardenName(nextGardenName);
        setPersistedTokens(drafts);
        setTokenDrafts(drafts);
      } catch (error) {
        if (cancelled) return;
        setMsg(
          error instanceof Error
            ? error.message
            : "No se pudo cargar el sistema base.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!panelDrag) return;
    const activeDrag = panelDrag;

    function handlePointerMove(event: PointerEvent) {
      setPanelOffsets((current) => ({
        ...current,
        [activeDrag.panel]: {
          x: activeDrag.startOffsetX + (event.clientX - activeDrag.startClientX),
          y: activeDrag.startOffsetY + (event.clientY - activeDrag.startClientY),
        },
      }));
    }

    function handlePointerUp() {
      setPanelDrag(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [panelDrag]);

  const tokenDraftByCode = useMemo(
    () => new Map(tokenDrafts.map((token) => [token.code, token] as const)),
    [tokenDrafts],
  );
  const visibleTokenGroup =
    TOKEN_GROUPS.find((group) => group.key === activeTokenGroup) ?? TOKEN_GROUPS[0];

  const isDirty =
    welcomeText !== persistedWelcomeText ||
    gardenName !== persistedGardenName ||
    JSON.stringify(tokenDrafts) !== JSON.stringify(persistedTokens);

  const resolvedWelcomePreview = useMemo(
    () =>
      resolveHomeWelcomeText(welcomeText, {
        profileName: "Tu nombre",
        gardenName: gardenName || undefined,
      }),
    [gardenName, welcomeText],
  );

  const previewVars = useMemo(() => {
    return tokenDrafts.reduce<Record<string, string>>((acc, token) => {
      const cssVar = UI_THEME_TOKEN_TO_CSS_VAR[token.code];
      acc[cssVar] = token.value || UI_THEME_TOKEN_DEFAULTS[token.code];
      return acc;
    }, {});
  }, [tokenDrafts]);

  const previewStyle = useMemo(
    () =>
      ({
        ...previewVars,
        background:
          "radial-gradient(circle at 12% 12%, color-mix(in srgb, var(--lv-primary-soft) 85%, white) 0%, transparent 34%), radial-gradient(circle at 88% 18%, color-mix(in srgb, var(--lv-info-soft) 88%, white) 0%, transparent 30%), linear-gradient(180deg, var(--lv-surface) 0%, var(--lv-bg-soft) 100%)",
        color: "var(--lv-text)",
      }) as CSSProperties,
    [previewVars],
  );

  async function handleSave() {
    setSaving(true);
    setMsg(null);

    try {
      const catalogRow = {
        key: UI_THEME_TOKEN_CATALOG_KEY,
        label: "UI Theme Tokens",
        description:
          "Tokens globales del shell para superficies, texto, primario y estados.",
        is_active: true,
      };

      const tokenRows = tokenDrafts.map((token) => ({
        catalog_key: UI_THEME_TOKEN_CATALOG_KEY,
        code: token.code,
        label: token.label.trim() || humanizeTokenCode(token.code),
        sort_order: token.sortOrder,
        enabled: token.enabled,
        color: token.value.trim() || UI_THEME_TOKEN_DEFAULTS[token.code],
        icon: null as string | null,
        metadata: {
          value: token.value.trim() || UI_THEME_TOKEN_DEFAULTS[token.code],
        },
      }));

      const [catalogRes, tokensRes] = await Promise.all([
        supabase.from("catalogs").upsert(catalogRow, { onConflict: "key" }),
        supabase
          .from("catalog_items")
          .upsert(tokenRows, { onConflict: "catalog_key,code" }),
      ]);

      if (catalogRes.error) throw catalogRes.error;
      if (tokensRes.error) throw tokensRes.error;

      let gardenNamePersisted = true;
      const trimmedGardenName = gardenName.trim();

      const settingsRes = await supabase
        .from("settings")
        .update({ welcome_text: welcomeText, garden_name: trimmedGardenName || null })
        .eq("id", 1)
        .select("id")
        .single();

      if (settingsRes.error) {
        if (!isMissingSettingsGardenNameColumn(settingsRes.error)) {
          throw settingsRes.error;
        }

        const fallbackSettingsRes = await supabase
          .from("settings")
          .update({ welcome_text: welcomeText })
          .eq("id", 1)
          .select("id")
          .single();

        if (fallbackSettingsRes.error) throw fallbackSettingsRes.error;
        gardenNamePersisted = false;
      }

      const stableTokens = tokenDrafts.map((token) => ({ ...token }));
      setPersistedWelcomeText(welcomeText);
      setPersistedTokens(stableTokens);
      setTokenDrafts(stableTokens);

      if (gardenNamePersisted) {
        setPersistedGardenName(gardenName);
        setMsg("Sistema base guardado.");
      } else {
        setMsg(
          "Se guardó el texto base, pero falta la columna settings.garden_name. Ejecuta supabase/sql/2026-04-08_settings_garden_name.sql y vuelve a guardar el nombre del jardín.",
        );
      }
    } catch (error) {
      setMsg(toErrorMessage(error, "No se pudo guardar el sistema base."));
    } finally {
      setSaving(false);
    }
  }

  function reloadDrafts() {
    setWelcomeText(persistedWelcomeText);
    setGardenName(persistedGardenName);
    setTokenDrafts(persistedTokens.map((token) => ({ ...token })));
    setMsg(null);
  }

  function updateToken(code: UiThemeTokenCode, updater: (token: TokenDraft) => TokenDraft) {
    setTokenDrafts((current) =>
      current.map((token) => (token.code === code ? updater(token) : token)),
    );
  }

  function startPanelDrag(panel: SystemPanelId, event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    if (window.innerWidth < 1024) return;
    setPanelDrag({
      panel,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: panelOffsets[panel].x,
      startOffsetY: panelOffsets[panel].y,
    });
  }

  if (loading) {
    return <PageLoadingState message="Cargando sistema base..." />;
  }

  const activePanelStyle =
    activePanel === null
      ? undefined
      : ({
          transform: `translate(${panelOffsets[activePanel].x}px, ${panelOffsets[activePanel].y}px)`,
        } satisfies CSSProperties);

  const previewCardStyle = {
    borderRadius: "var(--lv-radius-lg)",
    borderColor: "var(--lv-border)",
    background: "var(--lv-surface)",
    boxShadow: "var(--lv-shadow-sm)",
  } satisfies CSSProperties;

  const previewSoftCardStyle = {
    borderRadius: "var(--lv-radius-lg)",
    borderColor: "var(--lv-border)",
    background: "var(--lv-surface-soft)",
    boxShadow: "var(--lv-shadow-sm)",
  } satisfies CSSProperties;

  return (
    <div className="min-h-screen bg-[#f5f7f3] p-6 text-slate-900">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
        <div className="sticky top-6 z-30 flex justify-center">
          <div className="flex max-w-full flex-wrap items-center justify-center gap-2 rounded-[32px] border border-[#dde8d8] bg-[rgba(255,255,255,0.96)] p-4 shadow-[0_18px_48px_rgba(21,36,24,0.12)] backdrop-blur">
            <button
              type="button"
              className="rounded-full border border-[#d9e4d3] bg-white px-4 py-2 text-sm transition hover:bg-[#f8fbf5]"
              onClick={() => router.push("/admin")}
            >
              Volver
            </button>
            <button
              type="button"
              className={`rounded-full border px-4 py-2 text-sm transition ${
                activePanel === "welcome"
                  ? "border-[#b7d0b4] bg-[#eef7e8] text-[#355c38]"
                  : "border-[#d9e4d3] bg-white hover:bg-[#f8fbf5]"
              }`}
              onClick={() => setActivePanel((current) => togglePanel(current, "welcome"))}
            >
              Welcome
            </button>
            <button
              type="button"
              className={`rounded-full border px-4 py-2 text-sm transition ${
                activePanel === "tokens"
                  ? "border-[#b7d0b4] bg-[#eef7e8] text-[#355c38]"
                  : "border-[#d9e4d3] bg-white hover:bg-[#f8fbf5]"
              }`}
              onClick={() => setActivePanel((current) => togglePanel(current, "tokens"))}
            >
              Base UX
            </button>
            <button
              type="button"
              className={`rounded-full border px-4 py-2 text-sm transition ${
                activePanel === "bridge"
                  ? "border-[#b7d0b4] bg-[#eef7e8] text-[#355c38]"
                  : "border-[#d9e4d3] bg-white hover:bg-[#f8fbf5]"
              }`}
              onClick={() => setActivePanel((current) => togglePanel(current, "bridge"))}
            >
              Catalogos
            </button>
            <button
              type="button"
              className="rounded-full border border-[#d9e4d3] bg-white px-4 py-2 text-sm transition hover:bg-[#f8fbf5]"
              onClick={reloadDrafts}
            >
              Recargar borrador
            </button>
            <button
              type="button"
              className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1d1d1d] disabled:cursor-not-allowed disabled:bg-[#95a193]"
              onClick={() => void handleSave()}
              disabled={!isDirty || saving}
            >
              {saving ? "Guardando..." : "Guardar sistema"}
            </button>
          </div>
        </div>

        {msg ? (
          <div className="mx-auto w-full max-w-[760px]">
            <StatusNotice message={msg} />
          </div>
        ) : null}

        <section className="relative overflow-hidden rounded-[36px] border border-[#dde8d8] bg-white p-4 shadow-[0_20px_54px_rgba(21,36,24,0.08)]">
          <div className="absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_top_left,rgba(225,238,220,0.8),transparent_48%),radial-gradient(circle_at_top_right,rgba(223,233,245,0.88),transparent_42%)]" />

          <div className="relative min-h-[760px]">
            <div className="h-full rounded-[30px] border border-[#dfe8da] p-5 shadow-sm" style={previewStyle}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]" style={{ borderColor: "var(--lv-border)", background: "var(--lv-surface-soft)", color: "var(--lv-text-muted)" }}>
                  System base
                </div>
                <div className="rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]" style={{ borderColor: "var(--lv-primary)", background: "var(--lv-primary-soft)", color: "var(--lv-primary-strong)" }}>
                  Preview activa: {visibleTokenGroup.label}
                </div>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-4">
                <SystemPreviewCard
                  groupKey="surface"
                  activeGroupKey={activeTokenGroup}
                  title="Superficie"
                  description="Fondos, superficies y bordes base del shell."
                >
                  <div className="rounded-[18px] border p-3" style={{ borderColor: "var(--lv-border)", background: "var(--lv-bg)" }}>
                    <div className="rounded-[14px] border p-3" style={{ borderColor: "var(--lv-border)", background: "var(--lv-bg-soft)" }}>
                      <div className="rounded-[14px] border px-3 py-2" style={{ borderColor: "var(--lv-border)", background: "var(--lv-surface)" }}>
                        <div className="text-xs font-medium" style={{ color: "var(--lv-text)" }}>
                          Superficie principal
                        </div>
                      </div>
                      <div className="mt-2 rounded-[14px] border px-3 py-2" style={{ borderColor: "var(--lv-border-strong)", background: "var(--lv-surface-soft)" }}>
                        <div className="text-xs" style={{ color: "var(--lv-text-muted)" }}>
                          Superficie secundaria
                        </div>
                      </div>
                    </div>
                  </div>
                </SystemPreviewCard>

                <SystemPreviewCard
                  groupKey="text"
                  activeGroupKey={activeTokenGroup}
                  title="Texto"
                  description="Jerarquia de lectura y foco de interaccion."
                >
                  <div className="space-y-3 rounded-[18px] border p-3" style={{ borderColor: "var(--lv-border)", background: "var(--lv-surface)" }}>
                    <div className="text-base font-semibold" style={{ color: "var(--lv-text)" }}>
                      Titular y contenido principal
                    </div>
                    <div className="text-sm leading-6" style={{ color: "var(--lv-text-muted)" }}>
                      Ayudas, descripciones y contexto secundario.
                    </div>
                    <div className="rounded-[14px] border px-3 py-2" style={{ borderColor: "var(--lv-border-strong)", boxShadow: "0 0 0 3px color-mix(in srgb, var(--lv-focus) 28%, transparent)" }}>
                      <div className="text-xs" style={{ color: "var(--lv-text)" }}>
                        Input con focus visible
                      </div>
                    </div>
                  </div>
                </SystemPreviewCard>

                <SystemPreviewCard
                  groupKey="primary"
                  activeGroupKey={activeTokenGroup}
                  title="Primario"
                  description="CTA, hover y fondos suaves ligados al acento."
                >
                  <div className="flex flex-wrap gap-2">
                    <div
                      className="px-3 py-2 text-sm font-medium text-white"
                      style={{
                        borderRadius: "var(--lv-radius-sm)",
                        background: "var(--lv-primary)",
                        boxShadow: "var(--lv-shadow-sm)",
                      }}
                    >
                      CTA principal
                    </div>
                    <div
                      className="px-3 py-2 text-sm font-medium text-white"
                      style={{
                        borderRadius: "var(--lv-radius-sm)",
                        background: "var(--lv-primary-strong)",
                        boxShadow: "var(--lv-shadow-sm)",
                      }}
                    >
                      Hover
                    </div>
                    <div
                      className="rounded-full border px-3 py-1.5 text-sm"
                      style={{
                        borderColor: "color-mix(in srgb, var(--lv-primary) 18%, var(--lv-surface))",
                        background: "var(--lv-primary-soft)",
                        color: "var(--lv-primary-strong)",
                      }}
                    >
                      Contexto suave
                    </div>
                  </div>
                </SystemPreviewCard>

                <SystemPreviewCard
                  groupKey="depth"
                  activeGroupKey={activeTokenGroup}
                  title="Profundidad"
                  description="Elevacion ligera y elevada para shell y overlays."
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="border p-3 text-xs" style={{ borderRadius: "var(--lv-radius-md)", borderColor: "var(--lv-border)", background: "var(--lv-surface)", boxShadow: "var(--lv-shadow-sm)", color: "var(--lv-text)" }}>
                      Suave
                    </div>
                    <div className="border p-3 text-xs" style={{ borderRadius: "var(--lv-radius-md)", borderColor: "var(--lv-border)", background: "var(--lv-surface)", boxShadow: "var(--lv-shadow-md)", color: "var(--lv-text)" }}>
                      Media
                    </div>
                  </div>
                </SystemPreviewCard>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="border p-5" style={previewCardStyle}>
                  <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--lv-text-muted)" }}>
                    Header global
                  </div>
                  <h2 className="mt-3 text-4xl font-semibold tracking-tight" style={{ color: "var(--lv-text)" }}>
                    {resolvedWelcomePreview}
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7" style={{ color: "var(--lv-text-muted)" }}>
                    Aqui orquestas la base comun del producto: color, forma,
                    profundidad y feedback. La idea no es rehacer pantallas,
                    sino gobernar las primitives que todas comparten.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="px-4 py-2 text-sm font-medium text-white"
                      style={{
                        borderRadius: "var(--lv-radius-sm)",
                        background: "var(--lv-primary)",
                        border: "1px solid var(--lv-primary)",
                        boxShadow: "var(--lv-shadow-sm)",
                      }}
                    >
                      Accion principal
                    </button>
                    <button
                      type="button"
                      className="border px-4 py-2 text-sm"
                      style={{
                        borderRadius: "var(--lv-radius-sm)",
                        background: "var(--lv-surface)",
                        borderColor: "var(--lv-border-strong)",
                        color: "var(--lv-text)",
                      }}
                    >
                      Accion secundaria
                    </button>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="border p-5" style={previewSoftCardStyle}>
                    <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--lv-text-muted)" }}>
                      Estados compartidos
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border px-3 py-1.5 text-sm" style={{ borderColor: "var(--lv-success)", background: "var(--lv-success-soft)", color: "var(--lv-success)" }}>
                        Success
                      </span>
                      <span className="rounded-full border px-3 py-1.5 text-sm" style={{ borderColor: "var(--lv-info)", background: "var(--lv-info-soft)", color: "var(--lv-info)" }}>
                        Info
                      </span>
                      <span className="rounded-full border px-3 py-1.5 text-sm" style={{ borderColor: "var(--lv-warning)", background: "var(--lv-warning-soft)", color: "var(--lv-warning)" }}>
                        Warning
                      </span>
                      <span className="rounded-full border px-3 py-1.5 text-sm" style={{ borderColor: "var(--lv-danger)", background: "var(--lv-danger-soft)", color: "var(--lv-danger)" }}>
                        Error
                      </span>
                    </div>
                  </div>

                  <div className="border p-5" style={previewCardStyle}>
                    <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--lv-text-muted)" }}>
                      Forma y profundidad
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div
                        className="border p-3"
                        style={{
                          borderRadius: "var(--lv-radius-xs)",
                          borderColor: "var(--lv-border)",
                          background: "var(--lv-surface)",
                          boxShadow: "var(--lv-shadow-sm)",
                        }}
                      >
                        <div className="text-[10px] uppercase tracking-[0.16em]" style={{ color: "var(--lv-text-muted)" }}>
                          XS
                        </div>
                        <div className="mt-2 text-sm font-medium" style={{ color: "var(--lv-text)" }}>
                          Compacto
                        </div>
                      </div>
                      <div
                        className="border p-3"
                        style={{
                          borderRadius: "var(--lv-radius-sm)",
                          borderColor: "var(--lv-border)",
                          background: "var(--lv-surface)",
                          boxShadow: "var(--lv-shadow-sm)",
                        }}
                      >
                        <div className="text-[10px] uppercase tracking-[0.16em]" style={{ color: "var(--lv-text-muted)" }}>
                          SM
                        </div>
                        <div className="mt-2 text-sm font-medium" style={{ color: "var(--lv-text)" }}>
                          Botones
                        </div>
                      </div>
                      <div
                        className="border p-3"
                        style={{
                          borderRadius: "var(--lv-radius-lg)",
                          borderColor: "var(--lv-border)",
                          background: "var(--lv-bg-soft)",
                          boxShadow: "var(--lv-shadow-md)",
                        }}
                      >
                        <div className="text-[10px] uppercase tracking-[0.16em]" style={{ color: "var(--lv-text-muted)" }}>
                          LG
                        </div>
                        <div className="mt-2 text-sm font-medium" style={{ color: "var(--lv-text)" }}>
                          Overlay
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
                <div className="border p-5" style={previewCardStyle}>
                  <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--lv-text-muted)" }}>
                    Feedback y modal
                  </div>
                  <div
                    className="mt-4 border p-4"
                    style={{
                      borderRadius: "var(--lv-radius-lg)",
                      borderColor: "var(--lv-border)",
                      background: "var(--lv-overlay-scrim)",
                    }}
                  >
                    <div
                      className="mx-auto max-w-[320px] border p-4"
                      style={{
                        borderRadius: "var(--lv-radius-lg)",
                        borderColor: "var(--lv-border)",
                        background: "var(--lv-surface)",
                        boxShadow: "var(--lv-shadow-md)",
                      }}
                    >
                      <div className="text-sm font-semibold" style={{ color: "var(--lv-text)" }}>
                        Confirmacion base
                      </div>
                      <div className="mt-1 text-sm" style={{ color: "var(--lv-text-muted)" }}>
                        El scrim, la elevacion y los radios deben respirar igual
                        en todo el shell.
                      </div>
                      <div className="mt-4 h-2 overflow-hidden rounded-full" style={{ background: "var(--lv-progress-track)" }}>
                        <div className="h-full rounded-full" style={{ width: "68%", background: "var(--lv-progress-fill)" }} />
                      </div>
                      <div className="mt-2 text-xs" style={{ color: "var(--lv-text-muted)" }}>
                        Upload, cola o proceso en curso
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border p-5" style={previewCardStyle}>
                  <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--lv-text-muted)" }}>
                    Chrome de mapa
                  </div>
                  <div
                    className="mt-4 border p-4"
                    style={{
                      borderRadius: "var(--lv-radius-lg)",
                      borderColor: "var(--lv-border)",
                      background:
                        "linear-gradient(180deg, color-mix(in srgb, var(--lv-info-soft) 56%, white) 0%, color-mix(in srgb, var(--lv-bg-soft) 88%, white) 100%)",
                    }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        {["+", "-", "Demo"].map((item) => (
                          <div
                            key={item}
                            className="flex h-10 min-w-10 items-center justify-center px-3 text-sm font-medium"
                            style={{
                              borderRadius: "var(--lv-radius-md)",
                              border: "1px solid var(--lv-map-chrome-border)",
                              background: "var(--lv-map-chrome-bg)",
                              color: "var(--lv-map-chrome-text)",
                              boxShadow: "var(--lv-map-chrome-shadow)",
                            }}
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                      <div
                        className="px-3 py-1.5 text-xs"
                        style={{
                          borderRadius: "999px",
                          border: "1px solid var(--lv-map-chrome-border)",
                          background: "var(--lv-map-chrome-bg)",
                          color: "var(--lv-map-chrome-text)",
                          boxShadow: "var(--lv-map-chrome-shadow)",
                        }}
                      >
                        Control superior
                      </div>
                    </div>
                    <div className="mt-14 flex justify-end">
                      <div
                        className="px-3 py-1.5 text-xs"
                        style={{
                          borderRadius: "999px",
                          border: "1px solid var(--lv-map-chrome-border)",
                          background: "var(--lv-map-chrome-bg)",
                          color: "var(--lv-map-chrome-text)",
                          boxShadow: "var(--lv-map-chrome-shadow)",
                        }}
                      >
                        Atribucion · OpenStreetMap
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {activePanel === "welcome" ? (
              <SystemFloatingPanel
                eyebrow="Welcome global"
                title="Copy de bienvenida"
                description="Este texto vive en `settings` y afecta al shell comun de `home`. Aquí se edita como pieza global, no en la portada del admin."
                onClose={() => setActivePanel(null)}
                onHeaderPointerDown={(event) => startPanelDrag("welcome", event)}
                style={activePanelStyle}
              >
                <div className="space-y-4">
                  <label className="space-y-2">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-[#61755c]">
                      Nombre del jardin
                    </div>
                    <input
                      value={gardenName}
                      onChange={(event) => setGardenName(event.target.value)}
                      className="w-full rounded-[18px] border border-[#d9e4d3] bg-white px-4 py-3 text-sm leading-6"
                      placeholder="Ej: jardin de Alba y Diego"
                    />
                    <div className="text-xs leading-5 text-slate-500">
                      Si dejas vacio este campo, la home mostrara el fallback general del producto.
                    </div>
                  </label>

                  <label className="space-y-2">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-[#61755c]">
                      Texto visible
                    </div>
                    <textarea
                      value={welcomeText}
                      onChange={(event) => setWelcomeText(event.target.value)}
                      rows={5}
                      className="w-full rounded-[18px] border border-[#d9e4d3] bg-white px-4 py-3 text-sm leading-6"
                      placeholder={PRODUCT_HOME_WELCOME_PLACEHOLDER}
                    />
                    <div className="text-xs leading-5 text-slate-500">
                      Variables disponibles: <code>{`{{garden}}`}</code> para el nombre del
                      jardin y <code>{`{{user}}`}</code> para el nombre de quien entra.
                    </div>
                  </label>

                  <div className="rounded-[22px] border border-[#dfe8da] bg-[#f8fbf6] p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-[#61755c]">
                      Vista final
                    </div>
                    <div className="mt-2 text-lg font-medium text-slate-950">
                      {resolvedWelcomePreview}
                    </div>
                  </div>
                </div>
              </SystemFloatingPanel>
            ) : null}

            {activePanel === "tokens" ? (
              <SystemFloatingPanel
                eyebrow="Base UX compartida"
                title="Primitives del shell"
                description="Aquí se gobiernan color, radios, sombras y chrome comun. La meta es cambiar la base una vez y que el producto entero respire distinto sin ir pantalla por pantalla."
                onClose={() => setActivePanel(null)}
                onHeaderPointerDown={(event) => startPanelDrag("tokens", event)}
                style={activePanelStyle}
                className="lg:max-h-[72vh] lg:w-[380px]"
                contentClassName="pr-1"
              >
                <div className="space-y-4" style={previewVars as CSSProperties}>
                  <div className="sticky top-0 z-10 -mx-5 -mt-1 border-b border-[#e5ede1] bg-[rgba(255,255,255,0.98)] px-5 pb-4 pt-1 backdrop-blur">
                    <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-[#61755c]">
                      Familias Base UX
                    </div>
                    <div className="mb-2 text-xs text-slate-500">
                      La preview principal resalta la familia activa y cada token ensena una mini muestra debajo.
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {TOKEN_GROUPS.map((group) => (
                        <button
                          key={group.key}
                          type="button"
                          className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] transition ${
                            activeTokenGroup === group.key
                              ? "border-[#b7d0b4] bg-[#eef7e8] text-[#355c38]"
                              : "border-[#d9e4d3] bg-white text-[#61755c] hover:bg-[#f8fbf6]"
                          }`}
                          onClick={() => setActiveTokenGroup(group.key)}
                        >
                          {group.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <section className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="rounded-full border border-[#d9e4d3] bg-[#f8fbf6] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-[#61755c]">
                        {visibleTokenGroup.label}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {visibleTokenGroup.definitions.length} token(s)
                      </div>
                    </div>
                    <div className="grid gap-3">
                      {visibleTokenGroup.definitions.map((definition) => {
                        const token = tokenDraftByCode.get(definition.code);
                        if (!token) return null;
                        const swatchValue = token.value || UI_THEME_TOKEN_DEFAULTS[token.code];
                        const showColorPicker =
                          definition.kind === "color" &&
                          (isHexColor(token.value) || isHexColor(UI_THEME_TOKEN_DEFAULTS[token.code]));
                        return (
                          <div
                            key={definition.code}
                            className="rounded-[22px] border border-[#dfe8da] bg-white p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-slate-950">
                                  {token.label}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {token.code}
                                </div>
                                <div className="mt-2 text-xs leading-5 text-slate-500">
                                  {definition.hint}
                                </div>
                              </div>
                              {definition.kind === "color" ? (
                                <div
                                  className="h-10 w-10 rounded-2xl border border-[#d9e4d3]"
                                  style={{ background: swatchValue }}
                                />
                              ) : (
                                <div className="shrink-0 rounded-full border border-[#d9e4d3] bg-[#f8fbf6] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[#61755c]">
                                  {definition.kind === "length" ? "Radio" : "Sombra"}
                                </div>
                              )}
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                              <input
                                type="text"
                                value={token.value}
                                onChange={(event) =>
                                  updateToken(token.code, (current) => ({
                                    ...current,
                                    value: event.target.value,
                                  }))
                                }
                                className="min-w-0 flex-1 rounded-[16px] border border-[#d9e4d3] bg-white px-3 py-2 text-sm"
                                placeholder={definition.defaultValue}
                              />
                              {showColorPicker ? (
                                <input
                                  type="color"
                                  value={
                                    isHexColor(token.value)
                                      ? token.value
                                      : UI_THEME_TOKEN_DEFAULTS[token.code]
                                  }
                                  onChange={(event) =>
                                    updateToken(token.code, (current) => ({
                                      ...current,
                                      value: event.target.value,
                                    }))
                                  }
                                  className="h-11 w-14 rounded-[16px] border border-[#d9e4d3] bg-white p-1"
                                />
                              ) : null}
                            </div>
                            <SystemTokenMiniPreview definition={definition} />
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>
              </SystemFloatingPanel>
            ) : null}

            {activePanel === "bridge" ? (
              <SystemFloatingPanel
                eyebrow="Catalogos avanzados"
                title="Puerta técnica"
                description="Si algún ajuste del shell se vuelve raw o legacy, la salida correcta es `Catalogos`. Aquí solo dejamos ese puente, sin meter más discurso."
                onClose={() => setActivePanel(null)}
                onHeaderPointerDown={(event) => startPanelDrag("bridge", event)}
                style={activePanelStyle}
              >
                <div className="space-y-4">
                  <div className="rounded-[22px] border border-[#dfe8da] bg-[#f8fbf6] p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-[#61755c]">
                      Catalogo conectado
                    </div>
                    <div className="mt-2 text-sm font-medium text-slate-950">
                      {UI_THEME_TOKEN_CATALOG_KEY}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="w-full rounded-[18px] border border-[#d9e4d3] bg-white px-4 py-3 text-left text-sm transition hover:bg-[#f8fbf5]"
                    onClick={() => router.push("/admin/catalogs")}
                  >
                    Abrir catalogos avanzados
                  </button>
                </div>
              </SystemFloatingPanel>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
