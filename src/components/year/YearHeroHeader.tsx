import YearSelector from "@/components/shared/YearSelector";
import ActiveGardenSwitcher from "@/components/shared/ActiveGardenSwitcher";
import { AnnualTreeVisual } from "@/components/shared/AnnualTreeVisual";
import { ChatShareButton } from "@/components/chat/ChatShareButton";
import type { AnnualTreePhase } from "@/lib/annualTreeEngine";
import type { ResolvedAnnualTreeNarrative } from "@/lib/annualTreeNarrative";
import AnnualTreeNarrativeCard from "@/components/year/AnnualTreeNarrativeCard";
import { getProductSurface } from "@/lib/productSurfaces";

const YEAR_BOOK_SURFACE = getProductSurface("year_book");

type YearHeroStats = {
  total: number;
  avgStars: number;
  favoriteCount: number;
  activeMonths: number;
};

type YearHeroHeaderProps = {
  year: number;
  currentYear: number;
  loading: boolean;
  stats: YearHeroStats;
  yearMilestones: number;
  yearEditorialUnlocks: number;
  availableYearsForSelector: number[];
  olderYear: number | null;
  newerYear: number | null;
  onGoYear: (year: number) => void;
  onOpenHome: () => void;
  sharingToChat?: boolean;
  onShareToChat?: () => void;
  shareRecipientLabel?: string | null;
  exportingPdf: boolean;
  onDownloadPdf: () => void;
  shownCover: string | null;
  growthStage: number;
  growthPhaseLabel: string;
  growthPhaseTone: { backgroundColor: string; borderColor: string; color: string };
  annualTreeAssets: Record<AnnualTreePhase, string | null>;
  topFlowerFamilyLabel: string;
  treeNarrative: ResolvedAnnualTreeNarrative;
  onOpenTreeRitual?: () => void;
  note: string;
  onGardenChanged: (gardenId: string | null) => void;
};

export default function YearHeroHeader({
  year,
  currentYear,
  loading,
  stats,
  yearMilestones,
  yearEditorialUnlocks,
  availableYearsForSelector,
  olderYear,
  newerYear,
  onGoYear,
  onOpenHome,
  sharingToChat = false,
  onShareToChat,
  shareRecipientLabel = null,
  exportingPdf,
  onDownloadPdf,
  shownCover,
  growthStage,
  growthPhaseLabel,
  growthPhaseTone,
  annualTreeAssets,
  topFlowerFamilyLabel,
  treeNarrative,
  onOpenTreeRitual,
  note,
  onGardenChanged,
}: YearHeroHeaderProps) {
  return (
    <section
      className="lv-card p-5"
      style={{
        background:
          "linear-gradient(180deg, var(--lv-surface) 0%, var(--lv-bg-soft) 100%)",
      }}
    >
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="lv-card p-5 bg-white/90">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button className="lv-btn lv-btn-secondary text-sm" onClick={onOpenHome}>
              Volver a home
            </button>
            <div className="flex flex-wrap justify-end gap-2">
              {onShareToChat ? (
                <ChatShareButton
                  onClick={onShareToChat}
                  busy={sharingToChat}
                  recipientLabel={shareRecipientLabel}
                  label="Compartir"
                  busyLabel="Compartiendo..."
                  className="w-full sm:w-auto"
                />
              ) : null}
              <button
                className="lv-btn lv-btn-primary w-full disabled:opacity-50 sm:w-auto"
                onClick={onDownloadPdf}
                disabled={exportingPdf}
              >
                {exportingPdf ? "Generando PDF..." : "Descargar PDF"}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="lv-badge px-3 py-1 text-[11px] uppercase tracking-[0.16em]">
                {YEAR_BOOK_SURFACE.label}
              </div>
              <h1 className="mt-3 text-3xl font-semibold">{year}</h1>
              <p className="mt-2 text-sm text-[var(--lv-text-muted)]">
                El capítulo editorial del año. Aquí el recorrido compartido se ordena como
                memoria, estaciones y árbol.
              </p>
            </div>
            <div className="min-w-[220px] space-y-2">
              <div className="lv-badge bg-white px-3 py-1.5 text-xs">
                {loading ? "Cargando año..." : `${stats.total} páginas`}
              </div>
              <ActiveGardenSwitcher compact onChanged={onGardenChanged} />
              <div className="text-[11px] text-[var(--lv-text-muted)]">
                El libro anual se adapta al jardín activo.
              </div>
            </div>
          </div>

          <div className="lv-card-soft mt-4 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium">Navegación entre años</div>
              <div className="text-xs text-[var(--lv-text-muted)]">
                {availableYearsForSelector[availableYearsForSelector.length - 1]} -{" "}
                {availableYearsForSelector[0]}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <YearSelector
                compact
                value={String(year)}
                years={availableYearsForSelector.map(String)}
                onChange={(next) => onGoYear(Number(next))}
                onPrev={() => olderYear != null && onGoYear(olderYear)}
                onNext={() => newerYear != null && onGoYear(newerYear)}
                prevDisabled={olderYear == null}
                nextDisabled={newerYear == null}
              />
              <button
                className="lv-btn lv-btn-secondary text-sm"
                onClick={() => onGoYear(currentYear)}
              >
                Ir a {currentYear}
              </button>
            </div>
          </div>

          {exportingPdf ? (
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#d7dfd0] bg-[#f8faf5] px-4 py-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#2f5637] border-t-transparent" />
              <div className="text-sm text-[#2f5637]">
                Construyendo el libro anual con portada, capítulos, mapa y detalles editoriales.
              </div>
            </div>
          ) : (
            <div className="mt-4 text-xs text-[var(--lv-text-muted)]">
              El PDF se genera con el año visible y el jardín activo actual.
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            <div className="lv-card-soft p-3">
              <div className="text-xs text-[var(--lv-text-muted)]">Páginas</div>
              <div className="mt-1 text-2xl font-semibold">{stats.total}</div>
            </div>
            <div className="lv-card-soft p-3">
              <div className="text-xs text-[var(--lv-text-muted)]">Media de estrellas</div>
              <div className="mt-1 text-2xl font-semibold">{stats.avgStars.toFixed(1)}</div>
            </div>
            <div className="lv-card-soft p-3">
              <div className="text-xs text-[var(--lv-text-muted)]">Favoritas</div>
              <div className="mt-1 text-2xl font-semibold">{stats.favoriteCount}</div>
            </div>
            <div className="lv-card-soft p-3">
              <div className="text-xs text-[var(--lv-text-muted)]">Hitos del año</div>
              <div className="mt-1 text-2xl font-semibold">{yearMilestones}</div>
            </div>
            <div className="lv-card-soft p-3">
              <div className="text-xs text-[var(--lv-text-muted)]">Capas editoriales</div>
              <div className="mt-1 text-2xl font-semibold">{yearEditorialUnlocks}</div>
            </div>
          </div>
        </div>

        <div
          className="relative overflow-hidden rounded-[var(--lv-radius-lg)] border p-5"
          style={{
            borderColor: "var(--lv-border)",
            background:
              "linear-gradient(180deg, var(--lv-primary-soft) 0%, var(--lv-bg-soft) 100%)",
            boxShadow: "var(--lv-shadow-sm)",
          }}
        >
          {shownCover ? (
            <img
              src={shownCover}
              alt="Portada anual"
              className="absolute inset-0 h-full w-full object-cover opacity-[0.16]"
            />
          ) : null}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.5),transparent_44%),linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.02))]" />
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--lv-primary-strong)]">
                Estado del árbol del año
              </div>
              <div className="lv-badge bg-white/70 px-3 py-1 text-xs text-[var(--lv-primary-strong)]">
                Crecimiento {growthStage}/100
              </div>
            </div>
            <div
              className="mt-2 inline-flex rounded-full border px-3 py-1 text-sm font-medium"
              style={growthPhaseTone}
            >
              {growthPhaseLabel}
            </div>
            <div className="relative mx-auto mt-4 flex h-[260px] w-full max-w-[320px] items-center justify-center overflow-hidden rounded-[30px] border border-white/55 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.42),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.2),rgba(255,255,255,0.05)),linear-gradient(180deg,#dfead4_0%,#d6e5c7_42%,#bad59c_74%,#88ac65_100%)]">
              <div
                className="pointer-events-none absolute inset-0 opacity-20 mix-blend-soft-light"
                style={{
                  backgroundImage:
                    "radial-gradient(circle, rgba(255,255,255,0.22) 1px, transparent 1px)",
                  backgroundSize: "18px 18px",
                }}
              />
              <div
                className="pointer-events-none absolute left-1/2 top-[68%] h-[18%] w-[34%] -translate-x-1/2 rounded-[999px]"
                style={{ background: "rgba(122, 145, 77, 0.34)", filter: "blur(12px)" }}
              />
              <div
                className="pointer-events-none absolute left-1/2 top-[72%] h-[12%] w-[28%] -translate-x-1/2 rounded-[999px]"
                style={{
                  backgroundColor: "rgba(126, 118, 72, 0.28)",
                  boxShadow:
                    "0 0 0 1px rgba(86, 78, 48, 0.12), 0 6px 14px rgba(48,70,38,0.1)",
                }}
              />
              <AnnualTreeVisual
                stage={growthStage}
                seed={year * 29 + growthStage}
                size={230}
                assetsByPhase={annualTreeAssets}
              />
            </div>
            <AnnualTreeNarrativeCard
              stage={growthStage}
              activeMonths={stats.activeMonths}
              topFlowerFamilyLabel={topFlowerFamilyLabel}
              narrative={treeNarrative}
              onOpenRitual={onOpenTreeRitual}
            />
            <div className="lv-card-soft mt-3 bg-white/75 p-3 text-sm text-[var(--lv-text)]">
              <p className="lv-text-safe whitespace-pre-wrap">
                {note
                  ? note
                  : "Todavía no hay memoria escrita para este año. Puedes dejar una frase y una portada cuando quieras."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
