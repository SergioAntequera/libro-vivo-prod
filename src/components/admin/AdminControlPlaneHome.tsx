"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { StatusNotice } from "@/components/ui/StatusNotice";

export type AdminControlPlaneStats = {
  activeGardenTitle: string | null;
  planTypesTotal: number;
  planTypesWithoutCanonicalVisuals: number;
  pagesTotal: number;
  reflectionsTotal: number;
  seedsTotal: number;
  seedFlowRules: number;
  achievementsUnlockedTotal: number;
  mapPlacesTotal: number;
  mapRoutesTotal: number;
  mapZonesTotal: number;
  currentYear: number;
  currentYearPagesTotal: number;
  currentYearHasNote: boolean;
  currentYearHasCover: boolean;
  currentYearHighlightCount: number;
  seasonNotesTotal: number;
  activeForestThemeKey: string | null;
  activePdfThemeKey: string | null;
};

type AdminControlPlaneHomeProps = {
  stats: AdminControlPlaneStats;
  loading: boolean;
  fetchMessage: string | null;
  onGardenChanged: () => void;
};

type DomainState = "ready" | "transition" | "pending" | "advanced";

type DomainCard = {
  title: string;
  description: string;
  source: string;
  owns: string;
  href: string | null;
  ctaLabel: string;
  state: DomainState;
  stats?: Array<{ label: string; value: string }>;
  note?: string | null;
};

type DomainSection = {
  title: string;
  description: string;
  cards: DomainCard[];
};

type AlertItem = {
  title: string;
  detail: string;
  href: string | null;
  tone: "warning" | "info";
};

function domainStateLabel(state: DomainState) {
  if (state === "ready") return "Operable hoy";
  if (state === "advanced") return "Avanzado";
  if (state === "pending") return "Siguiente bloque";
  return "En transicion";
}

function domainStateClass(state: DomainState) {
  if (state === "ready") {
    return "border-[var(--lv-success)] bg-[var(--lv-success-soft)] text-[var(--lv-success)]";
  }
  if (state === "advanced") {
    return "border-[var(--lv-info)] bg-[var(--lv-info-soft)] text-[var(--lv-info)]";
  }
  if (state === "pending") {
    return "border-[var(--lv-warning)] bg-[var(--lv-warning-soft)] text-[var(--lv-warning)]";
  }
  return "border-[var(--lv-primary)] bg-[var(--lv-primary-soft)] text-[var(--lv-primary-strong)]";
}

function DomainCardPanel({ card }: { card: DomainCard }) {
  const router = useRouter();
  const clickable = Boolean(card.href);

  return (
    <div
      className={`rounded-[26px] border p-5 shadow-sm transition ${
        clickable
          ? "border-[var(--lv-border)] bg-[var(--lv-surface)] hover:border-[var(--lv-primary)] hover:bg-[var(--lv-surface-soft)]"
          : "border-[var(--lv-border)] bg-[var(--lv-surface-soft)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-lg font-semibold text-[var(--lv-text)]">{card.title}</div>
          <p className="text-sm leading-6 text-[var(--lv-text-muted)]">{card.description}</p>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ${domainStateClass(
            card.state,
          )}`}
        >
          {domainStateLabel(card.state)}
        </span>
      </div>

      <div className="mt-4 grid gap-3 text-sm leading-6 text-[var(--lv-text-muted)] md:grid-cols-2">
        <div className="rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">Fuente</div>
          <div className="mt-1 text-sm text-[var(--lv-text)]">{card.source}</div>
        </div>
        <div className="rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">Gobierna</div>
          <div className="mt-1 text-sm text-[var(--lv-text)]">{card.owns}</div>
        </div>
      </div>

      {card.stats && card.stats.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {card.stats.map((stat) => (
            <div
              key={`${card.title}-${stat.label}`}
              className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-3 py-1.5 text-sm"
            >
              <span className="text-[var(--lv-text-muted)]">{stat.label}:</span>{" "}
              <span className="font-medium text-[var(--lv-text)]">{stat.value}</span>
            </div>
          ))}
        </div>
      ) : null}

      {card.note ? (
        <p className="mt-4 text-sm leading-6 text-[var(--lv-text-muted)]">{card.note}</p>
      ) : null}

      <div className="mt-4">
        <button
          type="button"
          disabled={!clickable}
          className={`rounded-[20px] px-4 py-2 text-sm font-medium transition ${
            clickable
              ? "bg-[var(--lv-primary)] text-white"
              : "cursor-default border border-[var(--lv-warning)] bg-[var(--lv-warning-soft)] text-[var(--lv-warning)]"
          }`}
          onClick={() => {
            if (card.href) router.push(card.href);
          }}
        >
          {clickable ? card.ctaLabel : "Se abre en el siguiente bloque"}
        </button>
      </div>
    </div>
  );
}

function SummaryCard(props: { eyebrow: string; value: string; detail: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-4 shadow-[var(--lv-shadow-sm)]">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">{props.eyebrow}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-[var(--lv-text)]">{props.value}</div>
      <p className="mt-2 text-sm leading-6 text-[var(--lv-text-muted)]">{props.detail}</p>
    </div>
  );
}

function AlertRow({ alert }: { alert: AlertItem }) {
  const router = useRouter();
  const toneClass =
    alert.tone === "warning"
      ? "border-[var(--lv-warning)] bg-[var(--lv-warning-soft)]"
      : "border-[var(--lv-border)] bg-[var(--lv-surface-soft)]";

  return (
    <div className={`rounded-[22px] border px-4 py-3 ${toneClass}`}>
      <div className="text-sm font-medium text-[var(--lv-text)]">{alert.title}</div>
      <p className="mt-1 text-sm leading-6 text-[var(--lv-text-muted)]">{alert.detail}</p>
      {alert.href ? (
        <button
          type="button"
          className="mt-3 rounded-[16px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-1.5 text-sm text-[var(--lv-text)]"
          onClick={() => router.push(alert.href as string)}
        >
          Abrir
        </button>
      ) : null}
    </div>
  );
}

export function AdminControlPlaneHome(props: AdminControlPlaneHomeProps) {
  const { stats, loading, fetchMessage } = props;
  const router = useRouter();

  const sections = useMemo<DomainSection[]>(() => {
    return [
      {
        title: "Crear y mantener la biblioteca",
        description: "Biblioteca canónica, escena visual, activos reutilizables y capa espacial.",
        cards: [
          {
            title: "Tipos de plan y botánica",
            description: "Fuente de verdad visual de semilla, flor, familia y preview cruzado.",
            source: "garden_plan_types + productDomainContracts + planVisuals",
            owns: "botánica, seed_asset_path, flower_asset_path, categoría y preview multi-superficie",
            href: "/admin/plan-types",
            ctaLabel: "Abrir tipos de plan",
            state: "ready",
            stats: [
              { label: "Tipos activos", value: loading ? "..." : String(stats.planTypesTotal) },
              {
                label: "Canon incompleto",
                value: loading ? "..." : String(stats.planTypesWithoutCanonicalVisuals),
              },
            ],
            note:
              stats.planTypesWithoutCanonicalVisuals > 0
                ? "Hay tipos sin visual canónica explicita. El sistema sigue teniendo fallback, pero la biblioteca todavía no esta cerrada."
                : "La biblioteca ya sirve como primera parada para cualquier cambio visual de flor o semilla.",
          },
          {
            title: "Home, sendero y árbol anual",
            description: "Escena diaria, geometria del sendero, cima y compatibilidad del árbol compartido.",
            source: "homeTrailCatalog + homeSceneDefaults + annualTreeEngine",
            owns: "paisaje, sendero, cima, fondos de evento, assets del árbol y validación de escena",
            href: "/admin/home",
            ctaLabel: "Abrir home y sendero",
            state: "transition",
            note:
              "Ya esta orientado a escena y validación. El siguiente cierre natural es la portada final, no volver a esconder la salud del dominio fuera de `diagnostics`.",
          },
          {
            title: "Canvas y biblioteca creativa",
            description: "Packs, stickers, plantillas y desbloqueos del lienzo.",
            source: "stickers + templates + sticker_unlock_rules",
            owns: "biblioteca creativa reutilizable, no los assets globales de toda la app",
            href: "/admin/canvas",
            ctaLabel: "Abrir canvas",
            state: "transition",
            note:
              "Canvas ya tiene sentido como dominio propio, pero no debe volver a ser el cajon de todos los assets del producto.",
          },
          {
            title: "Mapa, lugares y rutas",
            description: "Semantica visible de pines, popups, guardados, rutas y zonas del mapa.",
            source: "map_places + map_routes + map_zones + mapVisualConfig + homeMapExperience",
            owns: "kinds, states, glifos, labels, lenses, popups y lectura espacial del producto",
            href: "/admin/map",
            ctaLabel: "Abrir mapa y lugares",
            state: "transition",
            stats: [
              { label: "Lugares", value: loading ? "..." : String(stats.mapPlacesTotal) },
              { label: "Rutas", value: loading ? "..." : String(stats.mapRoutesTotal) },
              { label: "Zonas", value: loading ? "..." : String(stats.mapZonesTotal) },
            ],
            note:
              "El dominio ya tiene preview interactivo y edición contextual, pero la semantica visual global completa sigue parcialmente centralizada en config.",
          },
        ],
      },
      {
        title: "Ajustar el circuito vivo",
        description: "Nacimiento de semillas, vida de la flor compartida, actividad y progresion.",
        cards: [
          {
            title: "Semillas y agenda",
            description: "Estados, calendario, transiciones y automatismos del circuito semilla -> flor.",
            source: "seed_defaults + calendar_rules + seed_status_flow",
            owns: "comportamiento del sistema de semillas y su paso a página",
            href: "/admin/seeds",
            ctaLabel: "Abrir semillas",
            state: "transition",
            stats: [
              { label: "Semillas", value: loading ? "..." : String(stats.seedsTotal) },
              { label: "Transiciones", value: loading ? "..." : String(stats.seedFlowRules) },
            ],
            note:
              "La estructura por tareas ya existe, pero todavía falta que el admin completo hable el mismo idioma que `plans` y `activity`.",
          },
          {
            title: "Flores y memorias",
            description: "Sistema visible de `page/[id]`, `Miradas`, bloques, prompts y layouts de la flor compartida.",
            source: "pages + memory_reflections + care catalogs + page detail UI",
            owns: "estructura de flor, sistema de memorias y bloques visibles, no el contenido privado de cada persona",
            href: "/admin/flowers",
            ctaLabel: "Abrir flores y memorias",
            state: "transition",
            stats: [
              { label: "Flores", value: loading ? "..." : String(stats.pagesTotal) },
              { label: "Miradas", value: loading ? "..." : String(stats.reflectionsTotal) },
            ],
            note:
              "El primer bloque operativo ya existe y gobierna `Miradas` y `Contexto`. Quedan hero, bloques editoriales y layout general para el siguiente pase.",
          },
          {
            title: "Actividad",
            description: "Bandeja derivada de pendientes, novedad y avisos puntuales del jardín.",
            source: "activityFeed + seeds + pages + progression unlocks + invitations",
            owns: "presentación, prioridad visual, vacios y tono de una bandeja derivada, no otra fuente de verdad",
            href: null,
            ctaLabel: "Abrir actividad",
            state: "pending",
            stats: [
              { label: "Hitos desbloqueados", value: loading ? "..." : String(stats.achievementsUnlockedTotal) },
            ],
            note:
              "Por ahora no necesita un `/admin/activity` grande. La dirección correcta es mantenerla ligera, derivada y sin competir con `achievements` o `progression`.",
          },
          {
            title: "Progresion e hitos",
            description: "Milestones, logros, rewards y lectura visible del progreso.",
            source: "progression_tree_nodes + progression_tree_unlocks + progression_rewards",
            owns: "hitos narrativos, desbloqueos y assets asociados cuando existan",
            href: "/admin/progression",
            ctaLabel: "Abrir progresion",
            state: "transition",
            stats: [
              { label: "Desbloqueados", value: loading ? "..." : String(stats.achievementsUnlockedTotal) },
            ],
            note:
              "La fusion principal ya existe, pero la gobernanza completa todavía depende del rediseño final del admin.",
          },
        ],
      },
      {
        title: "Preparar la lectura del año",
        description: "Capa agregada y editorial: bosque, capítulo anual y libro exportado.",
        cards: [
          {
            title: "Bosque anual",
            description: "Lenguaje del patrón anual: narrativa, labels y tema del bosque.",
            source: "forest_theme + forest_assets + forest_narrative_templates",
            owns: "tono del bosque, lectura agregada y preview anual",
            href: "/admin/forest",
            ctaLabel: "Abrir bosque anual",
            state: "transition",
            stats: [
              {
                label: "Tema activo",
                value: loading ? "..." : stats.activeForestThemeKey ?? "sin tema",
              },
            ],
            note:
              "Debe seguir afinando la capa anual sin volver a apropiarse de la botánica primaria de las flores.",
          },
          {
            title: "Year, libro y PDF",
            description: "Capítulo anual, memoria, portada, Top 3 editorial, fuentes y export.",
            source: "year_notes + season_notes + pdf_themes + annualBookModel + yearPdfDocumentBuilder",
            owns: "curaduria anual, copy editorial y salida del libro",
            href: "/admin/pdf",
            ctaLabel: "Abrir libro anual",
            state: "transition",
            stats: [
              { label: "Flores del año", value: loading ? "..." : String(stats.currentYearPagesTotal) },
              {
                label: "Top 3 editorial",
                value: loading ? "..." : `${stats.currentYearHighlightCount}/3`,
              },
              { label: "Notas de estación", value: loading ? "..." : String(stats.seasonNotesTotal) },
            ],
            note:
              "La fuente de verdad editorial ya esta unificada para `year` y `pdf`, pero aún falta cerrar toda la capa anual desde un control plane comun.",
          },
        ],
      },
      {
        title: "Sistema y salud",
        description: "Lo avanzado, lo global y la validación cruzada del sistema.",
        cards: [
          {
            title: "Cierre de despliegue",
            description: "Ultimo gesto compartido para marcar que Libro Vivo ya esta fuera y dejar constancia del cierre.",
            source: "ritual local del admin",
            owns: "cierre humano del despliegue, no la configuracion tecnica",
            href: "/admin/release",
            ctaLabel: "Abrir cierre final",
            state: "ready",
            note:
              "Pensado para que el lanzamiento termine con un gesto vuestro y no solo con una checklist tecnica.",
          },
          {
            title: "Roles y acceso",
            description: "Permisos y perfiles del sistema.",
            source: "profiles + roles",
            owns: "acceso y capacidades, no narrativa ni visuales del producto",
            href: "/admin/roles",
            ctaLabel: "Abrir roles",
            state: "ready",
          },
          {
            title: "Sistema base y apariencia",
            description: "Piezas globales del shell como `welcome_text` y tokens visuales base.",
            source: "settings + ui_theme_tokens",
            owns: "capas globales puntuales, no el trabajo diario de producto",
            href: "/admin/system",
            ctaLabel: "Abrir sistema base",
            state: "ready",
            note:
              "Esta capa ya vive como dominio propio. No entra en `diagnostics` por defecto: solo gobierna shell y apariencia global.",
          },
          {
            title: "Catalogos avanzados",
            description: "Inspector raw de compatibilidad, rescate y configuración técnica.",
            source: "catalogs + catalog_items",
            owns: "casos raros, migraciones manuales y piezas legacy",
            href: "/admin/catalogs",
            ctaLabel: "Abrir catálogos",
            state: "advanced",
            note:
              "No debe volver a ser la puerta diaria para tocar visuales o copy del producto.",
          },
          {
            title: "Diagnostico y validación",
            description: "Gobierno central de las reglas de validación que consumen los dominios admin.",
            source: "reglas configurables por dominio + paneles locales de validación",
            owns: "severidad, copy, activación y plantillas de validación; no la lectura de errores de cada página",
            href: "/admin/diagnostics",
            ctaLabel: "Abrir diagnostico",
            state: "ready",
            note:
              "Ya no es un dashboard de incidencias. Esta capa gobierna las reglas que luego leen `flowers`, `map` y `trail-editor`.",
          },
        ],
      },
    ];
  }, [loading, stats]);

  const alerts = useMemo<AlertItem[]>(() => {
    const next: AlertItem[] = [];

    if (stats.planTypesWithoutCanonicalVisuals > 0) {
      next.push({
        title: "Biblioteca visual incompleta",
        detail: `${stats.planTypesWithoutCanonicalVisuals} tipos de plan siguen sin visual canónica explicita.`,
        href: "/admin/plan-types",
        tone: "warning",
      });
    }

    if (!stats.activeForestThemeKey || !stats.activePdfThemeKey) {
      next.push({
        title: "Falta cerrar capa anual/editorial",
        detail: "Bosque o PDF no tienen tema activo claro. Conviene revisar la capa anual antes de seguir bajando configuración.",
        href: "/admin/pdf",
        tone: "warning",
      });
    }

    if (!stats.currentYearHasNote || !stats.currentYearHasCover || stats.currentYearHighlightCount < 3) {
      next.push({
        title: `Capítulo ${stats.currentYear} todavía no esta curado`,
        detail: `Nota: ${stats.currentYearHasNote ? "si" : "no"} · portada: ${
          stats.currentYearHasCover ? "si" : "no"
        } · destacados: ${stats.currentYearHighlightCount}/3.`,
        href: "/admin/pdf",
        tone: "info",
      });
    }

    next.push(
      {
        title: "Mapa aún en transicion",
        detail: "El dominio ya vive en admin y ya conversa con `diagnostics`, pero aún queda cerrar del todo la semantica visual global.",
        href: "/admin/map",
        tone: "info",
      },
      {
        title: "Flores y memorias aún no estan cerradas",
        detail: "El dominio ya tiene su primera pieza operativa, pero todavía faltan hero, bloques editoriales y layout general para cerrarlo.",
        href: "/admin/flowers",
        tone: "info",
      },
      {
        title: "Actividad sigue sin capa de gobernanza",
        detail: "La bandeja ya existe como derivada real, pero falta su página propia para gobernar presentación, tono y vacios.",
        href: null,
        tone: "info",
      },
      {
        title: "Diagnostico central activo",
        detail: "La capa central ya existe como gobierno de reglas. El siguiente paso es sumar mas dominios y plantillas de validación.",
        href: "/admin/diagnostics",
        tone: "info",
      },
      {
        title: "Sistema base ya tiene dominio propio",
        detail: "Welcome global y tokens base deben tocarse desde `/admin/system`, no desde portada ni desde catálogos.",
        href: "/admin/system",
        tone: "info",
      },
    );

    return next;
  }, [stats]);

  return (
    <div className="min-h-screen bg-[var(--lv-bg)] p-6 text-[var(--lv-text)]">
      <div className="mx-auto max-w-7xl space-y-4">
        <section className="rounded-[30px] border border-[var(--lv-border)] bg-[linear-gradient(180deg,var(--lv-surface)_0%,var(--lv-surface-soft)_100%)] p-6 shadow-[var(--lv-shadow-sm)]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-4xl space-y-3">
              <div className="inline-flex items-center rounded-full border border-[var(--lv-border)] bg-[color-mix(in_srgb,var(--lv-surface)_88%,transparent)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--lv-text-muted)]">
                Control plane del producto
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight">
                  Admin operativo del producto completo
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-[var(--lv-text-muted)]">
                  Esta portada ya no deberia competir con los dominios. Solo te orienta hacia la
                  pagina canonica correcta y deja la edicion real dentro de cada superficie.
                </p>
              </div>
            </div>
          </div>

          {fetchMessage ? <StatusNotice className="mt-4" tone="warning" message={fetchMessage} /> : null}
        </section>

        <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
          <SummaryCard
            eyebrow="Biblioteca canónica"
            value={loading ? "..." : String(stats.planTypesTotal)}
            detail={
              loading
                ? "Cargando tipos de plan..."
                : `${stats.planTypesWithoutCanonicalVisuals} tipos siguen sin visual canónica explicita.`
            }
          />
          <SummaryCard
            eyebrow="Flores y memorias"
            value={loading ? "..." : String(stats.pagesTotal)}
            detail={
              loading
                ? "Cargando flores..."
                : `${stats.reflectionsTotal} miradas guardadas en el jardín activo.`
            }
          />
          <SummaryCard
            eyebrow="Mapa vivo"
            value={loading ? "..." : String(stats.mapPlacesTotal)}
            detail={
              loading
                ? "Cargando capa espacial..."
                : `${stats.mapRoutesTotal} rutas y ${stats.mapZonesTotal} zonas ya existen dentro del dominio admin en transicion.`
            }
          />
          <SummaryCard
            eyebrow={`Capítulo ${stats.currentYear}`}
            value={loading ? "..." : String(stats.currentYearPagesTotal)}
            detail={
              loading
                ? "Cargando capa anual..."
                : `${stats.currentYearHighlightCount}/3 destacados - ${
                    stats.currentYearHasNote ? "memoria guardada" : "sin memoria"
                  } - ${stats.currentYearHasCover ? "portada curada" : "sin portada curada"}.`
            }
          />
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            {sections.map((section) => (
              <section
                key={section.title}
                className="rounded-[28px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-5 shadow-[var(--lv-shadow-sm)]"
              >
                <div className="mb-4 space-y-1">
                  <h2 className="text-xl font-semibold text-[var(--lv-text)]">{section.title}</h2>
                  <p className="text-sm leading-6 text-[var(--lv-text-muted)]">{section.description}</p>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  {section.cards.map((card) => (
                    <DomainCardPanel key={card.title} card={card} />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <aside className="space-y-4">
            <section className="rounded-[28px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-5 shadow-[var(--lv-shadow-sm)]">
              <div className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                Pendiente real
              </div>
              <div className="mt-2 text-lg font-semibold text-[var(--lv-text)]">
                Lo proximo que todavia merece trabajo
              </div>
              <div className="mt-4 space-y-3">
                {alerts.map((alert) => (
                  <AlertRow key={`${alert.title}-${alert.detail}`} alert={alert} />
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-5 shadow-[var(--lv-shadow-sm)]">
              <div className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                Siguiente pasada
              </div>
              <div className="mt-2 text-lg font-semibold text-[var(--lv-text)]">
                Orden corto para seguir
              </div>
              <ol className="mt-3 space-y-2 text-sm leading-6 text-[var(--lv-text-muted)]">
                <li>1. Entrar por la página canónica del dominio, no por tablas.</li>
                <li>2. Llevar shell compartido a `system` cuando sea reutilizable.</li>
                <li>3. Llevar reglas de integridad a `diagnostics`, no a esta portada.</li>
                <li>4. Dejar fuera de `system` solo escena, arte o preview editorial.</li>
                <li>5. Cerrar el lanzamiento desde `/admin/release`.</li>
              </ol>
            </section>

            <div className="grid gap-3">
              <button
                type="button"
                className="w-full rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-3 text-left shadow-[var(--lv-shadow-sm)]"
                onClick={() => router.push("/admin/release")}
              >
                Abrir cierre final
              </button>
              <button
                type="button"
                className="w-full rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-3 text-left shadow-[var(--lv-shadow-sm)]"
                onClick={() => router.push("/admin/system")}
              >
                Abrir system
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
