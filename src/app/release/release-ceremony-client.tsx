"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusNotice } from "@/components/ui/StatusNotice";

type CeremonyRemoteState = {
  unlocked: boolean;
  unlockedAt: string | null;
  firstName: string | null;
  firstConfirmedAt: string | null;
  firstReady: boolean;
  secondName: string | null;
  secondConfirmedAt: string | null;
  secondReady: boolean;
};

const DEFAULT_REMOTE_STATE: CeremonyRemoteState = {
  unlocked: false,
  unlockedAt: null,
  firstName: null,
  firstConfirmedAt: null,
  firstReady: false,
  secondName: null,
  secondConfirmedAt: null,
  secondReady: false,
};

async function fetchCeremonyState() {
  const response = await fetch("/api/public/release/status", {
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    | ({ error?: string } & Partial<CeremonyRemoteState>)
    | null;

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === "string"
        ? payload.error
        : "No se pudo cargar el estado de la ceremonia.",
    );
  }

  return {
    ...DEFAULT_REMOTE_STATE,
    ...payload,
  } as CeremonyRemoteState;
}

function CeremonyCard({
  title,
  subtitle,
  confirmed,
  onConfirm,
  disabled,
}: {
  title: string;
  subtitle: string;
  confirmed: boolean;
  onConfirm: () => void;
  disabled: boolean;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-5 shadow-[var(--lv-shadow-sm)]">
      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
          Turno personal
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--lv-text)]">{title}</h2>
        <p className="text-sm leading-6 text-[var(--lv-text-muted)]">{subtitle}</p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onConfirm}
          disabled={disabled}
          className={`rounded-[20px] px-5 py-3 text-sm font-medium transition ${
            confirmed
              ? "border border-[var(--lv-success)] bg-[var(--lv-success-soft)] text-[var(--lv-success)]"
              : "bg-[var(--lv-primary)] text-white hover:opacity-95"
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {confirmed ? "Ya esta dado" : "Dar mi si"}
        </button>

        <div className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-3 py-1 text-xs font-medium text-[var(--lv-text-muted)]">
          {confirmed ? "Confirmado" : "Pendiente"}
        </div>
      </div>
    </section>
  );
}

export function ReleaseCeremonyClient() {
  const [remoteState, setRemoteState] = useState<CeremonyRemoteState>(DEFAULT_REMOTE_STATE);
  const [draftName, setDraftName] = useState("");
  const [loadingState, setLoadingState] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const bothReady = remoteState.firstReady && remoteState.secondReady;

  const headline = useMemo(() => {
    if (remoteState.unlocked) return "Libro Vivo ya esta abierto";
    if (bothReady) return "Los dos gestos ya estan dentro";
    return "Desbloqueo ceremonial";
  }, [bothReady, remoteState.unlocked]);

  useEffect(() => {
    let active = true;

    async function loadInitialState() {
      try {
        const nextState = await fetchCeremonyState();
        if (!active) return;
        setRemoteState(nextState);
        if (nextState.unlocked) {
          window.location.replace("/login?released=1");
          return;
        }
      } catch (error) {
        if (!active) return;
        setErrorMessage(
          error instanceof Error ? error.message : "No se pudo cargar la ceremonia.",
        );
      } finally {
        if (active) setLoadingState(false);
      }
    }

    void loadInitialState();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (remoteState.unlocked) return;

    const timer = window.setInterval(async () => {
      try {
        const nextState = await fetchCeremonyState();
        setRemoteState(nextState);
        if (nextState.unlocked) {
          window.location.replace("/login?released=1");
        }
      } catch {
        // Si falla un poll puntual, no interrumpimos la ceremonia.
      }
    }, 2000);

    return () => window.clearInterval(timer);
  }, [remoteState.unlocked]);

  async function confirmName() {
    const name = draftName.trim();
    if (!name) {
      setErrorMessage("Escribe un nombre antes de dar el si.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/public/release/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      const payload = (await response.json().catch(() => null)) as
        | ({ error?: string } & Partial<CeremonyRemoteState>)
        | null;

      if (!response.ok) {
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "No se pudo guardar vuestra confirmacion.",
        );
      }

      const nextState = {
        ...DEFAULT_REMOTE_STATE,
        ...payload,
      } as CeremonyRemoteState;

      setRemoteState(nextState);
      setDraftName("");
      if (nextState.unlocked) {
        window.location.replace("/login?released=1");
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo guardar vuestra confirmacion.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(232,180,108,0.18),transparent_38%),linear-gradient(180deg,var(--lv-bg)_0%,color-mix(in_srgb,var(--lv-bg)_88%,#fff6e2)_100%)] px-5 py-6 text-[var(--lv-text)] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-[34px] border border-[var(--lv-border)] bg-[color-mix(in_srgb,var(--lv-surface)_94%,#fff9ef)] p-6 shadow-[var(--lv-shadow-sm)] sm:p-8">
          <div className="space-y-4">
            <div className="inline-flex rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
              Ceremonia privada
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-[var(--lv-text)] sm:text-4xl">
                {headline}
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-[var(--lv-text-muted)] sm:text-base">
                Esta puerta existe solo para daros vuestro momento. Hasta que no deis el si los dos,
                la entrada normal queda guardada y se redirige aqui.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-5 shadow-[var(--lv-shadow-sm)]">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-[var(--lv-text)]">Tu nombre</span>
              <input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                disabled={submitting || remoteState.unlocked}
                placeholder="Escribe tu nombre"
                className="w-full rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-3 text-sm outline-none transition focus:border-[var(--lv-primary)]"
              />
            </label>

            <button
              type="button"
              onClick={() => void confirmName()}
              disabled={loadingState || submitting || remoteState.unlocked}
              className="rounded-[20px] bg-[var(--lv-primary)] px-5 py-3 text-sm font-medium text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Guardando..." : "Dar mi si"}
            </button>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <CeremonyCard
            title={remoteState.firstName ?? "Primer si pendiente"}
            subtitle="Aqui aparece el primer gesto guardado desde cualquiera de los dos dispositivos."
            confirmed={remoteState.firstReady}
            onConfirm={() => {}}
            disabled
          />

          <CeremonyCard
            title={remoteState.secondName ?? "Segundo si pendiente"}
            subtitle="En cuanto entre un segundo nombre distinto, la puerta se abre sola."
            confirmed={remoteState.secondReady}
            onConfirm={() => {}}
            disabled
          />
        </section>

        <section className="rounded-[30px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-6 shadow-[var(--lv-shadow-sm)]">
          <div className="space-y-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                Ultimo paso
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--lv-text)]">
                Esperar a que los dos termineis
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--lv-text-muted)]">
                El nombre que escriba cada uno se sincroniza entre dispositivos. En cuanto entren
                dos si distintos, el cerrojo global se levanta, esta pantalla desaparece y os
                mandamos al login.
              </p>
            </div>

            {errorMessage ? <StatusNotice message={errorMessage} tone="warning" /> : null}

            <div className="rounded-[22px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-4 py-3 text-sm leading-6 text-[var(--lv-text)]">
              {remoteState.unlocked
                ? "Libro Vivo ya esta abierto."
                : bothReady
                  ? "Los dos si ya han quedado guardados. Estamos abriendo la puerta..."
                  : "Falta que quede guardado el gesto de los dos."}
            </div>

            <div className="rounded-[22px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-4 py-3 text-sm leading-6 text-[var(--lv-text-muted)]">
              Si alguien intenta entrar antes, la app no ensena el login: redirige aqui hasta que
              esta ceremonia quede completada.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
