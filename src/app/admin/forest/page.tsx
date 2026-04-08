"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ensureSuperadminOrRedirect } from "@/lib/auth";
import { getFallbackElementCatalogItems } from "@/lib/elementsCatalog";
import { getFallbackForestViewConfig, renderForestTemplate } from "@/lib/forestConfig";
import { AdminPageHero } from "@/components/admin/AdminPageHero";
import {
  AdminInlineNote,
  AdminPanel,
  AdminToggleGroup,
  AdminWorkspace,
} from "@/components/admin/AdminWorkspace";

type ThemeRow = {
  key: string;
  label: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  is_active: boolean;
  priority: number;
};

type AssetRow = {
  id: string;
  asset_key: string;
  value: string;
  enabled: boolean;
  sort_order: number;
};

type TemplateRow = {
  id: string;
  template_key: string;
  body: string;
  enabled: boolean;
  sort_order: number;
};

type ForestView = "theme" | "labels" | "narrative" | "advanced";

const VIEW_OPTIONS: Array<{ key: ForestView; label: string }> = [
  { key: "theme", label: "Tema anual" },
  { key: "labels", label: "Etiquetas" },
  { key: "narrative", label: "Narrativa" },
  { key: "advanced", label: "Avanzado" },
];

const SEASONS = [
  { code: "spring", label: "Primavera" },
  { code: "summer", label: "Verano" },
  { code: "autumn", label: "Otoño" },
  { code: "winter", label: "Invierno" },
] as const;

const ELEMENTS = getFallbackElementCatalogItems().map((item) => ({
  code: item.code,
  label: item.label,
}));

const NARRATIVE_FIELDS = [
  {
    key: "season_empty",
    label: "Temporada vacía",
    hint: "Se usa cuando una estación no tiene flores todavía.",
  },
  {
    key: "mood_shiny",
    label: "Etapa luminosa",
    hint: "Texto para un año especialmente brillante.",
  },
  {
    key: "mood_wilted",
    label: "Etapa sensible",
    hint: "Texto para un año más delicado.",
  },
  {
    key: "mood_balanced",
    label: "Etapa equilibrada",
    hint: "Texto para un año estable y constante.",
  },
  {
    key: "stars_high",
    label: "Estrellas altas",
    hint: "Resumen cuando la media de valoración fue alta.",
  },
  {
    key: "stars_mid",
    label: "Estrellas medias",
    hint: "Resumen cuando la media de valoración fue estable.",
  },
  {
    key: "stars_low",
    label: "Estrellas bajas",
    hint: "Resumen cuando la media de valoración fue baja.",
  },
  {
    key: "element_line",
    label: "Elemento dominante",
    hint: "Admite {element}. Se usa cuando hay elemento claro.",
  },
  {
    key: "element_none",
    label: "Sin elemento dominante",
    hint: "Se usa cuando no hay un elemento claro en el año.",
  },
] as const;

const PRIMARY_ASSET_KEYS = [
  ...SEASONS.flatMap((season) => [
    `season_label.${season.code}`,
    `color.season_card.${season.code}`,
  ]),
  ...ELEMENTS.flatMap((element) => [
    `element_label.${element.code}`,
    `token.element.${element.code}`,
    `color.element.${element.code}`,
  ]),
] as const;

const PRIMARY_TEMPLATE_KEYS = NARRATIVE_FIELDS.map((field) => field.key);

function isHexColor(value: string) {
  return /^#([0-9a-fA-F]{6})$/.test(value.trim());
}

function isLikelyImageAsset(value: string) {
  const v = String(value ?? "").trim();
  if (!v) return false;
  return /^https?:\/\//i.test(v) || v.startsWith("/") || v.startsWith("data:image/");
}

function assetTypeForKey(key: string, value: string) {
  if (key.startsWith("color.") || isHexColor(value)) return "color";
  if (key.startsWith("icon.")) {
    return isLikelyImageAsset(value) ? "image_url" : "emoji";
  }
  return "token";
}

function assetSortOrder(key: string) {
  const knownIndex = PRIMARY_ASSET_KEYS.findIndex((entry) => entry === key);
  if (knownIndex >= 0) return (knownIndex + 1) * 10;
  return 1000;
}

function templateSortOrder(key: string) {
  const knownIndex = PRIMARY_TEMPLATE_KEYS.findIndex((entry) => entry === key);
  if (knownIndex >= 0) return (knownIndex + 1) * 10;
  return 1000;
}

function asMetadataObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function buildAssetDrafts(rows: AssetRow[]) {
  const fallback = getFallbackForestViewConfig();
  const next: Record<string, string> = { ...fallback.assets };
  for (const row of rows) {
    if (!row.enabled) continue;
    next[row.asset_key] = row.value;
  }
  return next;
}

function buildTemplateDrafts(rows: TemplateRow[]) {
  const fallback = getFallbackForestViewConfig();
  const next: Record<string, string> = { ...fallback.narrativeTemplates };
  for (const row of rows) {
    if (!row.enabled) continue;
    next[row.template_key] = row.body;
  }
  return next;
}

function SummaryChip({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-3 py-2">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">{label}</div>
      <div className="mt-1 text-sm font-medium text-[var(--lv-text)]">{value}</div>
    </div>
  );
}

const fieldLabelClass = "font-medium text-[var(--lv-text)]";
const fieldControlClass =
  "w-full rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-3 text-[var(--lv-text)] shadow-[var(--lv-shadow-sm)]";
const textareaControlClass = `min-h-[96px] ${fieldControlClass}`;
const tallTextareaControlClass = `min-h-[110px] ${fieldControlClass}`;
const panelCardClass =
  "rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4";
const disclosureClass =
  "mt-4 rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4";
const secondaryButtonClass =
  "rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-2 text-[var(--lv-text)] shadow-[var(--lv-shadow-sm)]";
const primaryButtonClass =
  "rounded-[20px] bg-[var(--lv-primary)] px-4 py-2 text-white shadow-[var(--lv-shadow-sm)]";

export default function AdminForestPage() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [view, setView] = useState<ForestView>("theme");

  const [themes, setThemes] = useState<ThemeRow[]>([]);
  const [themeKey, setThemeKey] = useState("");

  const [themeLabel, setThemeLabel] = useState("");
  const [themeDescription, setThemeDescription] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [emptyMessage, setEmptyMessage] = useState("");

  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [assetDrafts, setAssetDrafts] = useState<Record<string, string>>({});
  const [templateDrafts, setTemplateDrafts] = useState<Record<string, string>>({});

  const [newThemeKey, setNewThemeKey] = useState("");
  const [newThemeLabel, setNewThemeLabel] = useState("");
  const [copyCurrentTheme, setCopyCurrentTheme] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newAssetKey, setNewAssetKey] = useState("");
  const [newAssetValue, setNewAssetValue] = useState("");
  const [newTemplateKey, setNewTemplateKey] = useState("");
  const [newTemplateBody, setNewTemplateBody] = useState("");

  const selectedTheme = useMemo(
    () => themes.find((theme) => theme.key === themeKey) ?? null,
    [themes, themeKey],
  );

  const secondaryAssets = useMemo(
    () =>
      assets.filter(
        (row) =>
          !PRIMARY_ASSET_KEYS.some((key) => key === row.asset_key),
      ),
    [assets],
  );

  const secondaryTemplates = useMemo(
    () =>
      templates.filter(
        (row) =>
          !PRIMARY_TEMPLATE_KEYS.some((key) => key === row.template_key),
      ),
    [templates],
  );

  const preview = useMemo(() => {
    const titleValue = title.trim() || "Bosque de Recuerdos";
    const subtitleValue =
      subtitle.trim() || "Cada página del año deja una huella en vuestro bosque.";
    const emptyValue =
      emptyMessage.trim() ||
      "Todavía no hay flores en esta etapa del año. Es buen momento para plantar una nueva página.";

    const seasonCards = SEASONS.map((season) => ({
      code: season.code,
      label:
        assetDrafts[`season_label.${season.code}`]?.trim() || season.label,
      bg:
        assetDrafts[`color.season_card.${season.code}`]?.trim() || "#f7f7f7",
    }));

    const elementCards = ELEMENTS.map((element) => ({
      code: element.code,
      label:
        assetDrafts[`element_label.${element.code}`]?.trim() || element.label,
      token:
        assetDrafts[`token.element.${element.code}`]?.trim() ||
        element.label.slice(0, 1),
      bg:
        assetDrafts[`color.element.${element.code}`]?.trim() || "#f3f4f6",
    }));

    const narrativeSamples = {
      seasonEmpty: renderForestTemplate(
        templateDrafts.season_empty ||
          "En {season} no hay flores todavía. Es buen momento para plantar una página nueva.",
        {
          season: seasonCards[0]?.label ?? "Primavera",
        },
      ),
      moodShiny:
        templateDrafts.mood_shiny ||
        "Fue una etapa luminosa, con muchos días brillantes.",
      starsHigh:
        templateDrafts.stars_high ||
        "La media de estrellas fue muy alta, gran capítulo.",
      elementLine: renderForestTemplate(
        templateDrafts.element_line || "Elemento dominante: {element}.",
        {
          element: elementCards[0]?.label ?? "Fuego",
        },
      ),
    };

    return {
      title: titleValue,
      subtitle: subtitleValue,
      emptyMessage: emptyValue,
      seasonCards,
      elementCards,
      narrativeSamples,
    };
  }, [assetDrafts, emptyMessage, subtitle, templateDrafts, title]);

  async function refreshThemes() {
    setMsg(null);
    const { data, error } = await supabase
      .from("forest_theme")
      .select("key,label,description,metadata,is_active,priority")
      .order("is_active", { ascending: false })
      .order("priority", { ascending: true })
      .order("label", { ascending: true });

    if (error) {
      setMsg(
        `No se pudo leer forest_theme: ${error.message}. Ejecuta supabase/sql/2026-03-05_forest_config.sql`,
      );
      setThemes([]);
      return;
    }

    const rows = (data as ThemeRow[] | null) ?? [];
    setThemes(rows);
    if (!rows.length) {
      setThemeKey("");
      return;
    }

    const activeTheme = rows.find((row) => row.is_active) ?? rows[0];
    if (!themeKey) {
      setThemeKey(activeTheme.key);
      return;
    }

    if (!rows.some((row) => row.key === themeKey)) {
      setThemeKey(activeTheme.key);
    }
  }

  async function refreshThemeData(key: string) {
    if (!key) return;
    setMsg(null);

    const theme = themes.find((row) => row.key === key) ?? null;
    const metadata = asMetadataObject(theme?.metadata);
    setThemeLabel(theme?.label ?? "");
    setThemeDescription(theme?.description ?? "");
    setTitle(typeof metadata.title === "string" ? metadata.title : "");
    setSubtitle(typeof metadata.subtitle === "string" ? metadata.subtitle : "");
    setEmptyMessage(
      typeof metadata.empty_message === "string" ? metadata.empty_message : "",
    );

    const [assetsRes, templatesRes] = await Promise.all([
      supabase
        .from("forest_assets")
        .select("id,asset_key,value,enabled,sort_order")
        .eq("theme_key", key)
        .order("sort_order", { ascending: true })
        .order("asset_key", { ascending: true }),
      supabase
        .from("forest_narrative_templates")
        .select("id,template_key,body,enabled,sort_order")
        .eq("theme_key", key)
        .order("sort_order", { ascending: true })
        .order("template_key", { ascending: true }),
    ]);

    const nextAssets = (assetsRes.data as AssetRow[] | null) ?? [];
    const nextTemplates = (templatesRes.data as TemplateRow[] | null) ?? [];

    if (assetsRes.error) {
      setMsg(assetsRes.error.message);
    }
    if (templatesRes.error) {
      setMsg((prev) => prev ?? templatesRes.error?.message ?? null);
    }

    setAssets(nextAssets);
    setTemplates(nextTemplates);
    setAssetDrafts(buildAssetDrafts(nextAssets));
    setTemplateDrafts(buildTemplateDrafts(nextTemplates));
  }

  useEffect(() => {
    (async () => {
      const session = await ensureSuperadminOrRedirect(router);
      if (!session) return;
      await refreshThemes();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (!themeKey) return;
    void refreshThemeData(themeKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeKey]);

  async function saveThemeSection() {
    if (!themeKey) return;
    setSaving(true);
    setMsg(null);

    const { error } = await supabase
      .from("forest_theme")
      .update({
        label: themeLabel.trim() || selectedTheme?.label || themeKey,
        description: themeDescription.trim() || null,
        metadata: {
          ...asMetadataObject(selectedTheme?.metadata),
          title: title.trim(),
          subtitle: subtitle.trim(),
          empty_message: emptyMessage.trim(),
        },
      })
      .eq("key", themeKey);

    setSaving(false);
    if (error) {
      setMsg(error.message);
      return;
    }

    await refreshThemes();
    await refreshThemeData(themeKey);
    setMsg("Tema anual guardado.");
  }

  async function upsertAssetKeys(keys: string[], successMessage: string) {
    if (!themeKey) return;
    setSaving(true);
    setMsg(null);

    const rows = keys
      .map((key) => ({
        theme_key: themeKey,
        asset_key: key,
        asset_type: assetTypeForKey(key, assetDrafts[key] ?? ""),
        value: (assetDrafts[key] ?? "").trim(),
        enabled: true,
        sort_order: assetSortOrder(key),
        metadata: {},
      }))
      .filter((row) => row.value);

    const { error } = await supabase
      .from("forest_assets")
      .upsert(rows, { onConflict: "theme_key,asset_key" });

    setSaving(false);
    if (error) {
      setMsg(error.message);
      return;
    }

    await refreshThemeData(themeKey);
    setMsg(successMessage);
  }

  async function saveLabelsSection() {
    await upsertAssetKeys([...PRIMARY_ASSET_KEYS], "Etiquetas y tonos del bosque guardados.");
  }

  async function saveNarrativeSection() {
    if (!themeKey) return;
    setSaving(true);
    setMsg(null);

    const rows = PRIMARY_TEMPLATE_KEYS.map((key) => ({
      theme_key: themeKey,
      template_key: key,
      body: (templateDrafts[key] ?? "").trim(),
      enabled: true,
      sort_order: templateSortOrder(key),
      metadata: {},
    })).filter((row) => row.body);

    const { error } = await supabase
      .from("forest_narrative_templates")
      .upsert(rows, { onConflict: "theme_key,template_key" });

    setSaving(false);
    if (error) {
      setMsg(error.message);
      return;
    }

    await refreshThemeData(themeKey);
    setMsg("Narrativa anual guardada.");
  }

  async function activateTheme() {
    if (!themeKey || selectedTheme?.is_active) return;
    setSaving(true);
    setMsg(null);

    const { error: deactivateError } = await supabase
      .from("forest_theme")
      .update({ is_active: false })
      .neq("key", "__none__");

    if (deactivateError) {
      setSaving(false);
      setMsg(deactivateError.message);
      return;
    }

    const { error: activateError } = await supabase
      .from("forest_theme")
      .update({ is_active: true })
      .eq("key", themeKey);

    setSaving(false);
    if (activateError) {
      setMsg(activateError.message);
      return;
    }

    await refreshThemes();
    setMsg(`Tema activo actualizado: ${themeLabel || themeKey}.`);
  }

  async function createTheme() {
    const key = newThemeKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const label = newThemeLabel.trim();

    if (!key || !label) {
      setMsg("Nuevo tema: key y label son obligatorios.");
      return;
    }

    setSaving(true);
    setMsg(null);

    const metadata = copyCurrentTheme
      ? {
          title: title.trim(),
          subtitle: subtitle.trim(),
          empty_message: emptyMessage.trim(),
        }
      : {};

    const { error } = await supabase.from("forest_theme").insert({
      key,
      label,
      description: copyCurrentTheme ? themeDescription.trim() || null : null,
      is_active: false,
      priority: (themes.length + 1) * 10,
      metadata,
    });

    if (error) {
      setSaving(false);
      setMsg(error.message);
      return;
    }

    if (copyCurrentTheme) {
      if (assets.length) {
        await supabase.from("forest_assets").upsert(
          assets.map((row) => ({
            theme_key: key,
            asset_key: row.asset_key,
            asset_type: assetTypeForKey(row.asset_key, row.value),
            value: row.value,
            enabled: row.enabled,
            sort_order: row.sort_order,
            metadata: {},
          })),
          { onConflict: "theme_key,asset_key" },
        );
      }

      if (templates.length) {
        await supabase.from("forest_narrative_templates").upsert(
          templates.map((row) => ({
            theme_key: key,
            template_key: row.template_key,
            body: row.body,
            enabled: row.enabled,
            sort_order: row.sort_order,
            metadata: {},
          })),
          { onConflict: "theme_key,template_key" },
        );
      }
    }

    setSaving(false);
    setNewThemeKey("");
    setNewThemeLabel("");
    await refreshThemes();
    setThemeKey(key);
    setMsg(`Tema creado: ${label}.`);
  }

  function patchAssetRow(rowId: string, patch: Partial<AssetRow>) {
    setAssets((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    );
  }

  function patchTemplateRow(rowId: string, patch: Partial<TemplateRow>) {
    setTemplates((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    );
  }

  async function saveAssetRow(row: AssetRow) {
    const { error } = await supabase
      .from("forest_assets")
      .update({
        value: row.value,
        enabled: row.enabled,
        sort_order: row.sort_order,
      })
      .eq("id", row.id);

    if (error) {
      setMsg(error.message);
      return;
    }

    await refreshThemeData(themeKey);
    setMsg(`Asset guardado: ${row.asset_key}.`);
  }

  async function saveTemplateRow(row: TemplateRow) {
    const { error } = await supabase
      .from("forest_narrative_templates")
      .update({
        body: row.body,
        enabled: row.enabled,
        sort_order: row.sort_order,
      })
      .eq("id", row.id);

    if (error) {
      setMsg(error.message);
      return;
    }

    await refreshThemeData(themeKey);
    setMsg(`Template guardado: ${row.template_key}.`);
  }

  async function addAsset() {
    if (!themeKey) return;
    const assetKey = newAssetKey.trim();
    const value = newAssetValue.trim();
    if (!assetKey || !value) {
      setMsg("Asset key y value son obligatorios.");
      return;
    }

    const { error } = await supabase.from("forest_assets").upsert(
      {
        theme_key: themeKey,
        asset_key: assetKey,
        asset_type: assetTypeForKey(assetKey, value),
        value,
        enabled: true,
        sort_order: 1000,
        metadata: {},
      },
      { onConflict: "theme_key,asset_key" },
    );

    if (error) {
      setMsg(error.message);
      return;
    }

    setNewAssetKey("");
    setNewAssetValue("");
    await refreshThemeData(themeKey);
    setMsg(`Asset creado: ${assetKey}.`);
  }

  async function addTemplate() {
    if (!themeKey) return;
    const templateKey = newTemplateKey.trim();
    const body = newTemplateBody.trim();
    if (!templateKey || !body) {
      setMsg("Template key y body son obligatorios.");
      return;
    }

    const { error } = await supabase.from("forest_narrative_templates").upsert(
      {
        theme_key: themeKey,
        template_key: templateKey,
        body,
        enabled: true,
        sort_order: 1000,
        metadata: {},
      },
      { onConflict: "theme_key,template_key" },
    );

    if (error) {
      setMsg(error.message);
      return;
    }

    setNewTemplateKey("");
    setNewTemplateBody("");
    await refreshThemeData(themeKey);
    setMsg(`Template creado: ${templateKey}.`);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--lv-bg)] p-6 text-[var(--lv-text)]">
        <div className="mx-auto flex min-h-[300px] max-w-6xl items-center justify-center rounded-3xl border border-[var(--lv-border)] bg-[var(--lv-surface)]">
          Cargando admin forest...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--lv-bg)] p-6 text-[var(--lv-text)]">
      <div className="mx-auto max-w-7xl space-y-4">
        <AdminPageHero
          title="Admin: Bosque anual"
          description="Aquí ajustas la voz visual y narrativa del bosque anual. No define la flor o la semilla de cada plan: eso vive en Tipos de plan."
          actions={
            <>
              <button
                className={secondaryButtonClass}
                onClick={() => router.push("/forest")}
              >
                Ver bosque
              </button>
              <button
                className={secondaryButtonClass}
                onClick={() => router.push(`/year/${currentYear}`)}
              >
                Ver year actual
              </button>
              <button
                className={secondaryButtonClass}
                onClick={() => router.push("/admin/plan-types")}
              >
                Tipos de plan
              </button>
              <button
                className={secondaryButtonClass}
                onClick={() => router.push("/admin")}
              >
                Volver al indice
              </button>
            </>
          }
          message={
            msg ? (
              <div className="rounded-2xl border bg-[var(--lv-warning-soft)] p-3 text-sm text-[var(--lv-text)]">
                {msg}
              </div>
            ) : null
          }
          stats={[
            { label: "Tema activo", value: themes.find((theme) => theme.is_active)?.label ?? "Sin tema" },
            { label: "Temas", value: String(themes.length) },
          ]}
          noticeTitle="Uso recomendado"
          noticeBody="Toca aquí el tono anual del bosque. Si quieres cambiar cómo se ve una flor concreta del proyecto, ve a Tipos de plan."
        />

        <AdminWorkspace
          sidebar={
            <>
              <AdminPanel
                title="Biblioteca anual"
                description="Elige el tema que quieres editar. Solo uno puede estar activo a la vez."
                actions={
                  !selectedTheme?.is_active ? (
                    <button
                      type="button"
                      className={secondaryButtonClass}
                      onClick={() => void activateTheme()}
                      disabled={!themeKey || saving}
                    >
                      Usar como activo
                    </button>
                  ) : null
                }
              >
                <div className="space-y-2">
                  {themes.map((theme) => (
                    <button
                      key={theme.key}
                      type="button"
                      onClick={() => setThemeKey(theme.key)}
                      className={`w-full rounded-[20px] border p-3 text-left transition ${
                        theme.key === themeKey
                          ? "border-[var(--lv-primary)] bg-[var(--lv-primary-soft)]"
                          : "border-[var(--lv-border)] bg-[var(--lv-surface-soft)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium text-[var(--lv-text)]">
                            {theme.label}
                          </div>
                          <div className="mt-1 text-xs text-[var(--lv-text-muted)]">{theme.key}</div>
                        </div>
                        {theme.is_active ? (
                          <span className="rounded-full border border-[var(--lv-success)] bg-[var(--lv-success-soft)] px-2 py-1 text-[11px] text-[var(--lv-success)]">
                            Activo
                          </span>
                        ) : null}
                      </div>
                    </button>
                  ))}
                </div>

                <details className="mt-4 rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4">
                  <summary className="cursor-pointer text-sm font-medium text-[var(--lv-text)]">
                    Crear tema nuevo
                  </summary>
                  <div className="mt-3 space-y-3">
                    <input
                      className={fieldControlClass}
                      value={newThemeKey}
                      onChange={(event) => setNewThemeKey(event.target.value)}
                      placeholder="storybook_2027"
                    />
                    <input
                      className={fieldControlClass}
                      value={newThemeLabel}
                      onChange={(event) => setNewThemeLabel(event.target.value)}
                      placeholder="Bosque 2027"
                    />
                    <label className="flex items-center gap-2 text-sm text-[var(--lv-text)]">
                      <input
                        type="checkbox"
                        checked={copyCurrentTheme}
                        onChange={(event) => setCopyCurrentTheme(event.target.checked)}
                      />
                      Copiar el tema actual como base
                    </label>
                    <button
                      type="button"
                      className={primaryButtonClass}
                      onClick={() => void createTheme()}
                      disabled={saving}
                    >
                      Crear tema
                    </button>
                  </div>
                </details>
              </AdminPanel>

              <AdminPanel
                title="Que quieres tocar"
                description="La pantalla solo te enseña lo necesario para esa tarea."
              >
                <AdminToggleGroup
                  value={view}
                  onChange={setView}
                  options={VIEW_OPTIONS}
                />
              </AdminPanel>

              <AdminPanel title="Impacta en" description="Donde vas a notar este cambio.">
                <div className="grid gap-2">
                  <SummaryChip label="Bosque" value="Título, tonos, narrativa y vacios" />
                  <SummaryChip label="Year" value="Tarjetas anuales y lectura del año" />
                  <SummaryChip label="No cambia" value="La flor o semilla de cada plan" />
                </div>
              </AdminPanel>
            </>
          }
        >
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-4">
              {view === "theme" ? (
                <AdminPanel
                  title="Tema anual"
                  description="Pon nombre al bosque del año y define el copy base que acompaña al resumen anual."
                  actions={
                    <button
                      type="button"
                      className={primaryButtonClass}
                      onClick={() => void saveThemeSection()}
                      disabled={!themeKey || saving}
                    >
                      Guardar tema
                    </button>
                  }
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-1 text-sm">
                      <div className="font-medium text-[var(--lv-text)]">Nombre del tema</div>
                      <input
                        className={fieldControlClass}
                        value={themeLabel}
                        onChange={(event) => setThemeLabel(event.target.value)}
                        placeholder="Bosque clasico"
                      />
                    </label>

                    <label className="space-y-1 text-sm">
                      <div className="font-medium text-[var(--lv-text)]">Descripcion interna</div>
                      <input
                        className={fieldControlClass}
                        value={themeDescription}
                        onChange={(event) => setThemeDescription(event.target.value)}
                        placeholder="Tema para años equilibrados"
                      />
                    </label>

                    <label className="space-y-1 text-sm md:col-span-2">
                      <div className="font-medium text-[var(--lv-text)]">Titulo del bosque</div>
                      <input
                        className={fieldControlClass}
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="Bosque de Recuerdos"
                      />
                    </label>

                    <label className="space-y-1 text-sm md:col-span-2">
                      <div className="font-medium text-[var(--lv-text)]">Subtitulo</div>
                      <textarea
                        className={textareaControlClass}
                        value={subtitle}
                        onChange={(event) => setSubtitle(event.target.value)}
                        placeholder="Cada página del año deja una huella en vuestro bosque."
                      />
                    </label>

                    <label className="space-y-1 text-sm md:col-span-2">
                      <div className="font-medium text-[var(--lv-text)]">Mensaje cuando no hay contenido</div>
                      <textarea
                        className={tallTextareaControlClass}
                        value={emptyMessage}
                        onChange={(event) => setEmptyMessage(event.target.value)}
                        placeholder="Todavía no hay flores en esta etapa del año."
                      />
                    </label>
                  </div>
                </AdminPanel>
              ) : null}

              {view === "labels" ? (
                <>
                  <AdminPanel
                    title="Estaciones"
                    description="Esto controla como se nombran y se tin~en las estaciones del bosque anual."
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      {SEASONS.map((season) => (
                        <div key={season.code} className="rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4">
                          <div className="mb-3 text-sm font-medium text-[var(--lv-text)]">{season.label}</div>
                          <div className="space-y-3">
                            <label className="space-y-1 text-sm">
                              <div className="text-[var(--lv-text-muted)]">Etiqueta</div>
                              <input
                                className={fieldControlClass}
                                value={assetDrafts[`season_label.${season.code}`] ?? ""}
                                onChange={(event) =>
                                  setAssetDrafts((prev) => ({
                                    ...prev,
                                    [`season_label.${season.code}`]: event.target.value,
                                  }))
                                }
                              />
                            </label>
                            <label className="space-y-1 text-sm">
                              <div className="text-[var(--lv-text-muted)]">Color de tarjeta</div>
                              <input
                                className="h-12 w-full rounded-2xl border p-2"
                                type="color"
                                value={
                                  assetDrafts[`color.season_card.${season.code}`] ?? "#f7f7f7"
                                }
                                onChange={(event) =>
                                  setAssetDrafts((prev) => ({
                                    ...prev,
                                    [`color.season_card.${season.code}`]: event.target.value,
                                  }))
                                }
                              />
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AdminPanel>

                  <AdminPanel
                    title="Elementos"
                    description="Ajusta nombre, token corto y color de cada elemento para el bosque y el libro del año."
                    actions={
                      <button
                        type="button"
                        className={primaryButtonClass}
                        onClick={() => void saveLabelsSection()}
                        disabled={!themeKey || saving}
                      >
                        Guardar etiquetas
                      </button>
                    }
                  >
                    <div className="grid gap-4 lg:grid-cols-2">
                      {ELEMENTS.map((element) => (
                        <div
                          key={element.code}
                          className="rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4"
                        >
                          <div className="mb-3 text-sm font-medium text-[var(--lv-text)]">
                            {element.label}
                          </div>
                          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px]">
                            <label className="space-y-1 text-sm">
                              <div className="text-[var(--lv-text-muted)]">Etiqueta larga</div>
                              <input
                                className={fieldControlClass}
                                value={assetDrafts[`element_label.${element.code}`] ?? ""}
                                onChange={(event) =>
                                  setAssetDrafts((prev) => ({
                                    ...prev,
                                    [`element_label.${element.code}`]: event.target.value,
                                  }))
                                }
                              />
                            </label>
                            <label className="space-y-1 text-sm">
                              <div className="text-[var(--lv-text-muted)]">Token</div>
                              <input
                                className={fieldControlClass}
                                value={assetDrafts[`token.element.${element.code}`] ?? ""}
                                onChange={(event) =>
                                  setAssetDrafts((prev) => ({
                                    ...prev,
                                    [`token.element.${element.code}`]: event.target.value,
                                  }))
                                }
                              />
                            </label>
                            <label className="space-y-1 text-sm md:col-span-2">
                              <div className="text-[var(--lv-text-muted)]">Color</div>
                              <input
                                className="h-12 w-full rounded-2xl border p-2"
                                type="color"
                                value={assetDrafts[`color.element.${element.code}`] ?? "#f3f4f6"}
                                onChange={(event) =>
                                  setAssetDrafts((prev) => ({
                                    ...prev,
                                    [`color.element.${element.code}`]: event.target.value,
                                  }))
                                }
                              />
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AdminPanel>
                </>
              ) : null}

              {view === "narrative" ? (
                <AdminPanel
                  title="Narrativa anual"
                  description="Escribe el tono del bosque con frases reutilizables. Usa placeholders solo cuando aportan, como {season} o {element}."
                  actions={
                    <button
                      type="button"
                      className={primaryButtonClass}
                      onClick={() => void saveNarrativeSection()}
                      disabled={!themeKey || saving}
                    >
                      Guardar narrativa
                    </button>
                  }
                >
                  <div className="grid gap-4">
                    {NARRATIVE_FIELDS.map((field) => (
                      <label
                        key={field.key}
                        className="space-y-1 rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4 text-sm"
                      >
                        <div className="font-medium text-[var(--lv-text)]">{field.label}</div>
                        <div className="text-xs leading-5 text-[var(--lv-text-muted)]">{field.hint}</div>
                        <textarea
                          className={textareaControlClass}
                          value={templateDrafts[field.key] ?? ""}
                          onChange={(event) =>
                            setTemplateDrafts((prev) => ({
                              ...prev,
                              [field.key]: event.target.value,
                            }))
                          }
                        />
                      </label>
                    ))}
                  </div>
                </AdminPanel>
              ) : null}

              {view === "advanced" ? (
                <>
                  <AdminPanel
                    title="Avanzado"
                    description="Aquí quedan los tokens secundarios del bosque: tiers, hitos, moods e iconos que no necesitas tocar a diario."
                  >
                    <AdminInlineNote tone="warning">
                      Si vienes aqui para una tarea diaria, el problema no eres tu: la
                      herramienta todavia necesita mejor diseno. Este bloque deberia ser
                      la excepcion.
                    </AdminInlineNote>
                  </AdminPanel>

                  <AdminPanel title="Assets secundarios" description="Solo lo que queda fuera del trabajo diario.">
                    <div className="space-y-2">
                      {secondaryAssets.length ? (
                        secondaryAssets.map((row) => (
                          <div key={row.id} className="rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4">
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <div className="text-xs font-mono text-[var(--lv-text-muted)]">{row.asset_key}</div>
                              <button
                                type="button"
                                className="rounded-full border px-3 py-1 text-xs"
                                onClick={() =>
                                  patchAssetRow(row.id, { enabled: !row.enabled })
                                }
                              >
                                {row.enabled ? "ON" : "OFF"}
                              </button>
                            </div>
                            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_100px_auto]">
                              <input
                                className={fieldControlClass}
                                value={row.value}
                                onChange={(event) =>
                                  patchAssetRow(row.id, { value: event.target.value })
                                }
                              />
                              <input
                                className={fieldControlClass}
                                value={row.sort_order}
                                onChange={(event) =>
                                  patchAssetRow(row.id, {
                                    sort_order:
                                      Number.parseInt(event.target.value || "0", 10) || 0,
                                  })
                                }
                              />
                              <button
                                type="button"
                                className={secondaryButtonClass}
                                onClick={() => void saveAssetRow(row)}
                              >
                                Guardar
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <AdminInlineNote>
                          Este tema no tiene assets secundarios guardados todavia.
                        </AdminInlineNote>
                      )}
                    </div>

                    <details className="mt-4 rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4">
                      <summary className="cursor-pointer text-sm font-medium text-[var(--lv-text)]">
                        Anadir asset manual
                      </summary>
                      <div className="mt-3 grid gap-3">
                        <input
                          className={fieldControlClass}
                          value={newAssetKey}
                          onChange={(event) => setNewAssetKey(event.target.value)}
                          placeholder="icon.kind.pages_completed"
                        />
                        <input
                          className={fieldControlClass}
                          value={newAssetValue}
                          onChange={(event) => setNewAssetValue(event.target.value)}
                          placeholder="value"
                        />
                        <button
                          type="button"
                          className="w-fit rounded-[20px] border px-4 py-2 text-sm"
                          onClick={() => void addAsset()}
                        >
                          Guardar asset
                        </button>
                      </div>
                    </details>
                  </AdminPanel>

                  <AdminPanel title="Templates secundarios" description="Narrativas no prioritarias o casos raros.">
                    <div className="space-y-2">
                      {secondaryTemplates.length ? (
                        secondaryTemplates.map((row) => (
                          <div key={row.id} className="rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4">
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <div className="text-xs font-mono text-[var(--lv-text-muted)]">{row.template_key}</div>
                              <button
                                type="button"
                                className="rounded-full border px-3 py-1 text-xs"
                                onClick={() =>
                                  patchTemplateRow(row.id, { enabled: !row.enabled })
                                }
                              >
                                {row.enabled ? "ON" : "OFF"}
                              </button>
                            </div>
                            <div className="grid gap-3">
                              <textarea
                                className={textareaControlClass}
                                value={row.body}
                                onChange={(event) =>
                                  patchTemplateRow(row.id, { body: event.target.value })
                                }
                              />
                              <div className="grid gap-3 md:grid-cols-[100px_auto]">
                                <input
                                  className={fieldControlClass}
                                  value={row.sort_order}
                                  onChange={(event) =>
                                    patchTemplateRow(row.id, {
                                      sort_order:
                                        Number.parseInt(event.target.value || "0", 10) || 0,
                                    })
                                  }
                                />
                                <button
                                  type="button"
                                  className={secondaryButtonClass}
                                  onClick={() => void saveTemplateRow(row)}
                                >
                                  Guardar
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <AdminInlineNote>
                          Este tema no tiene templates secundarios guardados todavia.
                        </AdminInlineNote>
                      )}
                    </div>

                    <details className="mt-4 rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4">
                      <summary className="cursor-pointer text-sm font-medium text-[var(--lv-text)]">
                        Anadir template manual
                      </summary>
                      <div className="mt-3 grid gap-3">
                        <input
                          className={fieldControlClass}
                          value={newTemplateKey}
                          onChange={(event) => setNewTemplateKey(event.target.value)}
                          placeholder="template_key"
                        />
                        <textarea
                          className={textareaControlClass}
                          value={newTemplateBody}
                          onChange={(event) => setNewTemplateBody(event.target.value)}
                          placeholder="body"
                        />
                        <button
                          type="button"
                          className="w-fit rounded-[20px] border px-4 py-2 text-sm"
                          onClick={() => void addTemplate()}
                        >
                          Guardar template
                        </button>
                      </div>
                    </details>
                  </AdminPanel>
                </>
              ) : null}
            </div>

            <div className="space-y-4">
              <AdminPanel title="Preview anual" description="Así se sentiria ahora mismo el bosque con estos cambios.">
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4 shadow-[var(--lv-shadow-sm)]">
                    <div className="text-lg font-semibold text-[var(--lv-text)]">
                      {preview.title}
                    </div>
                    <div className="mt-1 text-sm leading-6 text-[var(--lv-text-muted)]">
                      {preview.subtitle}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                      Estaciones
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {preview.seasonCards.map((season) => (
                        <div
                          key={season.code}
                          className="rounded-[20px] border p-3 text-sm"
                          style={{ backgroundColor: season.bg }}
                        >
                          {season.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                      Elementos
                    </div>
                    <div className="grid gap-2">
                      {preview.elementCards.map((element) => (
                        <div
                          key={element.code}
                          className="flex items-center justify-between rounded-[20px] border p-3 text-sm"
                          style={{ backgroundColor: `${element.bg}22` }}
                        >
                          <div className="font-medium text-[var(--lv-text)]">{element.label}</div>
                          <div
                            className="flex h-8 min-w-8 items-center justify-center rounded-full border px-2"
                            style={{ borderColor: element.bg }}
                          >
                            {element.token}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                      Narrativa
                    </div>
                    <div className="space-y-2 rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-4 text-sm leading-6 text-[var(--lv-text)]">
                      <div>{preview.narrativeSamples.seasonEmpty}</div>
                      <div>{preview.narrativeSamples.moodShiny}</div>
                      <div>{preview.narrativeSamples.starsHigh}</div>
                      <div>{preview.narrativeSamples.elementLine}</div>
                      <div className="rounded-[18px] border border-dashed border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-3 text-[var(--lv-text-muted)]">
                        {preview.emptyMessage}
                      </div>
                    </div>
                  </div>
                </div>
              </AdminPanel>

              <AdminPanel title="Lo que no deberias tocar aquí" description="Para no volver a mezclar dominios.">
                <AdminInlineNote>
                  La flor y la semilla de cada plan no se editan aqui. Si cambias eso
                  desde el bosque anual, el sistema vuelve a romper coherencia.
                </AdminInlineNote>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    {
                      label: "Ir a Tipos de plan",
                      href: "/admin/plan-types",
                    },
                    {
                      label: "Ver bosque real",
                      href: "/forest",
                    },
                    {
                      label: "Abrir year actual",
                      href: `/year/${currentYear}`,
                    },
                  ].map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      className={secondaryButtonClass}
                      onClick={() => router.push(action.href)}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </AdminPanel>
            </div>
          </div>
        </AdminWorkspace>
      </div>
    </div>
  );
}
