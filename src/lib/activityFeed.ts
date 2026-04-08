import { bondTypeLabel, describeInvitationOutcome } from "@/lib/bonds";
import { buildPlansSeedViews } from "@/lib/plansViewModel";
import {
  ACTIVITY_SECTION_DEFINITIONS,
  ACTIVITY_SECTION_ORDER,
  resolveActivitySectionKey,
} from "@/lib/activityPresentation";
import {
  normalizePreparationCollaborationMode,
  resolvePreparationCollaborationLabel,
} from "@/lib/seedPreparation";
import {
  SEED_PLANNING_DRAFT_STATUS,
  type SeedPreparationProfile,
} from "@/lib/seedPreparationTypes";
import type {
  ActivityItem,
  ActivitySectionKey,
  ActivityItemTone,
} from "@/lib/productDomainContracts";
import type { SeedCalendarConfig } from "@/lib/seedCalendarConfig";
import { isPagePendingCompletion } from "@/lib/pageCompletionState";
import type {
  SeedItem,
  SeedPlaceOption,
  SeedPlanTypeOption,
  SeedRouteOption,
  SeedWateringConfirmation,
} from "@/lib/plansTypes";

export type ActivityPageCandidate = {
  id: string;
  title: string | null;
  date: string | null;
  planned_from_seed_id: string | null;
  cover_photo_url: string | null;
  thumbnail_url: string | null;
  canvas_objects: unknown;
  rating: number | null;
  location_label: string | null;
  mood_state: string | null;
  is_favorite: boolean | null;
};

export type ActivityInvitationCandidate = {
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

export type ActivityMilestoneCandidate = {
  id: string;
  title: string;
  unlockedAt: string | null;
  claimedAt: string | null;
};

export type ActivityNoticeCandidate = {
  id: string;
  title: string;
  message: string | null;
  createdAt: string | null;
};

export type ActivityFlowerRevisionCandidate = {
  id: string;
  pageId: string;
  pageTitle: string | null;
  actorUserId: string | null;
  actorName: string | null;
  changedFields: string[];
  createdAt: string | null;
};

export type ActivityFlowerBirthPendingCandidate = {
  pageId: string;
  pageTitle: string | null;
  seedId: string | null;
  activatedAt: string | null;
};

export type ActivityFeedSection = {
  key: ActivitySectionKey;
  title: string;
  hint: string;
  items: ActivityItem[];
};

type BuildActivityFeedInput = {
  seeds: SeedItem[];
  planTypeOptions: SeedPlanTypeOption[];
  placeOptions: SeedPlaceOption[];
  routeOptions?: SeedRouteOption[];
  wateringConfirmations: SeedWateringConfirmation[];
  currentUserId: string;
  currentUserName?: string | null;
  activeMemberCount: number;
  cfg: SeedCalendarConfig;
  nowDate: string;
  invitations: ActivityInvitationCandidate[];
  notices: ActivityNoticeCandidate[];
  milestones: ActivityMilestoneCandidate[];
  pages: ActivityPageCandidate[];
  flowerRevisions: ActivityFlowerRevisionCandidate[];
  pendingFlowerBirths: ActivityFlowerBirthPendingCandidate[];
  preparationProfiles: SeedPreparationProfile[];
};

export type ActivityFeedResult = {
  items: ActivityItem[];
  sections: ActivityFeedSection[];
  counts: Record<ActivitySectionKey, number>;
};

function withFallbackTitle(value: string | null | undefined, fallback: string) {
  const title = String(value ?? "").trim();
  return title || fallback;
}

function compareAsc(left: string | null | undefined, right: string | null | undefined) {
  return String(left ?? "9999-12-31").localeCompare(String(right ?? "9999-12-31"));
}

function compareDesc(left: string | null | undefined, right: string | null | undefined) {
  return String(right ?? "").localeCompare(String(left ?? ""));
}

function milestoneLabel(title: string) {
  const safe = title.trim();
  return safe || "Hito del recorrido";
}

function invitationBondLabel(value: string | null | undefined) {
  const next = bondTypeLabel(String(value ?? "").trim());
  return `Invitaci\u00f3n de ${next.toLowerCase()}`;
}

function parseDateValue(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isRecentInvitationUpdate(
  value: string | null | undefined,
  nowDate: string,
  maxAgeDays: number,
) {
  const parsed = parseDateValue(value);
  const now = parseDateValue(nowDate) ?? new Date();
  if (!parsed) return false;
  return now.getTime() - parsed.getTime() <= maxAgeDays * 24 * 60 * 60 * 1000;
}

function revisionFieldLabel(field: string) {
  if (field === "summary") return "texto";
  if (field === "plan_type") return "tipo de plan";
  if (field === "favorite") return "favorita";
  if (field === "highlight") return "destacado";
  if (field === "rating") return "estrellas";
  if (field === "canvas") return "lienzo";
  if (field === "location") return "lugar";
  if (field === "audio") return "audio";
  if (field === "cover") return "portada";
  if (field === "reflections") return "miradas";
  return "la flor";
}

function describeFlowerRevisionMessage(candidate: ActivityFlowerRevisionCandidate, currentUserId: string) {
  const actor =
    candidate.actorUserId && candidate.actorUserId === currentUserId
      ? "Tu lado"
      : candidate.actorName?.trim() || "La otra persona";
  const labels = candidate.changedFields.map(revisionFieldLabel);
  if (!labels.length) return `${actor} ha guardado cambios en esta flor.`;
  if (labels.length === 1) return `${actor} ha actualizado ${labels[0]} en esta flor.`;
  if (labels.length === 2) {
    return `${actor} ha actualizado ${labels[0]} y ${labels[1]} en esta flor.`;
  }
  return `${actor} ha actualizado ${labels.slice(0, 2).join(", ")} y ${labels.length - 2} cosa(s) mas en esta flor.`;
}

function sortItemsByTone(items: ActivityItem[], tone: ActivityItemTone) {
  if (tone === "pending") {
    return [...items].sort((left, right) => {
      const dueCompare = compareAsc(left.dueDate, right.dueDate);
      if (dueCompare !== 0) return dueCompare;
      return compareDesc(left.createdAt, right.createdAt);
    });
  }

  return [...items].sort((left, right) => compareDesc(left.createdAt, right.createdAt));
}

function pushActivityItem(items: ActivityItem[], item: Omit<ActivityItem, "sectionKey">) {
  items.push({
    ...item,
    sectionKey: resolveActivitySectionKey(item),
  });
}

export function buildActivityFeed(input: BuildActivityFeedInput): ActivityFeedResult {
  const preparationProfileBySeedId = new Map(
    input.preparationProfiles.map((profile) => [profile.seed_id, profile]),
  );
  const seedViews = buildPlansSeedViews({
    seeds: input.seeds.filter(
      (seed) =>
        seed.status !== input.cfg.defaults.bloomedStatus &&
        seed.status !== SEED_PLANNING_DRAFT_STATUS,
    ),
    planTypeOptions: input.planTypeOptions,
    placeOptions: input.placeOptions,
    routeOptions: input.routeOptions ?? [],
    wateringConfirmations: input.wateringConfirmations,
    currentUserId: input.currentUserId,
    activeMemberCount: input.activeMemberCount,
    cfg: input.cfg,
    nowDate: input.nowDate,
    query: "",
  });

  const items: ActivityItem[] = [];

  for (const seed of input.seeds) {
    if (seed.status !== SEED_PLANNING_DRAFT_STATUS) continue;
    const profile = preparationProfileBySeedId.get(seed.id) ?? null;
    const collaborationMode = normalizePreparationCollaborationMode(
      profile?.collaboration_mode,
    );
    if (collaborationMode !== "shared") continue;

    const title = withFallbackTitle(seed.title, "Plan por preparar");
    pushActivityItem(items, {
      id: `shared-preparation-${seed.id}`,
      kind: "shared_preparation",
      tone: "pending",
      entityKind: "seed",
      entityId: seed.id,
      title: `Preparacion compartida: "${title}"`,
      message: profile?.summary?.trim()
        ? `${profile.summary.trim()} Ya podeis entrar a prepararlo en conjunto desde planes.`
        : `${resolvePreparationCollaborationLabel(collaborationMode)}. Ya podeis entrar a prepararlo en conjunto desde planes.`,
      actionable: true,
      createdAt: profile?.updated_at ?? seed.created_at,
      dueDate: profile?.starts_on ?? null,
    });
  }

  for (const item of seedViews) {
    const title = withFallbackTitle(item.seed.title, "Semilla sin t\u00edtulo");
    if (item.stage === "ready_to_water") {
      pushActivityItem(items, {
        id: `water-seed-${item.seed.id}`,
        kind: "water_seed",
        tone: "pending",
        entityKind: "seed",
        entityId: item.seed.id,
        title: `Riega "${title}"`,
        message:
          item.otherParticipantHasWatered && !item.currentUserHasWatered
            ? "La otra persona ya la reg\u00f3. Si la riegas ahora, empezara el nacimiento compartido de la flor."
            : "Ya pod\u00e9is confirmar juntas esta experiencia para que empiece a brotar la flor.",
        actionable: true,
        createdAt: item.seed.created_at,
        dueDate: item.seed.scheduled_date,
      });
      continue;
    }

    if (item.stage === "waiting_partner") {
      pushActivityItem(items, {
        id: `waiting-partner-${item.seed.id}`,
        kind: "waiting_partner",
        tone: "news",
        entityKind: "seed",
        entityId: item.seed.id,
        title: `Tu parte ya est\u00e1 hecha en "${title}"`,
        message: "Falta la otra persona para que se active el nacimiento compartido de la flor.",
        actionable: false,
        createdAt: item.wateringSummary.lastConfirmedAt ?? item.seed.created_at,
        dueDate: item.seed.scheduled_date,
      });
    }
  }

  const pendingFlowerBirthPageIds = new Set<string>();
  for (const ritual of input.pendingFlowerBirths) {
    const pageId = String(ritual.pageId ?? "").trim();
    if (!pageId) continue;
    pendingFlowerBirthPageIds.add(pageId);
    const title = withFallbackTitle(ritual.pageTitle, "Flor compartida");
    pushActivityItem(items, {
      id: `flower-birth-pending-${pageId}`,
      kind: "flower_birth_pending",
      tone: "pending",
      entityKind: "page",
      entityId: pageId,
      title: `La flor "${title}" ya puede nacer`,
      message:
        "Los dos riegos ya estan completos. Ahora toca entrar al nacimiento compartido antes de empezar a editar la flor.",
      actionable: true,
      createdAt: ritual.activatedAt,
      dueDate: ritual.activatedAt,
    });
  }

  for (const page of input.pages) {
    if (
      pendingFlowerBirthPageIds.has(page.id) ||
      !page.planned_from_seed_id ||
      !isPagePendingCompletion({
        canvasObjects: page.canvas_objects,
        coverPhotoUrl: page.cover_photo_url,
        thumbnailUrl: page.thumbnail_url,
        rating: page.rating,
      })
    ) {
      continue;
    }

    const title = withFallbackTitle(page.title, "Flor sin t\u00edtulo");
    pushActivityItem(items, {
      id: `complete-page-${page.id}`,
      kind: "complete_bloom_page",
      tone: "pending",
      entityKind: "page",
      entityId: page.id,
      title: `Completa la flor "${title}"`,
      message: "La flor ya brot\u00f3. Ahora pod\u00e9is completarla con foto, texto o estrellas.",
      actionable: true,
      createdAt: page.date,
      dueDate: page.date,
    });
  }

  for (const invitation of input.invitations) {
    const isIncomingPending =
      invitation.status === "pending" &&
      String(invitation.invitedByUserId ?? "").trim() !== input.currentUserId;

    if (isIncomingPending) {
      pushActivityItem(items, {
        id: `invitation-${invitation.id}`,
        kind: "garden_invitation",
        tone: "pending",
        entityKind: "garden",
        entityId: invitation.id,
        title: invitationBondLabel(invitation.bondType),
        message:
          "Hay una invitaci\u00f3n pendiente. Si la acept\u00e1is, se crear\u00e1 un jard\u00edn compartido nuevo desde Jardines y v\u00ednculos.",
        actionable: true,
        createdAt: invitation.createdAt,
        dueDate: invitation.expiresAt,
      });
      continue;
    }

    const isOutgoing = String(invitation.invitedByUserId ?? "").trim() === input.currentUserId;
    if (!isOutgoing) continue;
    if (
      invitation.status !== "accepted" &&
      invitation.status !== "rejected" &&
      invitation.status !== "expired"
    ) {
      continue;
    }

    const updateDate =
      invitation.status === "accepted"
        ? invitation.acceptedAt ?? invitation.createdAt
        : invitation.createdAt;
    if (!isRecentInvitationUpdate(updateDate, input.nowDate, 45)) continue;
    const outcome = describeInvitationOutcome({
      bondType: invitation.bondType,
      status: invitation.status,
      isOutgoing: true,
    });

    pushActivityItem(items, {
      id: `invitation-update-${invitation.id}`,
      kind: "garden_invitation",
      tone: invitation.status === "accepted" ? "special" : "news",
      entityKind: "garden",
      entityId: invitation.id,
      title: outcome.title,
      message: `${outcome.detail} Puedes revisarlo desde Jardines y vinculos.`,
      actionable: true,
      createdAt: updateDate,
      dueDate: null,
    });
  }

  for (const notice of input.notices) {
    pushActivityItem(items, {
      id: `notice-${notice.id}`,
      kind: "garden_change_notice",
      tone: "news",
      entityKind: "notice",
      entityId: notice.id,
      title: notice.title,
      message: notice.message,
      actionable: true,
      createdAt: notice.createdAt,
      dueDate: null,
    });
  }

  for (const milestone of input.milestones) {
    if (milestone.claimedAt) continue;

    pushActivityItem(items, {
      id: `milestone-${milestone.id}`,
      kind: "milestone_unlocked",
      tone: "news",
      entityKind: "milestone",
      entityId: milestone.id,
      title: `Hito desbloqueado: ${milestoneLabel(milestone.title)}`,
      message: "Ya est\u00e1 disponible en el recorrido para revisarlo o reclamarlo.",
      actionable: true,
      createdAt: milestone.unlockedAt,
      dueDate: null,
    });
  }

  const seenRevisionPageIds = new Set<string>();
  for (const revision of input.flowerRevisions) {
    const pageId = String(revision.pageId ?? "").trim();
    if (!pageId || seenRevisionPageIds.has(pageId)) continue;
    if (revision.actorUserId && revision.actorUserId === input.currentUserId) continue;
    if (!isRecentInvitationUpdate(revision.createdAt, input.nowDate, 21)) continue;

    seenRevisionPageIds.add(pageId);
    const title = withFallbackTitle(revision.pageTitle, "Flor compartida");
    pushActivityItem(items, {
      id: `flower-revision-${revision.id}`,
      kind: "partner_updated_page",
      tone: "news",
      entityKind: "page",
      entityId: pageId,
      title: `Cambios en "${title}"`,
      message: describeFlowerRevisionMessage(revision, input.currentUserId),
      actionable: true,
      createdAt: revision.createdAt,
      dueDate: null,
    });
  }

  const sections = ACTIVITY_SECTION_ORDER.map((key) => {
    const definition = ACTIVITY_SECTION_DEFINITIONS[key];
    const sectionItems = items.filter((item) => item.sectionKey === key);
    const sortTone: ActivityItemTone = key === "now" ? "pending" : "news";

    return {
      key,
      title: definition.title,
      hint: definition.hint,
      items: sortItemsByTone(sectionItems, sortTone),
    } satisfies ActivityFeedSection;
  }).filter((section) => section.items.length > 0);

  return {
    items,
    sections,
    counts: {
      now: items.filter((item) => item.sectionKey === "now").length,
      review: items.filter((item) => item.sectionKey === "review").length,
      news: items.filter((item) => item.sectionKey === "news").length,
    },
  };
}
