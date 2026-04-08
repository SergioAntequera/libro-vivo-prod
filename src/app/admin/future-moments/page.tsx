"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ensureSuperadminOrRedirect } from "@/lib/auth";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { supabase } from "@/lib/supabase";
import {
  DEFAULT_FUTURE_MOMENTS_CONFIG,
  FUTURE_MOMENTS_CATALOG_KEY,
  getFutureMomentsCatalogRows,
  getFutureMomentsConfig,
  normalizeFutureMomentsConfig,
  type FutureMomentsConfig,
} from "@/lib/futureMomentsConfig";
import {
  ANNUAL_TREE_NARRATIVE_EDITOR_META,
  resolveAnnualTreeNarrativeCopy,
} from "@/lib/annualTreeNarrative";

function linesFromList(items: string[]) {
  return items.join("\n");
}

function listFromLines(value: string) {
  return value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function SectionCard(props: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-5 shadow-[var(--lv-shadow-sm)]">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
        {props.eyebrow}
      </div>
      <h2 className="mt-2 text-2xl font-semibold text-[var(--lv-text)]">{props.title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--lv-text-muted)]">
        {props.description}
      </p>
      <div className="mt-5 space-y-4">{props.children}</div>
    </section>
  );
}

function Field(props: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <div>
        <div className="text-sm font-medium text-[var(--lv-text)]">{props.label}</div>
        {props.hint ? (
          <div className="text-xs leading-5 text-[var(--lv-text-muted)]">{props.hint}</div>
        ) : null}
      </div>
      {props.children}
    </label>
  );
}

export default function AdminFutureMomentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [persistedConfig, setPersistedConfig] = useState<FutureMomentsConfig>(
    DEFAULT_FUTURE_MOMENTS_CONFIG,
  );
  const [draft, setDraft] = useState<FutureMomentsConfig>(DEFAULT_FUTURE_MOMENTS_CONFIG);
  const [objectIdeasText, setObjectIdeasText] = useState(
    linesFromList(DEFAULT_FUTURE_MOMENTS_CONFIG.capsule.objectIdeas),
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const session = await ensureSuperadminOrRedirect(router);
      if (!session || cancelled) {
        setLoading(false);
        return;
      }

      try {
        const config = await getFutureMomentsConfig();
        if (cancelled) return;
        setPersistedConfig(config);
        setDraft(config);
        setObjectIdeasText(linesFromList(config.capsule.objectIdeas));
      } catch (error) {
        if (cancelled) return;
        setMessage(error instanceof Error ? error.message : "No se pudo cargar esta configuracion.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const normalizedDraft = useMemo(
    () =>
      normalizeFutureMomentsConfig({
        ...draft,
        capsule: {
          ...draft.capsule,
          objectIdeas: listFromLines(objectIdeasText),
        },
      }),
    [draft, objectIdeasText],
  );

  const isDirty = JSON.stringify(normalizedDraft) !== JSON.stringify(persistedConfig);

  function updateTreeNarrative(
    key: (typeof ANNUAL_TREE_NARRATIVE_EDITOR_META)[number]["key"],
    field: "eyebrow" | "title" | "body",
    value: string,
  ) {
    setDraft((current) => ({
      ...current,
      tree: {
        ...current.tree,
        narratives: current.tree.narratives.map((entry) =>
          entry.key === key ? { ...entry, [field]: value } : entry,
        ),
      },
    }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const catalogRow = {
        key: FUTURE_MOMENTS_CATALOG_KEY,
        label: "Future Moments",
        description:
          "Configuracion canonica de capsulas del tiempo y ritual anual del arbol.",
        is_active: true,
      };

      const itemRows = getFutureMomentsCatalogRows(normalizedDraft);

      const [catalogRes, itemsRes] = await Promise.all([
        supabase.from("catalogs").upsert(catalogRow, { onConflict: "key" }),
        supabase.from("catalog_items").upsert(itemRows, { onConflict: "catalog_key,code" }),
      ]);

      if (catalogRes.error) throw catalogRes.error;
      if (itemsRes.error) throw itemsRes.error;

      setPersistedConfig(normalizedDraft);
      setDraft(normalizedDraft);
      setObjectIdeasText(linesFromList(normalizedDraft.capsule.objectIdeas));
      setMessage("Momentos especiales guardados.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar esta configuracion.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <PageLoadingState message="Cargando momentos especiales..." />;
  }

  return (
    <div className="min-h-screen bg-[var(--lv-bg)] p-6 text-[var(--lv-text)]">
      <div className="mx-auto max-w-6xl space-y-4">
        <section className="rounded-[30px] border border-[var(--lv-border)] bg-[linear-gradient(180deg,var(--lv-surface)_0%,var(--lv-surface-soft)_100%)] p-6 shadow-[var(--lv-shadow-sm)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-4xl space-y-3">
              <div className="inline-flex rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--lv-text-muted)]">
                Dominio admin propio
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Capsulas y arbol real
              </h1>
              <p className="text-sm leading-6 text-[var(--lv-text-muted)]">
                Este dominio no deberia vivir en `system`. Aqui se gobierna la verdad canonica de
                los momentos especiales: cuando se insinuan, como se presentan y que tono tiene la
                ceremonia visible.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="lv-btn lv-btn-secondary"
                onClick={() => router.push("/admin")}
              >
                Volver
              </button>
              <button
                type="button"
                className="lv-btn lv-btn-primary disabled:opacity-50"
                onClick={() => void handleSave()}
                disabled={saving || !isDirty}
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
          {message ? <div className="mt-4"><StatusNotice message={message} /></div> : null}
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <SectionCard
              eyebrow="Arbol real"
              title="Copy del ritual y de sus recordatorios"
              description="La regla temporal vive en runtime, pero el tono y la forma de presentarlo deben venir de aqui."
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <Field label="Eyebrow plantacion">
                  <input
                    className="lv-input"
                    value={draft.tree.plantingEyebrow}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        tree: { ...current.tree, plantingEyebrow: event.target.value },
                      }))
                    }
                  />
                </Field>
                <Field
                  label="Eyebrow aniversario"
                  hint="Usado en los popups de 1, 3, 5, 7 y 10 años."
                >
                  <input
                    className="lv-input"
                    value={draft.tree.anniversaryEyebrow}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        tree: { ...current.tree, anniversaryEyebrow: event.target.value },
                      }))
                    }
                  />
                </Field>
              </div>

              <Field label="Intro plantacion">
                <textarea
                  className="lv-textarea min-h-[120px]"
                  value={draft.tree.plantingIntro}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      tree: { ...current.tree, plantingIntro: event.target.value },
                    }))
                  }
                />
              </Field>

              <div className="grid gap-4 lg:grid-cols-2">
                <Field label="Hint de ubicacion">
                  <textarea
                    className="lv-textarea min-h-[110px]"
                    value={draft.tree.plantingLocationHint}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        tree: { ...current.tree, plantingLocationHint: event.target.value },
                      }))
                    }
                  />
                </Field>
                <Field label="Hint de notas">
                  <textarea
                    className="lv-textarea min-h-[110px]"
                    value={draft.tree.plantingNotesHint}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        tree: { ...current.tree, plantingNotesHint: event.target.value },
                      }))
                    }
                  />
                </Field>
              </div>

              <Field label="Intro aniversario">
                <textarea
                  className="lv-textarea min-h-[120px]"
                  value={draft.tree.anniversaryIntro}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      tree: { ...current.tree, anniversaryIntro: event.target.value },
                    }))
                  }
                />
              </Field>

              <div className="grid gap-4 lg:grid-cols-2">
                <Field label="Hint de ubicacion aniversario">
                  <textarea
                    className="lv-textarea min-h-[110px]"
                    value={draft.tree.anniversaryLocationHint}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        tree: { ...current.tree, anniversaryLocationHint: event.target.value },
                      }))
                    }
                  />
                </Field>
                <Field label="Hint de notas aniversario">
                  <textarea
                    className="lv-textarea min-h-[110px]"
                    value={draft.tree.anniversaryNotesHint}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        tree: { ...current.tree, anniversaryNotesHint: event.target.value },
                      }))
                    }
                  />
                </Field>
              </div>

              <div className="rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4">
                <div className="text-sm font-semibold text-[var(--lv-text)]">
                  Narrativa del crecimiento anual
                </div>
                <div className="mt-1 text-xs leading-5 text-[var(--lv-text-muted)]">
                  Estos textos viven dentro del bloque del arbol y tambien alimentan el overlay ceremonial cuando se cruza un nuevo hito.
                </div>

                <div className="mt-4 space-y-4">
                  {ANNUAL_TREE_NARRATIVE_EDITOR_META.map((meta) => {
                    const entry = draft.tree.narratives.find((item) => item.key === meta.key);
                    return (
                      <div
                        key={meta.key}
                        className="rounded-[22px] border border-[var(--lv-border)] bg-white p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-xs uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
                              {meta.rangeLabel}
                            </div>
                            <div className="mt-1 text-base font-semibold text-[var(--lv-text)]">
                              {meta.title}
                            </div>
                            <div className="mt-1 max-w-2xl text-xs leading-5 text-[var(--lv-text-muted)]">
                              {meta.description}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                          <Field label="Eyebrow">
                            <input
                              className="lv-input"
                              value={entry?.eyebrow ?? ""}
                              onChange={(event) =>
                                updateTreeNarrative(meta.key, "eyebrow", event.target.value)
                              }
                            />
                          </Field>
                          <Field label="Titulo">
                            <input
                              className="lv-input"
                              value={entry?.title ?? ""}
                              onChange={(event) =>
                                updateTreeNarrative(meta.key, "title", event.target.value)
                              }
                            />
                          </Field>
                        </div>

                        <Field label="Texto narrativo">
                          <textarea
                            className="lv-textarea mt-2 min-h-[110px]"
                            value={entry?.body ?? ""}
                            onChange={(event) =>
                              updateTreeNarrative(meta.key, "body", event.target.value)
                            }
                          />
                        </Field>
                      </div>
                    );
                  })}
                </div>
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="Capsula anual"
              title="Ceremonia, sorpresa y tono de apertura"
              description="La regla anual y el mes de aparicion viven aqui para que el admin gobierne una sola verdad visible."
            >
              <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
                <Field
                  label="Mes de aparicion"
                  hint="A partir de este mes `home` puede sugerir crear la capsula anual."
                >
                  <input
                    className="lv-input"
                    type="number"
                    min={1}
                    max={12}
                    value={draft.capsule.annualPromptStartMonth}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        capsule: {
                          ...current.capsule,
                          annualPromptStartMonth: Number(event.target.value) || 1,
                        },
                      }))
                    }
                  />
                </Field>
                <div className="rounded-[22px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4 text-sm leading-6 text-[var(--lv-text-muted)]">
                  La restriccion de "una por año" sigue siendo una regla fuerte del dominio. Lo
                  que editas aqui es el tono, el momento del empujon y la capa ceremonial visible.
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Field label="Eyebrow hero">
                  <input
                    className="lv-input"
                    value={draft.capsule.heroEyebrow}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        capsule: { ...current.capsule, heroEyebrow: event.target.value },
                      }))
                    }
                  />
                </Field>
                <Field label="Titulo hero">
                  <input
                    className="lv-input"
                    value={draft.capsule.heroTitle}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        capsule: { ...current.capsule, heroTitle: event.target.value },
                      }))
                    }
                  />
                </Field>
              </div>

              <Field label="Descripcion hero">
                <textarea
                  className="lv-textarea min-h-[120px]"
                  value={draft.capsule.heroDescription}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      capsule: { ...current.capsule, heroDescription: event.target.value },
                    }))
                  }
                />
              </Field>

              <div className="grid gap-4 lg:grid-cols-2">
                <Field label="Hint ceremonial">
                  <textarea
                    className="lv-textarea min-h-[120px]"
                    value={draft.capsule.ceremonyHint}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      capsule: { ...current.capsule, ceremonyHint: event.target.value },
                    }))
                  }
                />
              </Field>
              <Field label="Prompt simbolico">
                <textarea
                  className="lv-textarea min-h-[120px]"
                  value={draft.capsule.symbolicPrompt}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      capsule: { ...current.capsule, symbolicPrompt: event.target.value },
                    }))
                  }
                />
              </Field>
              </div>

              <Field
                label="Ideas de contenido"
                hint="Una por linea. Se usan como sugerencias visibles en la experiencia de capsulas."
              >
                <textarea
                  className="lv-textarea min-h-[150px]"
                  value={objectIdeasText}
                  onChange={(event) => setObjectIdeasText(event.target.value)}
                />
              </Field>

              <div className="grid gap-4 lg:grid-cols-2">
                <Field label="Eyebrow apertura">
                  <input
                    className="lv-input"
                    value={draft.capsule.openingEyebrow}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        capsule: { ...current.capsule, openingEyebrow: event.target.value },
                      }))
                    }
                  />
                </Field>
                <Field label="Titulo apertura">
                  <input
                    className="lv-input"
                    value={draft.capsule.openingTitle}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        capsule: { ...current.capsule, openingTitle: event.target.value },
                      }))
                    }
                  />
                </Field>
              </div>

              <Field label="Descripcion apertura">
                <textarea
                  className="lv-textarea min-h-[120px]"
                  value={draft.capsule.openingDescription}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      capsule: { ...current.capsule, openingDescription: event.target.value },
                    }))
                  }
                />
              </Field>
            </SectionCard>
          </div>

          <aside className="space-y-4">
            <SectionCard
              eyebrow="Preview"
              title="Lectura visible"
              description="Esto resume como deberia respirar el dominio en producto."
            >
              <div className="rounded-[24px] border border-[#d8e6cf] bg-[linear-gradient(180deg,#fffdf8_0%,#f7fbf4_100%)] p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                  {normalizedDraft.tree.plantingEyebrow}
                </div>
                <div className="mt-2 text-lg font-semibold text-[var(--lv-text)]">
                  Arbol real al cerrar el año
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--lv-text-muted)]">
                  {normalizedDraft.tree.plantingIntro}
                </p>
              </div>

              <div className="space-y-3 rounded-[24px] border border-[#d8e6cf] bg-white/90 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                  Narrativa del arbol
                </div>
                {ANNUAL_TREE_NARRATIVE_EDITOR_META.map((meta) => {
                  const entry = resolveAnnualTreeNarrativeCopy(
                    meta.key === "celebration"
                      ? 100
                      : meta.key === "mature"
                        ? 75
                        : meta.key === "ritual"
                          ? 50
                          : meta.key === "story"
                            ? 25
                            : meta.key === "rooting"
                              ? 10
                              : 0,
                    normalizedDraft.tree.narratives,
                  );

                  return (
                    <div
                      key={`preview-tree-narrative-${meta.key}`}
                      className="rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-3"
                    >
                      <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
                        {meta.rangeLabel} · {entry.eyebrow}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-[var(--lv-text)]">
                        {entry.title}
                      </div>
                      <div className="mt-1 text-xs leading-5 text-[var(--lv-text-muted)]">
                        {entry.body}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-[24px] border border-[#d9cdec] bg-[linear-gradient(180deg,#fff8fd_0%,#f8f5ff_100%)] p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                  {normalizedDraft.capsule.heroEyebrow}
                </div>
                <div className="mt-2 text-lg font-semibold text-[var(--lv-text)]">
                  {normalizedDraft.capsule.heroTitle}
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--lv-text-muted)]">
                  {normalizedDraft.capsule.heroDescription}
                </p>
              </div>

              <div className="rounded-[22px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                  Reglas fuertes
                </div>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--lv-text-muted)]">
                  <li>Home solo muestra estos momentos si son accionables ahora.</li>
                  <li>El arbol vuelve en 1, 3, 5, 7 y 10 años, no como modulo fijo.</li>
                  <li>Solo existe una capsula anual por jardin y por año.</li>
                </ul>
              </div>
            </SectionCard>
          </aside>
        </div>
      </div>
    </div>
  );
}
