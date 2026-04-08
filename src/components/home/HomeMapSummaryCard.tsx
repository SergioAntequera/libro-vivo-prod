import type { MapPlaceRecord, MapRouteRecord } from "@/lib/mapDomainTypes";
import type { MapPointItem } from "@/lib/homeMapTypes";

const ONBOARDING_STEPS = [
  "Anade ubicacion a vuestras paginas al crearlas o editarlas.",
  "Guarda lugares favoritos desde el mapa para volver a ellos.",
  "Crea rutas para conectar recuerdos y sembrar nuevos planes.",
] as const;

function MapOnboardingCard({ onOpenMap }: { onOpenMap: () => void }) {
  return (
    <section data-home-tour="map-summary" className="lv-card p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Mapa vivo</h2>
          <p className="text-sm text-[var(--lv-text-muted)]">
            Vuestro mapa esta esperando sus primeros recuerdos.
          </p>
        </div>
        <button
          className="lv-btn lv-btn-secondary w-full justify-center sm:w-auto"
          onClick={onOpenMap}
        >
          Explorar mapa
        </button>
      </div>

      <div
        className="mt-3 border px-4 py-4"
        style={{
          borderRadius: "var(--lv-radius-md)",
          borderColor: "var(--lv-border)",
          background: "var(--lv-bg-soft)",
        }}
      >
        <div className="text-xs uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
          Como empezar
        </div>
        <ol className="mt-2 flex flex-col gap-2 text-sm text-[var(--lv-text-muted)]">
          {ONBOARDING_STEPS.map((step, index) => (
            <li key={index} className="flex items-start gap-2">
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                style={{
                  background: "var(--lv-accent-soft, #e8f5e9)",
                  color: "var(--lv-accent, #2e7d32)",
                }}
              >
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default function HomeMapSummaryCard({
  memories,
  places,
  routes,
  selectedYearValue,
  onOpenMap,
}: {
  memories: MapPointItem[];
  places: MapPlaceRecord[];
  routes: MapRouteRecord[];
  selectedYearValue: string;
  onOpenMap: () => void;
}) {
  const savedPlacesCount = places.filter((place) => place.state !== "archived").length;
  const activeRoutesCount = routes.filter((route) => route.archivedAt == null).length;
  const isEmpty = memories.length === 0 && savedPlacesCount === 0 && activeRoutesCount === 0;

  if (isEmpty) {
    return <MapOnboardingCard onOpenMap={onOpenMap} />;
  }

  const topLocations = Array.from(
    new Set(
      memories
        .map((memory) => memory.locationLabel?.trim() || memory.title)
        .filter(Boolean),
    ),
  ).slice(0, 3);
  const favoritePlacesCount = places.filter((place) => place.state === "favorite").length;
  const summaryLine = `Ya habeis conectado ${memories.length} recuerdo(s), ${savedPlacesCount} lugar(es) y ${activeRoutesCount} ruta(s) al mapa del año ${selectedYearValue}.`;

  return (
    <section data-home-tour="map-summary" className="lv-card p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Mapa vivo</h2>
          <p className="text-sm text-[var(--lv-text-muted)]">
            Lugares, guardados y rutas del año {selectedYearValue} para volver, recordar y sembrar
            mejor.
          </p>
        </div>
        <button
          className="lv-btn lv-btn-secondary w-full justify-center sm:w-auto"
          onClick={onOpenMap}
        >
          Abrir mapa
        </button>
      </div>

      <div
        className="mt-3 border px-4 py-3 text-sm text-[var(--lv-text-muted)]"
        style={{
          borderRadius: "var(--lv-radius-md)",
          borderColor: "var(--lv-border)",
          background: "var(--lv-bg-soft)",
        }}
      >
        {summaryLine}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
        <div
          className="border px-4 py-4"
          style={{
            borderRadius: "var(--lv-radius-md)",
            borderColor: "var(--lv-border)",
            background: "var(--lv-bg-soft)",
          }}
        >
          <div className="text-xs uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
            Lo que ya vive en el mapa
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-sm text-[var(--lv-text-muted)]">
            <span className="lv-badge">{memories.length} recuerdo(s)</span>
            <span className="lv-badge">{savedPlacesCount} lugar(es)</span>
            <span className="lv-badge">{favoritePlacesCount} favorito(s)</span>
            <span className="lv-badge">{activeRoutesCount} ruta(s)</span>
          </div>
        </div>

        <div
          className="border px-4 py-4"
          style={{
            borderRadius: "var(--lv-radius-md)",
            borderColor: "var(--lv-border)",
            background: "var(--lv-bg-soft)",
          }}
        >
          <div className="text-xs uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
            Lugares a mano
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {topLocations.length ? (
              topLocations.map((location) => (
                <span key={location} className="lv-badge">
                  {location}
                </span>
              ))
            ) : (
              <span className="text-sm text-[var(--lv-text-muted)]">
                Todavia no hay recuerdos con ubicacion para este año.
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
