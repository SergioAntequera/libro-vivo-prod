"use client";

import { useEffect, useMemo, useState } from "react";
import type { FutureMomentsTreeConfig } from "@/lib/futureMomentsConfig";
import {
  annualTreeCheckInStatusLabel,
  type AnnualTreeCheckInRow,
  type AnnualTreeCheckInStatus,
  type AnnualTreeRitualRow,
} from "@/lib/annualTreeRitual";

type AnniversaryDraft = {
  status: AnnualTreeCheckInStatus;
  locationLabel: string;
  locationLat: number | null;
  locationLng: number | null;
  notes: string;
  photoUrl: string;
};

type Props = {
  ritual: AnnualTreeRitualRow;
  milestoneYear: number;
  existingCheckIn: AnnualTreeCheckInRow | null;
  initialStatus?: AnnualTreeCheckInStatus;
  initialLocationLabel?: string;
  initialLocationLat?: number | null;
  initialLocationLng?: number | null;
  initialNotes?: string;
  initialPhotoUrl?: string;
  onSave: (draft: AnniversaryDraft) => Promise<void>;
  onDismiss: () => void;
  onOpenMapPicker?: (draft: AnniversaryDraft) => void;
  config?: FutureMomentsTreeConfig;
};

const STATUS_OPTIONS: AnnualTreeCheckInStatus[] = [
  "growing",
  "stable",
  "delicate",
  "lost",
  "dead",
  "replanted",
];

function toCoordinateInput(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

function parseCoordinate(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function AnnualTreeAnniversaryPopup({
  ritual,
  milestoneYear,
  existingCheckIn,
  initialStatus,
  initialLocationLabel,
  initialLocationLat,
  initialLocationLng,
  initialNotes,
  initialPhotoUrl,
  onSave,
  onDismiss,
  onOpenMapPicker,
  config,
}: Props) {
  const [status, setStatus] = useState<AnnualTreeCheckInStatus>("growing");
  const [locationLabel, setLocationLabel] = useState("");
  const [locationLatInput, setLocationLatInput] = useState("");
  const [locationLngInput, setLocationLngInput] = useState("");
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStatus(initialStatus ?? existingCheckIn?.status ?? "growing");
    setLocationLabel(initialLocationLabel ?? existingCheckIn?.location_label ?? ritual.location_label ?? "");
    setLocationLatInput(
      toCoordinateInput(
        initialLocationLat ?? existingCheckIn?.location_lat ?? ritual.location_lat ?? null,
      ),
    );
    setLocationLngInput(
      toCoordinateInput(
        initialLocationLng ?? existingCheckIn?.location_lng ?? ritual.location_lng ?? null,
      ),
    );
    setNotes(initialNotes ?? existingCheckIn?.notes ?? "");
    setPhotoUrl(initialPhotoUrl ?? existingCheckIn?.photo_url ?? "");
  }, [
    existingCheckIn,
    initialLocationLabel,
    initialLocationLat,
    initialLocationLng,
    initialNotes,
    initialPhotoUrl,
    initialStatus,
    ritual.id,
    ritual.location_label,
    ritual.location_lat,
    ritual.location_lng,
  ]);

  const parsedLat = useMemo(() => parseCoordinate(locationLatInput), [locationLatInput]);
  const parsedLng = useMemo(() => parseCoordinate(locationLngInput), [locationLngInput]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave({
        status,
        locationLabel: locationLabel.trim(),
        locationLat: parsedLat,
        locationLng: parsedLng,
        notes: notes.trim(),
        photoUrl: photoUrl.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el recordatorio del arbol.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[32px] border border-[var(--lv-border)] bg-[linear-gradient(180deg,#fffef7_0%,#f6fbf3_100%)] p-6 shadow-[0_26px_70px_rgba(22,34,24,0.28)]">
        <div className="text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--lv-text-muted)]">
            {config?.anniversaryEyebrow ?? "Recordatorio del arbol real"}
          </div>
          <div className="mx-auto mt-4 flex h-20 w-20 items-center justify-center rounded-full border border-[#d8e6cf] bg-[radial-gradient(circle_at_50%_35%,#f3f9ec_0%,#e4efdb_62%,#d7e7cb_100%)] text-3xl font-semibold text-[#355c3d] shadow-[0_12px_30px_rgba(66,102,72,0.18)]">
            {milestoneYear}
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-[var(--lv-text)]">
            Han pasado {milestoneYear} años desde vuestro arbol
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--lv-text-muted)]">
            {config?.anniversaryIntro ??
              "Este es uno de esos momentos que conviene mirar de frente. Contad como esta, si sigue en el mismo sitio y dejad una nueva huella para la historia."}
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-5">
          {[1, 3, 5, 7, 10].map((year) => {
            const active = year === milestoneYear;
            return (
              <div
                key={year}
                className={`rounded-[18px] border px-3 py-3 text-center text-xs ${
                  active
                    ? "border-[#b7ccac] bg-[#eef6e7] text-[#2f5637]"
                    : "border-[var(--lv-border)] bg-white/90 text-[var(--lv-text-muted)]"
                }`}
              >
                <div className="font-semibold">{year}</div>
                <div className="mt-1 uppercase tracking-[0.16em]">años</div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 space-y-4">
          <div className="rounded-[24px] border border-[var(--lv-border)] bg-white/90 p-4">
            <div className="text-sm font-semibold text-[var(--lv-text)]">Estado del arbol</div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {STATUS_OPTIONS.map((option) => {
                const active = status === option;
                return (
                  <button
                    key={option}
                    type="button"
                    className={`rounded-2xl border px-3 py-3 text-left text-sm ${
                      active ? "border-[#b7ccac] bg-[#eef6e7] text-[#2f5637]" : "bg-white"
                    }`}
                    onClick={() => setStatus(option)}
                  >
                    {annualTreeCheckInStatusLabel(option)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[24px] border border-[var(--lv-border)] bg-white/90 p-4">
            <div className="text-sm font-semibold text-[var(--lv-text)]">Donde esta ahora</div>
            <div className="mt-1 text-xs leading-5 text-[var(--lv-text-muted)]">
              {config?.anniversaryLocationHint ??
                "Si se movio, desaparecio o hubo que replantarlo, dejadlo contado tambien."}
            </div>
            <div className="mt-3 space-y-3">
              <input
                className="lv-input"
                placeholder="Ej. Sigue en el mismo parque, lo movimos al jardin, ya no esta..."
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
                      status,
                      locationLabel: locationLabel.trim(),
                      locationLat: parsedLat,
                      locationLng: parsedLng,
                      notes: notes.trim(),
                      photoUrl: photoUrl.trim(),
                    })
                  }
                >
                  Abrir mapa y ajustar ubicacion
                </button>
              ) : null}
            </div>
          </div>

          <div className="rounded-[24px] border border-[var(--lv-border)] bg-white/90 p-4">
            <div className="text-sm font-semibold text-[var(--lv-text)]">Foto y notas</div>
            <div className="mt-1 text-xs leading-5 text-[var(--lv-text-muted)]">
              {config?.anniversaryNotesHint ??
                "Una foto o una nota honesta importan mas que una version bonita del recuerdo."}
            </div>
            <input
              className="lv-input mt-3"
              placeholder="URL de foto opcional"
              value={photoUrl}
              onChange={(event) => setPhotoUrl(event.target.value)}
            />
            <textarea
              className="lv-textarea mt-3 min-h-[120px]"
              rows={4}
              placeholder="Como esta, que ha cambiado, si sigue creciendo, si se perdio o si hubo que replantarlo..."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          {error ? <div className="lv-state-panel lv-tone-error text-sm">{error}</div> : null}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className="lv-btn lv-btn-secondary" onClick={onDismiss}>
            Ahora no
          </button>
          <button
            type="button"
            className="lv-btn lv-btn-primary disabled:opacity-50"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? "Guardando..." : "Guardar seguimiento"}
          </button>
        </div>
      </div>
    </div>
  );
}
