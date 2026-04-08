"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSessionAccessToken, getSessionUser } from "@/lib/auth";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { toErrorMessage } from "@/lib/errorMessage";

type MePayload = {
  me: {
    id: string;
    name: string;
    inviteCode: string | null;
    activeGardenId: string | null;
  };
};

type Invitation = {
  id: string;
  bondType: string;
  status: string;
  expiresAt: string | null;
  createdAt: string | null;
  acceptedAt: string | null;
  invitedEmail: string | null;
  invitedUserId: string | null;
  invitedByUserId: string | null;
};

type InvitationsPayload = {
  invitations: Invitation[];
};

type AcceptInvitationPayload = {
  accepted: {
    invitationId: string;
    bondId: string;
    gardenId: string;
    bondType: string;
    gardenTitle: string | null;
  };
};

type CreatePersonalPayload = {
  personalGarden: {
    bondId: string;
    gardenId: string;
    title: string;
  };
};

async function callAuthedApi<T>(token: string, input: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(input, {
    ...init,
    headers,
    credentials: "same-origin",
  });

  const payload = res.headers.get("content-type")?.includes("application/json")
    ? await res.json()
    : null;

  if (!res.ok) {
    const message =
      payload && typeof payload.error === "string" ? payload.error : `Error HTTP ${res.status}`;
    throw new Error(message);
  }

  return payload as T;
}

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("es-ES");
}

function bondTypeLabel(value: string) {
  if (value === "pareja") return "Pareja";
  if (value === "amistad") return "Amistad";
  if (value === "familia") return "Familia";
  if (value === "personal") return "Personal";
  return value || "Invitacion";
}

export default function WelcomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [me, setMe] = useState<MePayload["me"] | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [creatingGarden, setCreatingGarden] = useState(false);
  const [acceptingInvitationId, setAcceptingInvitationId] = useState<string | null>(null);
  const [gardenTitle, setGardenTitle] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const user = await getSessionUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const token = await getSessionAccessToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      const [mePayload, invitationsPayload] = await Promise.all([
        callAuthedApi<MePayload>(token, "/api/bonds/me"),
        callAuthedApi<InvitationsPayload>(token, "/api/bonds/invitations"),
      ]);

      if (mePayload.me.activeGardenId) {
        router.replace("/home");
        return;
      }

      setMe(mePayload.me);
      setInvitations(invitationsPayload.invitations ?? []);
    } catch (error) {
      setMessage(toErrorMessage(error, "No se pudo preparar la bienvenida."));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const pendingInvitations = useMemo(
    () => invitations.filter((invitation) => invitation.status === "pending"),
    [invitations],
  );

  async function handleCreateGarden() {
    setCreatingGarden(true);
    setMessage(null);
    try {
      const token = await getSessionAccessToken();
      if (!token) {
        router.replace("/login");
        return;
      }
      const payload = await callAuthedApi<CreatePersonalPayload>(token, "/api/bonds/personal", {
        method: "POST",
        body: JSON.stringify({ title: gardenTitle.trim() || null }),
      });
      setMessage(`Jardin creado: ${payload.personalGarden.title}. Entrando en home...`);
      router.replace("/home?tour=1");
    } catch (error) {
      setMessage(toErrorMessage(error, "No se pudo crear el jardin."));
    } finally {
      setCreatingGarden(false);
    }
  }

  async function handleAcceptInvitation(invitationId: string) {
    setAcceptingInvitationId(invitationId);
    setMessage(null);
    try {
      const token = await getSessionAccessToken();
      if (!token) {
        router.replace("/login");
        return;
      }
      const payload = await callAuthedApi<AcceptInvitationPayload>(
        token,
        `/api/bonds/invitations/${invitationId}/accept`,
        { method: "POST" },
      );
      setMessage(
        `Te has unido al jardin ${payload.accepted.gardenTitle ?? "compartido"}. Entrando en home...`,
      );
      router.replace("/home?tour=1");
    } catch (error) {
      setMessage(toErrorMessage(error, "No se pudo aceptar la invitacion."));
    } finally {
      setAcceptingInvitationId(null);
    }
  }

  if (loading) {
    return <PageLoadingState message="Preparando la bienvenida..." />;
  }

  return (
    <div className="lv-page p-4 sm:p-6">
      <div className="lv-shell max-w-5xl space-y-4">
        {message ? <StatusNotice message={message} tone="info" /> : null}

        <section className="lv-card overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="p-5 sm:p-7">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                Bienvenida
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--lv-text)]">
                {me?.name
                  ? `${me.name}, primero necesitamos preparar vuestro jardin.`
                  : "Primero necesitamos preparar vuestro jardin."}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--lv-text-muted)]">
                Aqui solo tomamos la primera decision: crear vuestro espacio o uniros a uno ya
                abierto. En cuanto entreis, os acompanaremos con un primer paseo guiado por home.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="lv-card-soft p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
                    Paso 1
                  </div>
                  <div className="mt-2 text-base font-semibold">Crear o unirse</div>
                  <p className="mt-2 text-sm text-[var(--lv-text-muted)]">
                    Sin jardin no hay contexto compartido donde guardar planes, recuerdos y ciclos.
                  </p>
                </div>
                <div className="lv-card-soft p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
                    Paso 2
                  </div>
                  <div className="mt-2 text-base font-semibold">Primer paseo por home</div>
                  <p className="mt-2 text-sm text-[var(--lv-text-muted)]">
                    Os senalaremos la portada, la actividad, el mapa y el punto donde nace una
                    semilla.
                  </p>
                </div>
                <div className="lv-card-soft p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
                    Paso 3
                  </div>
                  <div className="mt-2 text-base font-semibold">Empezar a vivirlo</div>
                  <p className="mt-2 text-sm text-[var(--lv-text-muted)]">
                    Despues ya tendra sentido plantar planes, guardar lugares y construir memoria.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-l border-[var(--lv-border)] bg-[linear-gradient(180deg,#f6faf2_0%,#eef5e8_100%)] p-5 sm:p-7">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
                Empezar
              </div>
              <div className="mt-3 text-xl font-semibold text-[var(--lv-text)]">
                Elige como quieres entrar
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--lv-text-muted)]">
                Puedes arrancar con un jardin propio y luego invitar, o aceptar una invitacion si
                ya te la han mandado.
              </p>

              <div className="mt-5 space-y-3 rounded-[24px] border border-[var(--lv-border)] bg-white/90 p-4">
                <div className="text-sm font-semibold text-[var(--lv-text)]">Crear mi jardin</div>
                <input
                  className="lv-input"
                  placeholder="Nombre opcional del jardin"
                  value={gardenTitle}
                  onChange={(event) => setGardenTitle(event.target.value)}
                />
                <button
                  type="button"
                  className="lv-btn lv-btn-primary w-full disabled:opacity-50"
                  onClick={() => void handleCreateGarden()}
                  disabled={creatingGarden}
                  data-testid="welcome-create-garden"
                >
                  {creatingGarden ? "Creando jardin..." : "Crear jardin y entrar"}
                </button>
              </div>

              <div className="mt-4 space-y-3 rounded-[24px] border border-[var(--lv-border)] bg-white/90 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-[var(--lv-text)]">
                    Unirme con invitacion
                  </div>
                  <span className="lv-badge">{pendingInvitations.length} pendiente(s)</span>
                </div>

                {pendingInvitations.length > 0 ? (
                  <div className="space-y-2">
                    {pendingInvitations.map((invitation) => (
                      <div
                        key={invitation.id}
                        className="rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-[var(--lv-text)]">
                              Invitacion de tipo {bondTypeLabel(invitation.bondType)}
                            </div>
                            <div className="mt-1 text-xs text-[var(--lv-text-muted)]">
                              {formatDate(invitation.createdAt)
                                ? `Creada el ${formatDate(invitation.createdAt)}`
                                : "Pendiente de aceptar"}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="lv-btn lv-btn-primary disabled:opacity-50"
                            onClick={() => void handleAcceptInvitation(invitation.id)}
                            disabled={acceptingInvitationId === invitation.id}
                            data-testid="welcome-accept-invitation"
                          >
                            {acceptingInvitationId === invitation.id ? "Uniendome..." : "Aceptar"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-[var(--lv-text-muted)]">
                    Aun no hay invitaciones pendientes en esta cuenta. Si te van a invitar, tambien
                    puedes abrir la gestion completa de jardines y vinculos.
                  </div>
                )}

                <button
                  type="button"
                  className="lv-btn lv-btn-secondary w-full"
                  onClick={() => router.push("/bonds?onboarding=1")}
                >
                  Abrir gestion completa de jardines
                </button>
              </div>

              <p className="mt-4 text-xs leading-6 text-[var(--lv-text-muted)]">
                Al entrar a home os guiaremos paso a paso por la portada, la actividad, el mapa y
                el lugar donde se plantan las semillas.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
