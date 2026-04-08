"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ensureSuperadminOrRedirect } from "@/lib/auth";

const RELEASE_STORAGE_KEY = "lv-release-ritual-2026-04-08";

type ReleaseRecord = {
  completedAt: string;
  completedBy: string;
  note: string;
};

const FINAL_CHECKLIST = [
  "Base nueva validada y runtime operativo.",
  "Storage y buckets cerrados.",
  "Repo limpio preparado para GitHub y Vercel.",
  "Dominio y correo listos para el alta final.",
];

function readReleaseRecord() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(RELEASE_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ReleaseRecord>;
    const completedAt = String(parsed.completedAt ?? "").trim();
    const completedBy = String(parsed.completedBy ?? "").trim();
    const note = String(parsed.note ?? "").trim();
    if (!completedAt || !completedBy) return null;
    return { completedAt, completedBy, note };
  } catch {
    return null;
  }
}

export default function AdminReleasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [completedBy, setCompletedBy] = useState("");
  const [note, setNote] = useState("");
  const [savedRecord, setSavedRecord] = useState<ReleaseRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function guard() {
      const session = await ensureSuperadminOrRedirect(router);
      if (!active) return;
      if (!session) {
        setLoading(false);
        return;
      }

      const record = readReleaseRecord();
      if (record) {
        setSavedRecord(record);
        setCompletedBy(record.completedBy);
        setNote(record.note);
      }

      setLoading(false);
    }

    void guard();
    return () => {
      active = false;
    };
  }, [router]);

  const ceremonyLabel = useMemo(() => {
    if (!savedRecord) return "Pendiente de ceremonia";
    return `Cerrado por ${savedRecord.completedBy}`;
  }, [savedRecord]);

  function handleComplete() {
    const nextBy = completedBy.trim();
    const nextNote = note.trim();

    if (!nextBy) {
      setErrorMessage("Escribe el nombre de quien hace el ultimo click.");
      return;
    }

    const nextRecord: ReleaseRecord = {
      completedAt: new Date().toISOString(),
      completedBy: nextBy,
      note: nextNote,
    };

    window.localStorage.setItem(RELEASE_STORAGE_KEY, JSON.stringify(nextRecord));
    setSavedRecord(nextRecord);
    setErrorMessage(null);
  }

  function handleReset() {
    window.localStorage.removeItem(RELEASE_STORAGE_KEY);
    setSavedRecord(null);
    setCompletedBy("");
    setNote("");
    setErrorMessage(null);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(232,180,108,0.2),transparent_42%),linear-gradient(180deg,var(--lv-bg)_0%,color-mix(in_srgb,var(--lv-bg)_86%,#fff5df)_100%)] px-6 py-8 text-[var(--lv-text)]">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-[32px] border border-[var(--lv-border)] bg-[color-mix(in_srgb,var(--lv-surface)_92%,#fffaf0)] p-6 shadow-[var(--lv-shadow-sm)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <div className="inline-flex rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                Cierre simbolico
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">Ceremonia final de despliegue</h1>
              <p className="max-w-3xl text-sm leading-6 text-[var(--lv-text-muted)]">
                Este es el ultimo gesto del proceso: confirmar que Libro Vivo ha quedado listo y
                dejar constancia de quien cerro el despliegue.
              </p>
            </div>

            <div className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-2 text-sm font-medium">
              {ceremonyLabel}
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-[30px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-6 shadow-[var(--lv-shadow-sm)]">
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Checklist del ultimo tramo</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--lv-text-muted)]">
                  No pretende sustituir validaciones tecnicas. Es el paso humano que cierra el
                  trabajo y os deja un pequeno momento compartido.
                </p>
              </div>

              <div className="grid gap-3">
                {FINAL_CHECKLIST.map((item, index) => (
                  <div
                    key={item}
                    className="rounded-[22px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-4 py-3 text-sm leading-6"
                  >
                    <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--lv-primary-soft)] text-xs font-semibold text-[var(--lv-primary-strong)]">
                      {index + 1}
                    </span>
                    {item}
                  </div>
                ))}
              </div>

              <div className="rounded-[26px] border border-[var(--lv-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--lv-surface)_70%,#fff4d6)_0%,var(--lv-surface)_100%)] p-5">
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium">Quien pulsa el ultimo boton</div>
                    <p className="mt-1 text-sm leading-6 text-[var(--lv-text-muted)]">
                      Podeis poner su nombre y, si quereis, una frase corta para dejar el cierre con
                      algo vuestro.
                    </p>
                  </div>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium">Nombre</span>
                    <input
                      value={completedBy}
                      onChange={(event) => setCompletedBy(event.target.value)}
                      placeholder="Por ejemplo: Ana"
                      className="w-full rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-3 text-sm outline-none transition focus:border-[var(--lv-primary)]"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium">Nota final</span>
                    <textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Hoy lo dejamos vivo."
                      rows={4}
                      className="w-full rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-3 text-sm outline-none transition focus:border-[var(--lv-primary)]"
                    />
                  </label>

                  {errorMessage ? (
                    <div className="rounded-[18px] border border-[var(--lv-warning)] bg-[var(--lv-warning-soft)] px-4 py-3 text-sm text-[var(--lv-warning)]">
                      {errorMessage}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleComplete}
                      className="rounded-[20px] bg-[var(--lv-primary)] px-5 py-3 text-sm font-medium text-white transition hover:opacity-95"
                    >
                      Marcar despliegue como completo
                    </button>

                    <button
                      type="button"
                      onClick={handleReset}
                      className="rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-5 py-3 text-sm font-medium text-[var(--lv-text)] transition hover:bg-[var(--lv-surface-soft)]"
                    >
                      Resetear ceremonia
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-[30px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-5 shadow-[var(--lv-shadow-sm)]">
              <div className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                Estado
              </div>

              {savedRecord ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-[24px] border border-[var(--lv-success)] bg-[var(--lv-success-soft)] p-4">
                    <div className="text-lg font-semibold text-[var(--lv-success)]">
                      Despliegue marcado como completo
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--lv-text)]">
                      Cerrado por <strong>{savedRecord.completedBy}</strong>.
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
                      {new Date(savedRecord.completedAt).toLocaleString("es-ES")}
                    </p>
                  </div>

                  {savedRecord.note ? (
                    <div className="rounded-[22px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4 text-sm leading-6 text-[var(--lv-text)]">
                      "{savedRecord.note}"
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-4 rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4 text-sm leading-6 text-[var(--lv-text-muted)]">
                  Todavia no se ha hecho el ultimo click ceremonial.
                </div>
              )}
            </section>

            <section className="rounded-[30px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-5 shadow-[var(--lv-shadow-sm)]">
              <div className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                Navegacion
              </div>
              <div className="mt-4 grid gap-3">
                <Link
                  href="/admin"
                  className="rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-4 py-3 text-sm font-medium text-[var(--lv-text)] transition hover:bg-[var(--lv-surface)]"
                >
                  Volver al admin
                </Link>
                <Link
                  href="/home"
                  className="rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-4 py-3 text-sm font-medium text-[var(--lv-text)] transition hover:bg-[var(--lv-surface)]"
                >
                  Abrir home
                </Link>
              </div>
            </section>
          </aside>
        </div>

        {loading ? (
          <div className="rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-3 text-sm text-[var(--lv-text-muted)]">
            Cargando acceso de superadmin...
          </div>
        ) : null}
      </div>
    </div>
  );
}
