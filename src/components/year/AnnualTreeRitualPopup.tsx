"use client";

import { useEffect, useMemo, useState } from "react";
import type { FutureMomentsTreeConfig } from "@/lib/futureMomentsConfig";
import {
  isRitualEligible,
  ritualActivityMessage,
  ritualStatusLabel,
  type AnnualTreeRitualRow,
} from "@/lib/annualTreeRitual";

type RitualDraft = {
  locationLabel: string;
  locationLat: number | null;
  locationLng: number | null;
  notes: string;
};

type Props = {
  year: number;
  treeStage: number;
  ritual: AnnualTreeRitualRow | null;
  initialLocationLabel?: string;
  initialLocationLat?: number | null;
  initialLocationLng?: number | null;
  initialNotes?: string;
  onPlant: (data: RitualDraft) => Promise<void>;
  onDismiss: () => void;
  onOpenMapPicker?: (draft: RitualDraft) => void;
  config?: FutureMomentsTreeConfig;
};

function toCoordinateInput(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

function parseCoordinate(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function AnnualTreeRitualPopup({
  year,
  treeStage,
  ritual,
  initialLocationLabel,
  initialLocationLat,
  initialLocationLng,
  initialNotes,
  onPlant,
  onDismiss,
  onOpenMapPicker,
  config,
}: Props) {
  const [locationLabel, setLocationLabel] = useState("");
  const [locationLatInput, setLocationLatInput] = useState("");
  const [locationLngInput, setLocationLngInput] = useState("");
  const [notes, setNotes] = useState("");
  const [planting, setPlanting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocationLabel(initialLocationLabel ?? ritual?.location_label ?? "");
  }, [initialLocationLabel, ritual?.id, ritual?.location_label]);

  useEffect(() => {
    setLocationLatInput(toCoordinateInput(initialLocationLat ?? ritual?.location_lat));
  }, [initialLocationLat, ritual?.id, ritual?.location_lat]);

  useEffect(() => {
    setLocationLngInput(toCoordinateInput(initialLocationLng ?? ritual?.location_lng));
  }, [initialLocationLng, ritual?.id, ritual?.location_lng]);

  useEffect(() => {
    setNotes(initialNotes ?? ritual?.notes ?? "");
  }, [initialNotes, ritual?.id, ritual?.notes]);

  const eligible = isRitualEligible(year, treeStage);
  const alreadyPlanted = Boolean(
    ritual && (ritual.status === "planted" || ritual.status === "confirmed"),
  );
  const parsedLat = useMemo(() => parseCoordinate(locationLatInput), [locationLatInput]);
  const parsedLng = useMemo(() => parseCoordinate(locationLngInput), [locationLngInput]);
  const hasManualCoordinates = parsedLat != null && parsedLng != null;
  const canSubmit = Boolean(locationLabel.trim() || hasManualCoordinates);

  async function handlePlant() {
    setPlanting(true);
    setError(null);
    try {
      await onPlant({
        locationLabel: locationLabel.trim(),
        locationLat: parsedLat,
        locationLng: parsedLng,
        notes: notes.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el ritual.");
    } finally {
      setPlanting(false);
    }
  }

  const headline = alreadyPlanted
    ? `Arbol de ${year} registrado`
    : eligible
      ? `Arbol del año ${year}`
      : `Arbol del año ${year} aun en crecimiento`;

  const plantingEyebrow = config?.plantingEyebrow ?? "Ritual anual desbloqueado";
  const bodyText = alreadyPlanted
    ? ritualActivityMessage(year, ritual!.status)
    : eligible
      ? (config?.plantingIntro ??
        "El año ya se ha cerrado. Ahora podeis llevar ese arbol al mundo real y dejar constancia del lugar.")
      : "Todavia no esta desbloqueado. Seguid cuidandolo hasta llegar al hito necesario.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[32px] border border-[var(--lv-border)] bg-[linear-gradient(180deg,#fffdf8_0%,#f7fbf4_100%)] p-6 shadow-[0_26px_70px_rgba(22,34,24,0.28)]">
        <div className="text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--lv-text-muted)]">
            {plantingEyebrow}
          </div>
          <div className="mx-auto mt-4 flex h-20 w-20 items-center justify-center rounded-full border border-[#d8e6cf] bg-[radial-gradient(circle_at_50%_35%,#f3f9ec_0%,#e4efdb_62%,#d7e7cb_100%)] text-3xl font-semibold text-[#355c3d] shadow-[0_12px_30px_rgba(66,102,72,0.18)]">
            A
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-[var(--lv-text)]">{headline}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--lv-text-muted)]">{bodyText}</p>
          <div className="mt-4 inline-flex rounded-full border border-[#d9e8cf] bg-white/90 px-3 py-1 text-xs font-medium text-[#355c3d]">
            Estado del arbol: {Math.max(treeStage, 0)}/100
          </div>
        </div>

        {eligible ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              {
                title: "Capitulo cerrado",
                detail: "Ya no entra nada mas en ese año. Por eso el ritual aparece ahora y no antes.",
              },
              {
                title: "Gesto real",
                detail: "La accion importante ya no es digital: es plantarlo, elegir lugar y contarlo bien.",
              },
              {
                title: "Huella futura",
                detail: "Este registro alimenta los recordatorios de 1, 3, 5, 7 y 10 años.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[22px] border border-[#dbe7d5] bg-white/92 p-4"
              >
                <div className="text-sm font-semibold text-[var(--lv-text)]">{item.title}</div>
                <div className="mt-2 text-xs leading-5 text-[var(--lv-text-muted)]">
                  {item.detail}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {alreadyPlanted ? (
          <div className="mt-5 rounded-[24px] border border-[#b7ccac] bg-[#eef6e7] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[#2f5637]">
                  {ritualStatusLabel(ritual!.status)}
                </div>
                <div className="mt-1 text-xs text-[#4b6e4c]">
                  Podeis seguir afinando la ubicacion y las notas para dejarlo mejor contado.
                </div>
              </div>
              {ritual?.planted_at ? (
                <div className="rounded-full border border-[#cfe0c8] bg-white px-3 py-1 text-xs text-[#365a3a]">
                  Registrado el {new Date(ritual.planted_at).toLocaleDateString("es-ES")}
                </div>
              ) : null}
            </div>
            {ritual?.location_label ? (
              <div className="mt-3 text-sm text-[#365a3a]">Lugar: {ritual.location_label}</div>
            ) : null}
            {ritual?.notes ? (
              <div className="mt-2 text-sm text-[#4a6d44]">{ritual.notes}</div>
            ) : null}
          </div>
        ) : null}

        {eligible ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-[24px] border border-[var(--lv-border)] bg-white/90 p-4">
              <div className="text-sm font-semibold text-[var(--lv-text)]">
                Donde lo habeis plantado
              </div>
              <div className="mt-1 text-xs leading-5 text-[var(--lv-text-muted)]">
                {config?.plantingLocationHint ??
                  "Podeis describir el sitio, meter coordenadas manuales o abrir el mapa para buscarlo."}
              </div>

              <div className="mt-3 space-y-3">
                <input
                  className="lv-input"
                  placeholder="Ej. Parque del Retiro, jardin de casa, junto al rio..."
                  value={locationLabel}
                  onChange={(event) => setLocationLabel(event.target.value)}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    className="lv-input"
                    inputMode="decimal"
                    placeholder="Latitud"
                    value={locationLatInput}
                    onChange={(event) => setLocationLatInput(event.target.value)}
                  />
                  <input
                    className="lv-input"
                    inputMode="decimal"
                    placeholder="Longitud"
                    value={locationLngInput}
                    onChange={(event) => setLocationLngInput(event.target.value)}
                  />
                </div>

                {onOpenMapPicker ? (
                  <button
                    type="button"
                    className="lv-btn lv-btn-secondary"
                    onClick={() =>
                      onOpenMapPicker({
                        locationLabel: locationLabel.trim(),
                        locationLat: parsedLat,
                        locationLng: parsedLng,
                        notes: notes.trim(),
                      })
                    }
                  >
                    Abrir mapa y buscar ubicacion
                  </button>
                ) : null}
              </div>
            </div>

            <div className="rounded-[24px] border border-[var(--lv-border)] bg-white/90 p-4">
              <div className="text-sm font-semibold text-[var(--lv-text)]">
                Como quereis recordarlo
              </div>
              <div className="mt-1 text-xs leading-5 text-[var(--lv-text-muted)]">
                {config?.plantingNotesHint ??
                  "Que sentisteis, que arbol era y por que elegisteis ese sitio."}
              </div>
              <textarea
                className="lv-textarea mt-3 min-h-[120px]"
                rows={4}
                placeholder="Que sentisteis, que arbol era, por que elegisteis ese sitio..."
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>

            {error ? <div className="lv-state-panel lv-tone-error text-sm">{error}</div> : null}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className="lv-btn lv-btn-secondary" onClick={onDismiss}>
            {alreadyPlanted ? "Cerrar" : "Ahora no"}
          </button>
          {eligible ? (
            <button
              type="button"
              className="lv-btn lv-btn-primary disabled:opacity-50"
              onClick={() => void handlePlant()}
              disabled={planting || !canSubmit}
            >
              {planting ? "Guardando..." : alreadyPlanted ? "Guardar cambios" : "Registrar arbol"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
