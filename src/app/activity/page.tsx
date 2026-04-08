"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ActivityFeedCard } from "@/components/activity/ActivityFeedCard";
import { useActivityFeedData } from "@/components/activity/useActivityFeedData";
import ActiveGardenSwitcher from "@/components/shared/ActiveGardenSwitcher";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { PageStateCard } from "@/components/ui/PageStateCard";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { getSessionAccessToken } from "@/lib/auth";
import { formatActivityUnseenLabel } from "@/lib/activityPresentation";
import type { ActivityItem } from "@/lib/productDomainContracts";
import {
  getPageDetailHref,
  getProductSurface,
  getProductSurfaceHref,
} from "@/lib/productSurfaces";

const ACTIVITY_SURFACE = getProductSurface("activity");
const ATTENTION_PREVIEW_LIMIT = 3;
const ATTENTION_SEEN_PREVIEW_LIMIT = 2;
const NOVELTY_PREVIEW_LIMIT = 6;

function formatActivityDate(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function classifyActivityDateBucket(value: string | null) {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return "older";

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = startOfToday.getTime() - new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
  const diffDays = Math.floor(diff / (24 * 60 * 60 * 1000));

  if (diffDays <= 0) return "today";
  if (diffDays < 7) return "week";
  return "older";
}

function noveltyBucketLabel(bucket: "today" | "week" | "older") {
  if (bucket === "today") return "Hoy";
  if (bucket === "week") return "Esta semana";
  return "Antes";
}

function resolveActivityAction(item: ActivityItem) {
  if (item.kind === "shared_preparation" && item.entityId) {
    return {
      label: "Abrir dossier",
      href: `${getProductSurfaceHref("plans")}?seed=${item.entityId}&preparation=1`,
    };
  }

  if (item.kind === "water_seed" || item.kind === "waiting_partner") {
    return {
      label: item.kind === "water_seed" ? "Ir a planes" : "Ver en planes",
      href: `${getProductSurfaceHref("plans")}?focus=action`,
    };
  }

  if (item.kind === "flower_birth_pending" && item.entityId) {
    return {
      label: "Entrar al nacimiento",
      href: `${getPageDetailHref(item.entityId)}?ritual=flower_birth`,
    };
  }

  if (item.kind === "complete_bloom_page" && item.entityId) {
    return {
      label: "Completar flor",
      href: getPageDetailHref(item.entityId),
    };
  }

  if (item.kind === "garden_invitation") {
    return {
      label: "Abrir vinculos",
      href: getProductSurfaceHref("bonds"),
    };
  }

  if (item.kind === "garden_change_notice") {
    return {
      label: "Abrir vinculos",
      href: `${getProductSurfaceHref("bonds")}/manage`,
    };
  }

  return null;
}

export default function ActivityPage() {
  const router = useRouter();
  const [showAllAttention, setShowAllAttention] = useState(false);
  const [showAllSeenAttention, setShowAllSeenAttention] = useState(false);
  const [showAllNovelties, setShowAllNovelties] = useState(false);
  const {
    loading,
    msg,
    items,
    unseenCount,
    isItemSeen,
    markItemsSeen,
    setActiveGardenId,
    refreshActivity,
  } = useActivityFeedData({
    onRequireLogin: () => {
      router.push(getProductSurfaceHref("login"));
    },
  });

  const attentionItems = useMemo(
    () => items.filter((item) => item.sectionKey === "now"),
    [items],
  );
  const noveltyItems = useMemo(
    () => items.filter((item) => item.sectionKey !== "now"),
    [items],
  );
  const attentionUnseenItems = useMemo(
    () => attentionItems.filter((item) => !isItemSeen(item.id)),
    [attentionItems, isItemSeen],
  );
  const attentionSeenItems = useMemo(
    () => attentionItems.filter((item) => isItemSeen(item.id)),
    [attentionItems, isItemSeen],
  );
  const noveltyUnseenIds = useMemo(
    () => noveltyItems.filter((item) => !isItemSeen(item.id)).map((item) => item.id),
    [isItemSeen, noveltyItems],
  );
  const visibleAttentionUnseenItems = useMemo(
    () =>
      showAllAttention
        ? attentionUnseenItems
        : attentionUnseenItems.slice(0, ATTENTION_PREVIEW_LIMIT),
    [attentionUnseenItems, showAllAttention],
  );
  const visibleAttentionSeenItems = useMemo(
    () =>
      showAllSeenAttention
        ? attentionSeenItems
        : attentionSeenItems.slice(0, ATTENTION_SEEN_PREVIEW_LIMIT),
    [attentionSeenItems, showAllSeenAttention],
  );
  const visibleNoveltyItems = useMemo(
    () => (showAllNovelties ? noveltyItems : noveltyItems.slice(0, NOVELTY_PREVIEW_LIMIT)),
    [noveltyItems, showAllNovelties],
  );
  const noveltyBuckets = useMemo(() => {
    const groups = {
      today: [] as ActivityItem[],
      week: [] as ActivityItem[],
      older: [] as ActivityItem[],
    };

    for (const item of visibleNoveltyItems) {
      const bucket = classifyActivityDateBucket(item.createdAt ?? item.dueDate ?? null);
      groups[bucket].push(item);
    }

    return (["today", "week", "older"] as const)
      .map((bucket) => ({
        key: bucket,
        label: noveltyBucketLabel(bucket),
        items: groups[bucket],
      }))
      .filter((bucket) => bucket.items.length > 0);
  }, [visibleNoveltyItems]);

  useEffect(() => {
    if (!noveltyUnseenIds.length) return;
    markItemsSeen(noveltyUnseenIds);
  }, [markItemsSeen, noveltyUnseenIds]);

  async function handleAction(item: ActivityItem, href: string) {
    markItemsSeen([item.id]);
    if (item.kind === "garden_change_notice" && item.entityId) {
      try {
        const token = await getSessionAccessToken();
        if (token) {
          await fetch("/api/notices", {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            credentials: "same-origin",
            body: JSON.stringify({ noticeIds: [item.entityId] }),
          });
        }
      } catch {
        // Si falla, el aviso seguira disponible en otra entrada.
      }
    }
    router.push(href);
  }

  if (loading) {
    return <PageLoadingState message="Cargando actividad..." />;
  }

  return (
    <div className="lv-page p-6">
      <div className="lv-shell max-w-5xl space-y-5">
        <section className="lv-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">{ACTIVITY_SURFACE.label}</h1>
              <p className="text-sm text-[var(--lv-text-muted)]">
                Lo que pide entrar vive arriba. Lo demas se queda como novedad leida y agrupada
                por tiempo, sin convertir esto en una lista interminable.
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <ActiveGardenSwitcher
                compact
                onChanged={(gardenId) => {
                  setActiveGardenId(gardenId);
                  void refreshActivity(gardenId);
                }}
              />
              <button
                type="button"
                className="lv-btn lv-btn-secondary"
                onClick={() => router.push(getProductSurfaceHref("home"))}
              >
                Volver
              </button>
            </div>
          </div>

          {msg ? <StatusNotice message={msg} className="mt-4" /> : null}
        </section>

        {!items.length ? (
          <PageStateCard
            title="Todo esta al dia"
            message="Ahora mismo no hay nada que pida atencion ni novedades activas en esta bandeja."
            tone="success"
            actions={[
              {
                label: "Ir a planes",
                onClick: () => router.push(getProductSurfaceHref("plans")),
              },
              {
                label: "Volver al home",
                tone: "secondary",
                onClick: () => router.push(getProductSurfaceHref("home")),
              },
            ]}
          />
        ) : null}

        {attentionItems.length ? (
          <section className="lv-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">
                  Requiere atencion
                  <span className="ml-2 text-sm font-medium text-[var(--lv-text-muted)]">
                    {attentionItems.length}
                  </span>
                </h2>
                <p className="text-sm text-[var(--lv-text-muted)]">
                  {attentionUnseenItems.length > 0
                    ? formatActivityUnseenLabel(attentionUnseenItems.length)
                    : attentionSeenItems.length > 0
                      ? "Todo visto, sigue pendiente"
                      : "Nada activo ahora mismo"}
                </p>
              </div>
              <p className="text-sm text-[var(--lv-text-muted)]">
                Estos items siguen activos hasta que entras o el estado real del jardin se resuelve.
              </p>
            </div>

            {attentionUnseenItems.length ? (
              <div className="mt-4 space-y-3">
                {visibleAttentionUnseenItems.map((item) => {
                  const action = resolveActivityAction(item);
                  return (
                    <ActivityFeedCard
                      key={item.id}
                      item={item}
                      seen={false}
                      actionLabel={action?.label ?? null}
                      actionTone="primary"
                      onAction={action ? () => void handleAction(item, action.href) : null}
                      createdAtLabel={formatActivityDate(item.createdAt)}
                      dueDateLabel={formatActivityDate(item.dueDate)}
                    />
                  );
                })}
                {attentionUnseenItems.length > visibleAttentionUnseenItems.length ? (
                  <button
                    type="button"
                    className="lv-btn lv-btn-secondary"
                    onClick={() => setShowAllAttention(true)}
                  >
                    Ver mas
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-4 py-3 text-sm text-[var(--lv-text-muted)]">
                Nada nuevo por abrir ahora mismo.
              </div>
            )}

            {attentionSeenItems.length ? (
              <div className="mt-5 space-y-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--lv-text-muted)]">
                  Ya visto, sigue pendiente
                </div>
                {visibleAttentionSeenItems.map((item) => {
                  const action = resolveActivityAction(item);
                  return (
                    <ActivityFeedCard
                      key={item.id}
                      item={item}
                      seen
                      actionLabel={action?.label ? "Volver a entrar" : null}
                      actionTone="secondary"
                      onAction={action ? () => void handleAction(item, action.href) : null}
                      createdAtLabel={formatActivityDate(item.createdAt)}
                      dueDateLabel={formatActivityDate(item.dueDate)}
                    />
                  );
                })}
                {attentionSeenItems.length > visibleAttentionSeenItems.length ? (
                  <button
                    type="button"
                    className="lv-btn lv-btn-secondary"
                    onClick={() => setShowAllSeenAttention(true)}
                  >
                    Ver mas
                  </button>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {noveltyItems.length ? (
          <section className="lv-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">
                  Novedades
                  <span className="ml-2 text-sm font-medium text-[var(--lv-text-muted)]">
                    {noveltyItems.length}
                  </span>
                </h2>
                <p className="text-sm text-[var(--lv-text-muted)]">
                  {formatActivityUnseenLabel(unseenCount)}
                </p>
              </div>
              <p className="text-sm text-[var(--lv-text-muted)]">
                Aqui se queda el contexto util del jardin sin obligarte a salir a otra pantalla.
              </p>
            </div>

            <div className="mt-4 space-y-5">
              {noveltyBuckets.map((bucket) => (
                <div key={bucket.key} className="space-y-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--lv-text-muted)]">
                    {bucket.label}
                  </div>
                  {bucket.items.map((item) => (
                    <ActivityFeedCard
                      key={item.id}
                      item={item}
                      seen
                      createdAtLabel={formatActivityDate(item.createdAt)}
                      dueDateLabel={formatActivityDate(item.dueDate)}
                    />
                  ))}
                </div>
              ))}
              {noveltyItems.length > visibleNoveltyItems.length ? (
                <button
                  type="button"
                  className="lv-btn lv-btn-secondary"
                  onClick={() => setShowAllNovelties(true)}
                >
                  Ver mas
                </button>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
