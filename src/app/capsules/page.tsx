"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSessionAccessToken, getSessionWithProfile } from "@/lib/auth";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import {
  TimeCapsuleComposerModal,
  type CreateTimeCapsulePayload,
} from "@/components/capsules/TimeCapsuleComposerModal";
import { ChatShareButton } from "@/components/chat/ChatShareButton";
import { useGardenCompanionLabel } from "@/components/chat/useGardenCompanionLabel";
import { TimeCapsuleViewerModal } from "@/components/capsules/TimeCapsuleViewerModal";
import { toErrorMessage } from "@/lib/errorMessage";
import { buildGardenChatCapsuleReference } from "@/lib/gardenChatReferences";
import { sendGardenChatReferenceMessage } from "@/lib/gardenChatMutations";
import {
  capsuleStatusLabel,
  capsuleWindowLabel,
  isCapsuleReady,
  type TimeCapsuleRow,
} from "@/lib/timeCapsuleModel";
import {
  DEFAULT_FUTURE_MOMENTS_CONFIG,
  getFutureMomentsConfig,
  type FutureMomentsConfig,
} from "@/lib/futureMomentsConfig";
import { getProductSurface } from "@/lib/productSurfaces";
import { isSchemaNotReadyError, resolveActiveGardenIdForUser } from "@/lib/gardens";
import { supabase } from "@/lib/supabase";

const SURFACE = getProductSurface("capsules");

async function callApi<T>(token: string, input: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(input, { ...init, headers, credentials: "same-origin" });
  const payload = res.headers.get("content-type")?.includes("application/json")
    ? await res.json()
    : null;

  if (!res.ok) {
    throw new Error(
      payload && typeof payload.error === "string" ? payload.error : `Error HTTP ${res.status}`,
    );
  }

  return payload as T;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("es-ES");
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function getCapsuleYear(capsule: Pick<TimeCapsuleRow, "sealed_at">) {
  const date = new Date(capsule.sealed_at);
  return Number.isNaN(date.getTime()) ? null : date.getUTCFullYear();
}

function countDownLabel(days: number) {
  if (days <= 0) return "Hoy";
  if (days === 1) return "1 dia";
  return `${days} dias`;
}

function CapsulesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [capsules, setCapsules] = useState<TimeCapsuleRow[]>([]);
  const [futureMomentsConfig, setFutureMomentsConfig] = useState<FutureMomentsConfig>(
    DEFAULT_FUTURE_MOMENTS_CONFIG,
  );
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState<string | null>(null);
  const [viewingCapsule, setViewingCapsule] = useState<TimeCapsuleRow | null>(null);
  const [activeGardenId, setActiveGardenId] = useState<string | null>(null);
  const [activeGardenMemberCount, setActiveGardenMemberCount] = useState(1);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
  const [sharingCapsuleId, setSharingCapsuleId] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const wantsCreate = searchParams.get("create") === "1";
  const requestedCapsuleId = String(searchParams.get("capsule") ?? "").trim();
  const { companionLabel } = useGardenCompanionLabel(activeGardenId, currentUser?.id ?? null);

  const getToken = useCallback(async () => {
    const token = await getSessionAccessToken();
    if (!token) {
      router.push("/login");
      throw new Error("Sesion expirada.");
    }
    return token;
  }, [router]);

  const loadCapsulesData = useCallback(async () => {
    const session = await getSessionWithProfile();
    if (!session) {
      router.push("/login");
      return null;
    }

    const token = await getSessionAccessToken();
    if (!token) {
      router.push("/login");
      return null;
    }

    const gardenId = await resolveActiveGardenIdForUser({ userId: session.user.id });
    let memberCount = 1;
    if (gardenId) {
      const memberCountRes = await supabase.rpc("get_active_garden_member_count", {
        target_garden_id: gardenId,
      });
      if (!memberCountRes.error) {
        const parsed = Number(memberCountRes.data);
        memberCount = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
      } else if (!isSchemaNotReadyError(memberCountRes.error)) {
        setMsg((current) => current ?? memberCountRes.error.message);
      }
    }

    const [data, config] = await Promise.all([
      callApi<{ capsules: TimeCapsuleRow[] }>(token, "/api/capsules"),
      getFutureMomentsConfig(),
    ]);

    return {
      capsules: data.capsules,
      config,
      currentUser: {
        id: session.user.id,
        name: session.profile.name?.trim() || session.user.email?.trim() || "Tu lado",
      },
      gardenId,
      memberCount,
    };
  }, [router]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const data = await loadCapsulesData();
        if (!active || !data) return;
        setCapsules(data.capsules);
        setFutureMomentsConfig(data.config);
        setCurrentUser(data.currentUser);
        setActiveGardenId(data.gardenId);
        setActiveGardenMemberCount(data.memberCount);
      } catch (error) {
        if (active) {
          setMsg(toErrorMessage(error, "No se pudieron cargar las capsulas."));
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [loadCapsulesData]);

  const sealed = useMemo(() => capsules.filter((capsule) => capsule.status === "sealed"), [capsules]);
  const ready = useMemo(
    () =>
      capsules.filter(
        (capsule) =>
          capsule.status === "ready" || (capsule.status === "sealed" && isCapsuleReady(capsule)),
      ),
    [capsules],
  );
  const opened = useMemo(() => capsules.filter((capsule) => capsule.status === "opened"), [capsules]);
  const currentYearCapsule = useMemo(
    () => capsules.find((capsule) => getCapsuleYear(capsule) === currentYear) ?? null,
    [capsules, currentYear],
  );
  const canCreateAnnualCapsule = !currentYearCapsule;

  useEffect(() => {
    if (loading || !wantsCreate || !canCreateAnnualCapsule) return;
    setShowCreate(true);
  }, [canCreateAnnualCapsule, loading, wantsCreate]);

  useEffect(() => {
    if (!requestedCapsuleId) return;
    const timer = window.setTimeout(() => {
      document.getElementById(`capsule-card-${requestedCapsuleId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 140);
    return () => window.clearTimeout(timer);
  }, [requestedCapsuleId, capsules]);

  async function handleCreate(payload: CreateTimeCapsulePayload) {
    setCreating(true);
    setMsg(null);
    try {
      const token = await getToken();
      const data = await callApi<{ capsule: TimeCapsuleRow }>(token, "/api/capsules", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setCapsules((prev) => [...prev, data.capsule]);
      setShowCreate(false);
      setMsg(`Capsula sellada. Se abrira el ${formatDate(data.capsule.opens_at)}.`);
    } catch (error) {
      setMsg(toErrorMessage(error, "No se pudo crear la capsula."));
    } finally {
      setCreating(false);
    }
  }

  async function handleRemoteSealed(title?: string) {
    try {
      const data = await loadCapsulesData();
      if (!data) return;
      setCapsules(data.capsules);
      setFutureMomentsConfig(data.config);
      setCurrentUser(data.currentUser);
      setActiveGardenId(data.gardenId);
      setActiveGardenMemberCount(data.memberCount);
      setShowCreate(false);
      setMsg(title ? `"${title}" ya ha quedado sellada.` : "La capsula compartida ya ha quedado sellada.");
    } catch (error) {
      setMsg(toErrorMessage(error, "La capsula se ha sellado, pero no se pudo refrescar la vista."));
    }
  }

  async function handleOpen(capsuleId: string) {
    setOpeningId(capsuleId);
    setMsg(null);
    try {
      const token = await getToken();
      const data = await callApi<{ capsule: TimeCapsuleRow }>(
        token,
        `/api/capsules/${capsuleId}/open`,
        { method: "POST" },
      );
      setCapsules((prev) =>
        prev.map((capsule) => (capsule.id === capsuleId ? data.capsule : capsule)),
      );
      setViewingCapsule(data.capsule);
      setConfirmOpen(null);
    } catch (error) {
      setMsg(toErrorMessage(error, "No se pudo abrir la capsula."));
    } finally {
      setOpeningId(null);
    }
  }

  async function handleShareCapsuleToChat(capsule: TimeCapsuleRow) {
    const gardenId = String(activeGardenId ?? "").trim();
    const profileId = String(currentUser?.id ?? "").trim();
    if (!gardenId || !profileId) {
      setMsg("Necesitamos jardin activo y sesion valida para compartir esta capsula.");
      return;
    }

    setSharingCapsuleId(capsule.id);
    setMsg(null);
    try {
      await sendGardenChatReferenceMessage({
        gardenId,
        authorUserId: profileId,
        reference: buildGardenChatCapsuleReference(capsule),
      });
      setMsg(`"${capsule.title}" ya esta compartida en el chat.`);
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "No se pudo compartir la capsula en el chat.");
    } finally {
      setSharingCapsuleId((current) => (current === capsule.id ? null : current));
    }
  }

  if (loading) {
    return <PageLoadingState message="Cargando capsulas..." />;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f4efe4_0%,#f7f4ed_32%,#f8f7f3_100%)] p-6 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="overflow-hidden rounded-[32px] border border-[#d8cfbe] bg-[linear-gradient(135deg,#fff8ea_0%,#fffdf6_45%,#f5f7fb_100%)] p-6 shadow-[0_18px_50px_rgba(40,38,31,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl space-y-3">
              <div className="text-xs uppercase tracking-[0.32em] text-slate-500">
                {futureMomentsConfig.capsule.heroEyebrow}
              </div>
              <h1 className="text-3xl font-semibold">
                {futureMomentsConfig.capsule.heroTitle || SURFACE?.label || "Capsulas del tiempo"}
              </h1>
              <p className="text-sm leading-6 text-slate-600">
                {futureMomentsConfig.capsule.heroDescription}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="lv-btn lv-btn-secondary"
                onClick={() => router.push("/home")}
              >
                Volver
              </button>
              <button
                type="button"
                className="lv-btn lv-btn-primary disabled:opacity-50"
                onClick={() => setShowCreate(true)}
                disabled={!canCreateAnnualCapsule}
              >
                {canCreateAnnualCapsule ? "Sellar capsula anual" : "Capsula anual ya sellada"}
              </button>
            </div>
          </div>

          {msg ? (
            <div className="mt-4">
              <StatusNotice message={msg} />
            </div>
          ) : null}

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-[24px] border border-[#eadfca] bg-white/80 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Regla anual</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">1 capsula por jardin y por año</div>
              <div className="mt-2 text-sm text-slate-600">
                Asi la experiencia se siente especial y no ensucia la narrativa del jardin.
              </div>
            </div>
            <div className="rounded-[24px] border border-[#eadfca] bg-white/80 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Ceremonia</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">
                {futureMomentsConfig.capsule.ceremonyHint}
              </div>
            </div>
            <div className="rounded-[24px] border border-[#eadfca] bg-white/80 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Ideas para guardar</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {futureMomentsConfig.capsule.objectIdeas.slice(0, 3).map((idea) => (
                  <span
                    key={idea}
                    className="rounded-full border border-[#eadfca] bg-[#fff9ef] px-3 py-1 text-xs text-slate-700"
                  >
                    {idea}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-[#d9d8d2] bg-white/90 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Capsula anual {currentYear}</div>
              <div className="mt-2 text-xl font-semibold text-slate-900">
                {currentYearCapsule ? currentYearCapsule.title : "Todavia no habeis sellado la de este año"}
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                {currentYearCapsule
                  ? `Quedo sellada el ${formatDate(currentYearCapsule.sealed_at)} y se abrira el ${formatDate(currentYearCapsule.opens_at)}.`
                  : "Cuando la selleis, esta se convertira en la capsula simbolica del año para vuestro jardin."}
              </p>
            </div>
              <div className="rounded-full border border-[#e3dbc8] bg-[#fffaf0] px-3 py-1.5 text-xs font-medium text-slate-700">
              {currentYearCapsule ? capsuleStatusLabel(currentYearCapsule.status) : "Pendiente"}
              </div>
          </div>
          {currentYearCapsule ? (
            <div className="mt-4 flex justify-end">
              <ChatShareButton
                onClick={() => void handleShareCapsuleToChat(currentYearCapsule)}
                busy={sharingCapsuleId === currentYearCapsule.id}
                recipientLabel={companionLabel}
                label="Compartir capsula"
                busyLabel="Compartiendo..."
              />
            </div>
          ) : null}
          {currentYearCapsule ? (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-[22px] border border-[#eadfca] bg-[#fffaf1] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Cuenta atras</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {countDownLabel(daysUntil(currentYearCapsule.opens_at))}
                </div>
              </div>
              <div className="rounded-[22px] border border-[#eadfca] bg-[#fffaf1] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Ventana</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {capsuleWindowLabel(currentYearCapsule.window_code)}
                </div>
              </div>
              <div className="rounded-[22px] border border-[#eadfca] bg-[#fffaf1] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Piezas</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {currentYearCapsule.content_blocks.length}
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {ready.length > 0 ? (
          <section className="rounded-[28px] border border-[#b7ccac] bg-[#f8faf5] p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#2f5637]">Listas para abrir</h2>
            <div className="mt-4 space-y-3">
              {ready.map((capsule) => (
                <div
                  key={capsule.id}
                  id={`capsule-card-${capsule.id}`}
                  className={`flex items-center justify-between rounded-2xl border bg-white p-4 ${
                    requestedCapsuleId === capsule.id
                      ? "border-[#86b49d] shadow-[0_0_0_3px_rgba(134,180,157,0.18)]"
                      : "border-[#b7ccac]"
                  }`}
                >
                  <div>
                    <div className="font-medium">{capsule.title}</div>
                    <div className="text-xs text-slate-500">
                      Sellada el {formatDate(capsule.sealed_at)} - Ventana {capsuleWindowLabel(capsule.window_code)}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ChatShareButton
                      onClick={() => void handleShareCapsuleToChat(capsule)}
                      busy={sharingCapsuleId === capsule.id}
                      recipientLabel={companionLabel}
                      label="Compartir"
                      busyLabel="Compartiendo..."
                    />
                    <button
                      type="button"
                      className="lv-btn lv-btn-primary disabled:opacity-50"
                      onClick={() => setConfirmOpen(capsule.id)}
                      disabled={openingId === capsule.id}
                    >
                      {openingId === capsule.id ? "Abriendo..." : "Abrir"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {sealed.length > 0 ? (
          <section className="rounded-[28px] border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Selladas</h2>
            <div className="mt-4 space-y-3">
              {sealed.map((capsule) => {
                const days = daysUntil(capsule.opens_at);
                return (
                  <div
                    key={capsule.id}
                    id={`capsule-card-${capsule.id}`}
                    className={`flex items-center justify-between rounded-2xl border bg-[#fffcf5] p-4 ${
                      requestedCapsuleId === capsule.id
                        ? "border-[#86b49d] shadow-[0_0_0_3px_rgba(134,180,157,0.18)]"
                        : ""
                    }`}
                  >
                    <div>
                      <div className="font-medium">{capsule.title}</div>
                      <div className="text-xs text-slate-500">
                        Se abre el {formatDate(capsule.opens_at)} - Faltan {days} dia(s)
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <ChatShareButton
                        onClick={() => void handleShareCapsuleToChat(capsule)}
                        busy={sharingCapsuleId === capsule.id}
                        recipientLabel={companionLabel}
                        label="Compartir"
                        busyLabel="Compartiendo..."
                      />
                      <span className="rounded-full border bg-[#fff7e6] px-3 py-1 text-xs">
                        {capsuleStatusLabel(capsule.status)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {opened.length > 0 ? (
          <section className="rounded-[28px] border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Abiertas</h2>
            <div className="mt-4 space-y-3">
              {opened.map((capsule) => (
                <div
                  key={capsule.id}
                  id={`capsule-card-${capsule.id}`}
                  className={`flex items-center justify-between rounded-2xl border bg-[#f8fbff] p-4 ${
                    requestedCapsuleId === capsule.id
                      ? "border-[#86b49d] shadow-[0_0_0_3px_rgba(134,180,157,0.18)]"
                      : ""
                  }`}
                >
                  <div>
                    <div className="font-medium">{capsule.title}</div>
                    <div className="text-xs text-slate-500">
                      Abierta el {formatDate(capsule.opened_at)} - Sellada el {formatDate(capsule.sealed_at)}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ChatShareButton
                      onClick={() => void handleShareCapsuleToChat(capsule)}
                      busy={sharingCapsuleId === capsule.id}
                      recipientLabel={companionLabel}
                      label="Compartir"
                      busyLabel="Compartiendo..."
                    />
                    <button
                      type="button"
                      className="lv-btn lv-btn-secondary text-xs"
                      onClick={() => setViewingCapsule(capsule)}
                    >
                      Ver contenido
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {capsules.length === 0 ? (
          <section className="rounded-[28px] border border-dashed border-[#c4d7b8] bg-[#f8faf5] p-6 text-center shadow-sm">
            <p className="text-lg font-medium text-[#2f5637]">Todavia no habeis creado ninguna capsula</p>
            <p className="mt-2 text-sm text-[#4a6d44]">
              Sellad un mensaje, una promesa, una voz, un video o una escena simbolica y dejad que el tiempo lo guarde.
            </p>
            <button
              type="button"
              className="lv-btn lv-btn-primary mt-4 disabled:opacity-50"
              onClick={() => setShowCreate(true)}
              disabled={!canCreateAnnualCapsule}
            >
              {canCreateAnnualCapsule ? "Crear capsula anual" : "Capsula anual ya creada"}
            </button>
          </section>
        ) : null}
      </div>

      {showCreate ? (
        <TimeCapsuleComposerModal
          activeGardenId={activeGardenId}
          activeGardenMemberCount={activeGardenMemberCount}
          currentYear={currentYear}
          config={futureMomentsConfig.capsule}
          currentUser={currentUser}
          onRemoteSealed={handleRemoteSealed}
          submitting={creating}
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
        />
      ) : null}

      <ConfirmModal
        open={confirmOpen != null}
        title="Abrir capsula"
        description="Una vez abierta no se puede volver a sellar. Seguro que quereis abrirla?"
        confirmLabel="Abrir"
        onConfirm={() => {
          if (confirmOpen) void handleOpen(confirmOpen);
        }}
        onCancel={() => setConfirmOpen(null)}
      />

      <TimeCapsuleViewerModal
        capsule={viewingCapsule}
        config={futureMomentsConfig.capsule}
        onClose={() => setViewingCapsule(null)}
      />
    </div>
  );
}

export default function CapsulesPage() {
  return (
    <Suspense fallback={<PageLoadingState message="Cargando capsulas..." />}>
      <CapsulesPageContent />
    </Suspense>
  );
}
