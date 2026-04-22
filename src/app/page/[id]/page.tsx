"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import type { CanvasObject } from "@/lib/canvasTypes";
// care system deprecated - only mood_state retained as page metadata
type CareMood = "wilted" | "healthy" | "shiny";
import { getMyProfile } from "@/lib/auth";
import { type CanvasEditorHandle } from "@/components/canvas/CanvasEditor";
import { useGardenCompanionLabel } from "@/components/chat/useGardenCompanionLabel";
import {
  resolveActiveGardenIdForUser,
  setActiveGardenIdForUser,
  isSchemaNotReadyError,
  withGardenIdOnInsert,
  withGardenScope,
} from "@/lib/gardens";
// care logic deprecated — mood thresholds kept inline for backward compat
type MoodThreshold = { mood: CareMood; minScore: number; maxScore: number; anchorScore: number };
const MOOD_THRESHOLDS: MoodThreshold[] = [
  { mood: "wilted", minScore: 0, maxScore: 34, anchorScore: 20 },
  { mood: "healthy", minScore: 35, maxScore: 74, anchorScore: 55 },
  { mood: "shiny", minScore: 75, maxScore: 100, anchorScore: 85 },
];

function flowerRevisionFieldLabel(field: string) {
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

function describeRemoteFlowerRevisionNotice(
  revision: FlowerPageRevisionRow,
  currentUserId: string | null | undefined,
) {
  const actor =
    revision.actor_user_id && revision.actor_user_id === String(currentUserId ?? "").trim()
      ? "Tu lado"
      : revision.actor_name?.trim() || "La otra persona";
  const labels = revision.summary.changedFields.map(flowerRevisionFieldLabel);
  if (!labels.length) {
    return `${actor} ha guardado cambios en esta flor. Revisa la huella reciente si quieres ver el detalle.`;
  }
  if (labels.length === 1) {
    return `${actor} ha actualizado ${labels[0]} en esta flor.`;
  }
  if (labels.length === 2) {
    return `${actor} ha actualizado ${labels[0]} y ${labels[1]} en esta flor.`;
  }
  return `${actor} ha actualizado ${labels.slice(0, 2).join(", ")} y ${labels.length - 2} cosa(s) mas en esta flor.`;
}

import { getCatalogItems } from "@/lib/appConfig";
import { PageDetailCanvasSection } from "@/components/pageDetail/PageDetailCanvasSection";
import { PageContextSummarySection } from "@/components/pageDetail/PageContextSummarySection";
import { PageDetailDialogs } from "@/components/pageDetail/PageDetailDialogs";
import { PageDetailMainPanel } from "@/components/pageDetail/PageDetailMainPanel";
import { FlowerBirthPendingPanel } from "@/components/pageDetail/FlowerBirthPendingPanel";
import { PageRevisionHistoryPanel } from "@/components/pageDetail/PageRevisionHistoryPanel";
import { PageAudioCard } from "@/components/pageDetail/PageAudioCard";
import { PageLocationCard } from "@/components/pageDetail/PageLocationCard";
import { PageLocationMapPickerDialog } from "@/components/pageDetail/PageLocationMapPickerDialog";
import { PageReflectionsPanel } from "@/components/pageDetail/PageReflectionsPanel";
import { cancelPageDetailEdit } from "@/components/pageDetail/cancelPageDetailEdit";
import { savePageDetail } from "@/components/pageDetail/savePageDetail";
import { usePageAudioController } from "@/components/pageDetail/usePageAudioController";
import { usePageFlowerBirthData } from "@/components/pageDetail/usePageFlowerBirthData";
import { usePageDetailMutations } from "@/components/pageDetail/usePageDetailMutations";
import { usePageFlowerBirthRitual } from "@/components/pageDetail/usePageFlowerBirthRitual";
import { usePageGardenMembers } from "@/components/pageDetail/usePageGardenMembers";
import { usePageLocationSearch } from "@/components/pageDetail/usePageLocationSearch";
import { usePageSeedContext } from "@/components/pageDetail/usePageSeedContext";
import { usePageSharedPresenceLabels } from "@/components/pageDetail/usePageSharedPresenceLabels";
import { usePageSharedTargetPresence } from "@/components/pageDetail/usePageSharedTargetPresence";
import { usePageUnsavedLeaveGuard } from "@/components/pageDetail/usePageUnsavedLeaveGuard";
import { usePageUploadTaskChannels } from "@/components/pageDetail/usePageUploadTaskChannels";
import { usePageYearHighlights } from "@/components/pageDetail/usePageYearHighlights";
import { ChatShareButton } from "@/components/chat/ChatShareButton";
import {
  FALLBACK_PLAN_TYPE_PRESETS,
  getFallbackPlanTypeOptions,
  mapGardenPlanTypeRow,
  type PlanTypeOption,
} from "@/lib/planTypeCatalog";
import { deleteManagedMediaBatchForPage } from "@/lib/deleteManagedMedia";
import { buildPageVisualSnapshot } from "@/lib/pageVisualSnapshot";
import {
  buildPageVisualSnapshotFromState,
  loadPageVisualStates,
  type PageVisualState,
} from "@/lib/pageVisualState";
import { uploadPagePhoto } from "@/lib/uploadPhoto";
import {
  getErrorMessage,
  loadPageRecordWithFallback,
  toMoodThresholds,
} from "@/lib/pageDetailUtils";
import { collectManagedPageMediaUrls } from "@/lib/pageManagedMedia";
import {
  buildFlowerBirthRitualSnapshot,
  serializeFlowerBirthRitualSnapshot,
  type FlowerBirthRitualRatingRow,
  type FlowerBirthRitualSnapshot,
} from "@/lib/flowerBirthRitual";
import {
  buildFlowerPagePersistedSnapshot,
  buildFlowerPageRevisionSummary,
  hasFlowerPageRevisionChanges,
  type FlowerPagePersistedSnapshot,
  type FlowerPageRevisionRow,
} from "@/lib/flowerPageRevision";
import {
  getFallbackFlowerRuntimeConfig,
  getFlowerRuntimeConfig,
  type FlowerRuntimeConfig,
} from "@/lib/flowerRuntimeConfig";
import {
  getFallbackFlowerPageLayoutConfig,
  getFlowerPageLayoutConfig,
  type FlowerPageLayoutConfig,
} from "@/lib/flowerPageLayoutConfig";
import {
  normalizePageRow,
  type PageRow,
} from "@/lib/pageDetailTypes";
import { derivePageCompletionState } from "@/lib/pageCompletionState";
import {
  resolveSharedGardenRequiredParticipants,
  sharedGardenRitualChannelName,
  type SharedGardenParticipantPresence,
} from "@/lib/sharedGardenSessions";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type PageSavedSnapshot = {
  canvasObjectsJson: string;
  rating: number;
  planSummary: string;
  planTypeId: string;
  isFavorite: boolean;
  isYearHighlight: boolean;
  locationLabel: string;
  locationLat: string;
  locationLng: string;
  audioUrl: string;
  audioLabel: string;
  coverPhotoUrl: string;
  managedMediaUrls: string[];
};

type PageReflectionDraft = {
  favoritePart: string;
  rememberedMoment: string;
  whatIFelt: string;
  whatItMeantToMe: string;
  whatIDiscoveredAboutYou: string;
  smallPromise: string;
};

type MemoryReflectionRow = {
  id: string;
  user_id: string;
  favorite_part: string | null;
  remembered_moment: string | null;
  what_i_felt: string | null;
  what_it_meant_to_me: string | null;
  what_i_discovered_about_you: string | null;
  small_promise: string | null;
};

async function ensureGardenPlanTypes(input: {
  gardenId: string | null;
  profileId: string;
}) {
  if (!input.gardenId || !input.profileId) return;

  const rows = FALLBACK_PLAN_TYPE_PRESETS.map((item) =>
    withGardenIdOnInsert(
      {
        code: item.code,
        label: item.label,
        category: item.category,
        description: item.description,
        suggested_element: item.suggestedElement,
        icon_emoji: item.iconEmoji,
        flower_asset_path: null,
        seed_asset_path: null,
        is_custom: false,
        sort_order: item.sortOrder,
        created_by_user_id: input.profileId,
      },
      input.gardenId,
    ),
  );

  const { error } = await supabase
    .from("garden_plan_types")
    .upsert(rows, { onConflict: "garden_id,code", ignoreDuplicates: true });

  if (error && !isSchemaNotReadyError(error)) {
    throw new Error(error.message || "No se pudo preparar la biblioteca de tipos de plan.");
  }
}

const EMPTY_REFLECTION_DRAFT: PageReflectionDraft = {
  favoritePart: "",
  rememberedMoment: "",
  whatIFelt: "",
  whatItMeantToMe: "",
  whatIDiscoveredAboutYou: "",
  smallPromise: "",
};

function normalizeSnapshotText(value: string | null | undefined) {
  return String(value ?? "").trim();
}

function parseSnapshotCanvasObjects(snapshot: PageSavedSnapshot | null) {
  if (!snapshot?.canvasObjectsJson) return [];
  try {
    const parsed = JSON.parse(snapshot.canvasObjectsJson);
    return Array.isArray(parsed) ? (parsed as CanvasObject[]) : [];
  } catch {
    return [];
  }
}

function buildPageSavedSnapshot(input: {
  objects: CanvasObject[];
  rating: number;
  planSummary: string | null | undefined;
  planTypeId: string | null | undefined;
  isFavorite: boolean | null | undefined;
  isYearHighlight: boolean | null | undefined;
  locationLabel: string;
  locationLat: string;
  locationLng: string;
  audioUrl: string;
  audioLabel: string;
  coverPhotoUrl: string | null | undefined;
}) {
  return {
    canvasObjectsJson: JSON.stringify(input.objects ?? []),
    rating: Number.isFinite(input.rating) ? input.rating : 0,
    planSummary: normalizeSnapshotText(input.planSummary),
    planTypeId: normalizeSnapshotText(input.planTypeId),
    isFavorite: input.isFavorite === true,
    isYearHighlight: input.isYearHighlight === true,
    locationLabel: normalizeSnapshotText(input.locationLabel),
    locationLat: normalizeSnapshotText(input.locationLat),
    locationLng: normalizeSnapshotText(input.locationLng),
    audioUrl: normalizeSnapshotText(input.audioUrl),
    audioLabel: normalizeSnapshotText(input.audioLabel),
    coverPhotoUrl: normalizeSnapshotText(input.coverPhotoUrl),
    managedMediaUrls: collectManagedPageMediaUrls({
      audioUrl: input.audioUrl,
      coverPhotoUrl: input.coverPhotoUrl,
      canvasObjects: input.objects,
    }).sort(),
  } satisfies PageSavedSnapshot;
}

function isSameSavedSnapshot(a: PageSavedSnapshot | null, b: PageSavedSnapshot | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.canvasObjectsJson === b.canvasObjectsJson &&
    a.rating === b.rating &&
    a.planSummary === b.planSummary &&
    a.planTypeId === b.planTypeId &&
    a.isFavorite === b.isFavorite &&
    a.isYearHighlight === b.isYearHighlight &&
    a.locationLabel === b.locationLabel &&
    a.locationLat === b.locationLat &&
    a.locationLng === b.locationLng &&
    a.audioUrl === b.audioUrl &&
    a.audioLabel === b.audioLabel &&
    a.coverPhotoUrl === b.coverPhotoUrl &&
    a.managedMediaUrls.length === b.managedMediaUrls.length &&
    a.managedMediaUrls.every((value, index) => value === b.managedMediaUrls[index])
  );
}

function patchSavedSnapshot(
  snapshot: PageSavedSnapshot | null,
  patch: Partial<
    Pick<
      PageSavedSnapshot,
      "audioUrl" | "audioLabel" | "coverPhotoUrl" | "isFavorite" | "isYearHighlight"
    >
  >,
) {
  if (!snapshot) return snapshot;

  const nextSnapshot: PageSavedSnapshot = {
    ...snapshot,
    ...patch,
  };
  const savedObjects = parseSnapshotCanvasObjects(snapshot);

  nextSnapshot.managedMediaUrls = collectManagedPageMediaUrls({
    audioUrl: nextSnapshot.audioUrl,
    coverPhotoUrl: nextSnapshot.coverPhotoUrl,
    canvasObjects: savedObjects,
  }).sort();

  return nextSnapshot;
}

function flowerPresenceColor(userId: string) {
  const palette = ["#d97706", "#0f766e", "#7c3aed", "#dc2626", "#2563eb", "#15803d"];
  let hash = 0;
  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash * 31 + userId.charCodeAt(index)) >>> 0;
  }
  return palette[hash % palette.length] ?? "#0f766e";
}

function normalizeReflectionText(value: unknown) {
  return String(value ?? "").trim();
}

function serializeReflectionDraft(draft: PageReflectionDraft) {
  return JSON.stringify({
    favoritePart: normalizeReflectionText(draft.favoritePart),
    rememberedMoment: normalizeReflectionText(draft.rememberedMoment),
    whatIFelt: normalizeReflectionText(draft.whatIFelt),
    whatItMeantToMe: normalizeReflectionText(draft.whatItMeantToMe),
    whatIDiscoveredAboutYou: normalizeReflectionText(draft.whatIDiscoveredAboutYou),
    smallPromise: normalizeReflectionText(draft.smallPromise),
  });
}

function deserializeReflectionDraft(serialized: string | null | undefined): PageReflectionDraft {
  if (!serialized) return { ...EMPTY_REFLECTION_DRAFT };

  try {
    const parsed = JSON.parse(serialized) as Partial<PageReflectionDraft>;
    return {
      favoritePart: normalizeReflectionText(parsed.favoritePart),
      rememberedMoment: normalizeReflectionText(parsed.rememberedMoment),
      whatIFelt: normalizeReflectionText(parsed.whatIFelt),
      whatItMeantToMe: normalizeReflectionText(parsed.whatItMeantToMe),
      whatIDiscoveredAboutYou: normalizeReflectionText(parsed.whatIDiscoveredAboutYou),
      smallPromise: normalizeReflectionText(parsed.smallPromise),
    };
  } catch {
    return { ...EMPTY_REFLECTION_DRAFT };
  }
}

function toReflectionDraft(
  row?: MemoryReflectionRow | null,
): PageReflectionDraft {
  if (!row) return { ...EMPTY_REFLECTION_DRAFT };
  return {
    favoritePart: normalizeReflectionText(row.favorite_part),
    rememberedMoment: normalizeReflectionText(row.remembered_moment),
    whatIFelt: normalizeReflectionText(row.what_i_felt),
    whatItMeantToMe: normalizeReflectionText(row.what_it_meant_to_me),
    whatIDiscoveredAboutYou: normalizeReflectionText(row.what_i_discovered_about_you),
    smallPromise: normalizeReflectionText(row.small_promise),
  };
}

export default function PageDetail() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;

  const [page, setPage] = useState<PageRow | null>(null);
  const [objects, setObjects] = useState<CanvasObject[]>([]);

  const [saving, setSaving] = useState(false);
  const [deletingPage, setDeletingPage] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [sharingToChat, setSharingToChat] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [moodState, setMoodState] = useState<CareMood>("healthy");
  const [myProfileId, setMyProfileId] = useState<string>("");
  const [locationFieldsAvailable, setLocationFieldsAvailable] = useState(true);
  const [, setMoodThresholds] = useState<MoodThreshold[]>([]);
  const [activeGardenId, setActiveGardenId] = useState<string | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showExternalAudioModal, setShowExternalAudioModal] = useState(false);
  const [externalAudioDraft, setExternalAudioDraft] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState<PageSavedSnapshot | null>(null);
  const [savedReflectionJson, setSavedReflectionJson] = useState(
    serializeReflectionDraft(EMPTY_REFLECTION_DRAFT),
  );
  const [myReflectionDraft, setMyReflectionDraft] =
    useState<PageReflectionDraft>(EMPTY_REFLECTION_DRAFT);
  const [reflections, setReflections] = useState<MemoryReflectionRow[]>([]);
  const [reflectionFieldsAvailable, setReflectionFieldsAvailable] = useState(true);
  const [myProfileName, setMyProfileName] = useState("Tu mirada");
  const [flowerRuntimeConfig, setFlowerRuntimeConfig] = useState<FlowerRuntimeConfig>(
    getFallbackFlowerRuntimeConfig(),
  );
  const [flowerPageLayoutConfig, setFlowerPageLayoutConfig] =
    useState<FlowerPageLayoutConfig>(getFallbackFlowerPageLayoutConfig());
  const [pageMode, setPageMode] = useState<"read" | "edit">("read");
  const [detailSection, setDetailSection] = useState<"canvas" | "reflections" | "context">(
    "canvas",
  );
  const [contextSection, setContextSection] = useState<"location" | "audio" | "video">("location");
  const [showLocationMapPicker, setShowLocationMapPicker] = useState(false);
  const [pageSecondaryDataReady, setPageSecondaryDataReady] = useState(false);
  const [planTypeOptions, setPlanTypeOptions] = useState<PlanTypeOption[]>(
    getFallbackPlanTypeOptions(),
  );
  const [changingPlanType, setChangingPlanType] = useState(false);
  const [persistedPageVisualState, setPersistedPageVisualState] =
    useState<PageVisualState | null>(null);
  const [uploadingCoverPhoto, setUploadingCoverPhoto] = useState(false);
  const canvasRef = useRef<CanvasEditorHandle | null>(null);

  const { companionReference } = useGardenCompanionLabel(activeGardenId, myProfileId || null);
  const currentRevisionSnapshotRef = useRef<FlowerPagePersistedSnapshot | null>(null);
  const recordFlowerRevisionRef = useRef<
    ((previousSnapshot: FlowerPagePersistedSnapshot | null, nextSnapshot: FlowerPagePersistedSnapshot) => Promise<void>) | null
  >(null);
  const {
    locationLabel,
    locationLat,
    locationLng,
    clearSelectedLocation,
    applyLoadedLocation,
  } = usePageLocationSearch({
    locationFieldsAvailable,
  });
  const pagesTable = () => withGardenScope(supabase.from("pages"), activeGardenId);
  const seedsTable = () => withGardenScope(supabase.from("seeds"), activeGardenId);
  const ritualQuery = String(searchParams?.get("ritual") ?? "").trim().toLowerCase();
  const ritualRequested = ritualQuery === "flower_birth";
  const currentReflectionJson = useMemo(
    () => serializeReflectionDraft(myReflectionDraft),
    [myReflectionDraft],
  );
  const currentReflectionJsonRef = useRef(currentReflectionJson);
  const savedReflectionJsonRef = useRef(savedReflectionJson);
  useEffect(() => {
    currentReflectionJsonRef.current = currentReflectionJson;
  }, [currentReflectionJson]);
  useEffect(() => {
    savedReflectionJsonRef.current = savedReflectionJson;
  }, [savedReflectionJson]);
  const {
    flowerBirthRatings,
    flowerBirthRatingsAvailable,
    flowerBirthRitual,
    flowerBirthRitualAvailable,
    flowerRevisions,
    flowerRevisionsAvailable,
    refreshFlowerBirthRatings,
    refreshFlowerBirthRitual,
    refreshFlowerRevisions,
    savedFlowerBirthRating,
    setFlowerBirthRatings,
    setFlowerBirthRatingsAvailable,
    setFlowerBirthRitual,
    setFlowerRevisionsAvailable,
    setSavedFlowerBirthRating,
  } = usePageFlowerBirthData({
    activeGardenId,
    loadRitualData: pageSecondaryDataReady || ritualRequested,
    loadSecondaryData: pageSecondaryDataReady || ritualRequested,
    myProfileId,
    pageId: page?.id ?? null,
  });
  const flowerBirthRitualPending =
    ritualRequested || Boolean(flowerBirthRitual && !flowerBirthRitual.completed_at);
  const shouldLoadPageAncillaryData =
    pageSecondaryDataReady || pageMode === "edit" || detailSection === "context" || detailSection === "reflections";
  const { seedContext, setSeedContext } = usePageSeedContext({
    activeGardenId,
    enabled: Boolean(page?.id && activeGardenId) || ritualRequested,
    page,
  });
  const { activeGardenMemberCount, activeGardenMemberCountLoaded, memberNamesById } = usePageGardenMembers({
    activeGardenId,
    enabled: flowerBirthRitualPending || detailSection === "reflections",
  });
  const chatShareRecipientLabel = useMemo(() => {
    const currentProfileId = String(myProfileId ?? "").trim();
    for (const [userId, name] of Object.entries(memberNamesById)) {
      if (userId === currentProfileId) continue;
      const normalizedName = String(name ?? "").trim();
      if (normalizedName) return normalizedName.split(/\s+/)[0] || normalizedName;
    }
    return "la otra persona";
  }, [memberNamesById, myProfileId]);
  const pagePlanTypeId = useMemo(
    () => String(page?.plan_type_id ?? "").trim() || null,
    [page?.plan_type_id],
  );
  const pagePlanTypeOption = useMemo(() => {
    if (!pagePlanTypeId) return null;
    return planTypeOptions.find((option) => option.id === pagePlanTypeId) ?? null;
  }, [pagePlanTypeId, planTypeOptions]);
  const fallbackPlanTypeOption = useMemo(() => {
    const candidateId = pagePlanTypeId || String(seedContext.planTypeId ?? "").trim() || null;
    if (!candidateId) return null;
    return planTypeOptions.find((option) => option.id === candidateId) ?? null;
  }, [pagePlanTypeId, planTypeOptions, seedContext.planTypeId]);
  const resolvedSeedContext = useMemo(
    () => ({
      ...seedContext,
      planTypeId:
        pagePlanTypeId ??
        seedContext.planTypeId ??
        pagePlanTypeOption?.id ??
        fallbackPlanTypeOption?.id ??
        null,
      planTypeLabel:
        pagePlanTypeOption?.label ??
        seedContext.planTypeLabel ??
        fallbackPlanTypeOption?.label ??
        null,
      planTypeCategory:
        pagePlanTypeOption?.category ??
        seedContext.planTypeCategory ??
        fallbackPlanTypeOption?.category ??
        null,
      planTypeFlowerFamily:
        pagePlanTypeOption?.flowerFamily ??
        seedContext.planTypeFlowerFamily ??
        fallbackPlanTypeOption?.flowerFamily ??
        null,
      planTypeFlowerAssetPath:
        pagePlanTypeOption?.flowerAssetPath ??
        seedContext.planTypeFlowerAssetPath ??
        fallbackPlanTypeOption?.flowerAssetPath ??
        null,
      planTypeFlowerBuilderConfig:
        pagePlanTypeOption?.flowerBuilderConfig ??
        seedContext.planTypeFlowerBuilderConfig ??
        fallbackPlanTypeOption?.flowerBuilderConfig ??
        null,
      planTypeSuggestedElement:
        pagePlanTypeOption?.suggestedElement ??
        seedContext.planTypeSuggestedElement ??
        fallbackPlanTypeOption?.suggestedElement ??
        null,
    }),
    [fallbackPlanTypeOption, pagePlanTypeId, pagePlanTypeOption, seedContext],
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!page?.id || !activeGardenId) {
      const frameId = window.requestAnimationFrame(() => {
        setPageSecondaryDataReady(false);
      });
      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }

    const resetFrameId = window.requestAnimationFrame(() => {
      setPageSecondaryDataReady(false);
    });
    const timeoutId = window.setTimeout(() => {
      setPageSecondaryDataReady(true);
    }, 150);
    return () => {
      window.cancelAnimationFrame(resetFrameId);
      window.clearTimeout(timeoutId);
    };
  }, [activeGardenId, page?.id]);
  const {
    activateSharedTarget,
    activeSharedTarget,
    clearSharedTarget,
    markCanvasInteraction,
    markRatingInteraction,
    pulseSharedTarget,
  } = usePageSharedTargetPresence({
    contextSection,
    detailSection,
    flowerBirthRitualPending,
    showExternalAudioModal,
    showLocationMapPicker,
  });
  const refreshReflections = useCallback(
    async (options?: { syncMyDraft?: boolean }) => {
      if (!page?.id || !activeGardenId || !myProfileId) return false;

      const reflectionsQuery = withGardenScope(
        supabase
          .from("memory_reflections")
          .select(
            "id,user_id,favorite_part,remembered_moment,what_i_felt,what_it_meant_to_me,what_i_discovered_about_you,small_promise",
          )
          .eq("page_id", page.id),
        activeGardenId,
      );

      const { data: reflectionRows, error: reflectionError } = await reflectionsQuery;

      if (reflectionError) {
        if (isSchemaNotReadyError(reflectionError)) {
          setReflectionFieldsAvailable(false);
          setReflections([]);
          if (options?.syncMyDraft) {
            setMyReflectionDraft({ ...EMPTY_REFLECTION_DRAFT });
            setSavedReflectionJson(serializeReflectionDraft(EMPTY_REFLECTION_DRAFT));
          }
          return false;
        }
        console.warn("[page/detail] no se pudieron cargar memory_reflections:", reflectionError);
        return false;
      }

      const normalizedReflections = (
        ((reflectionRows as MemoryReflectionRow[] | null) ?? []).map((row) => ({
          id: String(row.id ?? "").trim(),
          user_id: String(row.user_id ?? "").trim(),
          favorite_part: normalizeReflectionText(row.favorite_part) || null,
          remembered_moment: normalizeReflectionText(row.remembered_moment) || null,
          what_i_felt: normalizeReflectionText(row.what_i_felt) || null,
          what_it_meant_to_me: normalizeReflectionText(row.what_it_meant_to_me) || null,
          what_i_discovered_about_you:
            normalizeReflectionText(row.what_i_discovered_about_you) || null,
          small_promise: normalizeReflectionText(row.small_promise) || null,
        }))
      ).filter((row) => row.id && row.user_id);

      setReflectionFieldsAvailable(true);
      setReflections(normalizedReflections);

      if (options?.syncMyDraft) {
        const myReflection = normalizedReflections.find((row) => row.user_id === myProfileId) ?? null;
        const draft = toReflectionDraft(myReflection);
        const serializedDraft = serializeReflectionDraft(draft);
        const canReplaceLocalDraft =
          currentReflectionJsonRef.current === savedReflectionJsonRef.current;
        if (canReplaceLocalDraft) {
          setMyReflectionDraft(draft);
        }
        setSavedReflectionJson(serializedDraft);
      }

      return true;
    },
    [activeGardenId, myProfileId, page?.id],
  );
  const recordFlowerRevision = useCallback(
    async (
      previousSnapshot: ReturnType<typeof buildFlowerPagePersistedSnapshot> | null,
      nextSnapshot: ReturnType<typeof buildFlowerPagePersistedSnapshot>,
    ) => {
      if (!page?.id || !activeGardenId) return;
      const revisionSummary = buildFlowerPageRevisionSummary(previousSnapshot, nextSnapshot);
      if (!hasFlowerPageRevisionChanges(revisionSummary)) return;

      const revisionPayload = withGardenIdOnInsert(
        {
          page_id: page.id,
          snapshot: nextSnapshot,
          summary: revisionSummary,
          actor_user_id: myProfileId || null,
          actor_name: myProfileName.trim() || null,
        },
        activeGardenId,
      );
      const { error: revisionError } = await supabase
        .from("flower_page_revisions")
        .insert(revisionPayload);

      if (revisionError) {
        if (isSchemaNotReadyError(revisionError)) {
          setFlowerRevisionsAvailable(false);
        } else {
          console.warn("[page/detail] no se pudo registrar flower_page_revision:", revisionError);
        }
        return;
      }

      setFlowerRevisionsAvailable(true);
      await refreshFlowerRevisions();
    },
    [activeGardenId, myProfileId, myProfileName, page?.id, refreshFlowerRevisions],
  );
  const recordCurrentPageYearHighlightChange = useCallback((nextIsYearHighlight: boolean) => {
    const previousRevisionSnapshot = currentRevisionSnapshotRef.current;
    if (!previousRevisionSnapshot) return;

    const nextRevisionSnapshot: FlowerPagePersistedSnapshot = {
      ...previousRevisionSnapshot,
      isYearHighlight: nextIsYearHighlight,
    };
    void recordFlowerRevisionRef.current?.(previousRevisionSnapshot, nextRevisionSnapshot);
  }, []);
  const {
    applyCurrentPageYearHighlight,
    canToggleYearHighlight,
    closeYearHighlightReplaceModal,
    currentPageHighlightTitle,
    isYearHighlight,
    pageYear,
    replaceYearHighlightWithCurrentPage,
    showYearHighlightReplaceModal,
    toggleYearHighlight,
    updatingYearHighlight,
    yearHighlightDialogItems,
  } = usePageYearHighlights({
    activeGardenId,
    enabled: pageSecondaryDataReady,
    pageId: page?.id ?? null,
    pageDate: page?.date ?? null,
    pageTitle: page?.title ?? null,
    onSetMessage: setMsg,
    onBeforeToggleHighlight: () => pulseSharedTarget("highlight"),
    onPersistCurrentPageIsYearHighlight: recordCurrentPageYearHighlightChange,
  });
  useEffect(() => {
    setSavedSnapshot((prev) => {
      if (!prev || prev.isYearHighlight === isYearHighlight) return prev;
      return {
        ...prev,
        isYearHighlight,
      };
    });
  }, [isYearHighlight]);
  const videoObjectsCount = useMemo(
    () => objects.filter((object) => object.type === "video").length,
    [objects],
  );

  useEffect(() => {
    if (!shouldLoadPageAncillaryData) return;
    let cancelled = false;

    void getFlowerRuntimeConfig().then((nextConfig) => {
      if (cancelled) return;
      setFlowerRuntimeConfig(nextConfig);
    });

    void getFlowerPageLayoutConfig().then((nextConfig) => {
      if (cancelled) return;
      setFlowerPageLayoutConfig(nextConfig);
    });

    return () => {
      cancelled = true;
    };
  }, [shouldLoadPageAncillaryData]);

  const {
    audioUrl,
    audioLabel,
    setAudioLabel,
    audioFieldsAvailable,
    setAudioFieldsAvailable,
    uploadingAudio,
    audioUploadPercent,
    audioUploadLoaded,
    audioUploadTotal,
    audioUploadEtaMs,
    audioUploadStatusLabel,
    audioQueue,
    activeAudioItem,
    failedAudioItem,
    audioUploadError,
    audioQueueInfo,
    isRecordingAudio,
    canRecordAudio,
    applyLoadedAudio,
    enqueueAudioFiles,
    startAudioRecording,
    stopAudioRecording,
    cancelCurrentAudioUpload,
    retryFailedAudioUpload,
    clearAudioUploadQueue,
    clearAudio,
    saveExternalAudioUrl,
  } = usePageAudioController({
    pageId: id,
    hasPage: Boolean(page),
    updatePage: updatePageAudioFields,
    onPatchPage: patchPageAudio,
    onMessage: setMsg,
  });
  const {
    canvasPhotoUploadState,
    canvasVideoUploadState,
    uploadTaskChannels,
    handleCanvasPhotoUploadStateChange,
    handleCanvasVideoUploadStateChange,
  } = usePageUploadTaskChannels({
    uploadingAudio,
    audioUploadPercent,
    audioUploadLoaded,
    audioUploadTotal,
    audioUploadEtaMs,
    activeAudioFileName: activeAudioItem?.file.name ?? null,
    audioQueueLength: audioQueue.length,
    failedAudioFileName: failedAudioItem?.file.name ?? null,
    audioUploadError,
    audioQueueInfo,
    audioUploadStatusLabel,
    cancelCurrentAudioUpload,
    retryFailedAudioUpload,
    clearAudioUploadQueue,
  });
  const { localSharedFocusLabel, localSharedActivityLabel } = usePageSharedPresenceLabels({
    activeSharedTarget,
    saving,
    changingPlanType,
    uploadingCoverPhoto,
    uploadingAudio,
    uploadingCanvasPhoto: canvasPhotoUploadState?.uploading === true,
    uploadingCanvasVideo: canvasVideoUploadState?.uploading === true,
  });
  const pageCompletionState = useMemo(() => {
    return derivePageCompletionState({
      canvasObjects: objects,
      rating,
      planSummary: page?.plan_summary ?? "",
      audioUrl,
      coverPhotoUrl: page?.cover_photo_url ?? null,
    });
  }, [audioUrl, objects, page?.cover_photo_url, page?.plan_summary, rating]);
  const readMode = pageMode === "read";

  const currentSnapshot = useMemo(() => {
    if (!page) return null;
    return buildPageSavedSnapshot({
      objects,
      rating,
      planSummary: page.plan_summary ?? "",
      planTypeId: page.plan_type_id ?? null,
      isFavorite: page.is_favorite,
      isYearHighlight,
      locationLabel,
      locationLat,
      locationLng,
      audioUrl,
      audioLabel,
      coverPhotoUrl: page.cover_photo_url ?? null,
    });
  }, [
    audioLabel,
    audioUrl,
    isYearHighlight,
    locationLabel,
    locationLat,
    locationLng,
    objects,
    page,
    rating,
  ]);
  const savedRevisionSnapshot = useMemo(() => {
    if (!page || !savedSnapshot) return null;
    return buildFlowerPagePersistedSnapshot({
      planSummary: savedSnapshot.planSummary,
      planTypeId: savedSnapshot.planTypeId,
      isFavorite: savedSnapshot.isFavorite,
      isYearHighlight: savedSnapshot.isYearHighlight,
      rating: savedSnapshot.rating,
      canvasObjects: parseSnapshotCanvasObjects(savedSnapshot),
      locationLabel: savedSnapshot.locationLabel,
      locationLat: savedSnapshot.locationLat,
      locationLng: savedSnapshot.locationLng,
      audioUrl: savedSnapshot.audioUrl,
      audioLabel: savedSnapshot.audioLabel,
      coverPhotoUrl: savedSnapshot.coverPhotoUrl,
      reflectionJson: savedReflectionJson,
    });
  }, [page, savedReflectionJson, savedSnapshot]);
  const currentRevisionSnapshot = useMemo(() => {
    if (!page || !currentSnapshot) return null;
    return buildFlowerPagePersistedSnapshot({
      planSummary: page.plan_summary ?? "",
      planTypeId: page.plan_type_id ?? null,
      isFavorite: page.is_favorite,
      isYearHighlight,
      rating,
      canvasObjects: objects,
      locationLabel,
      locationLat,
      locationLng,
      audioUrl,
      audioLabel,
      coverPhotoUrl: page.cover_photo_url ?? null,
      reflectionJson: currentReflectionJson,
    });
  }, [
    audioLabel,
    audioUrl,
    currentReflectionJson,
    currentSnapshot,
    isYearHighlight,
    locationLabel,
    locationLat,
    locationLng,
    objects,
    page,
    rating,
  ]);
  const liveRevisionSummary = useMemo(
    () =>
      currentRevisionSnapshot
        ? buildFlowerPageRevisionSummary(savedRevisionSnapshot, currentRevisionSnapshot)
        : null,
    [currentRevisionSnapshot, savedRevisionSnapshot],
  );
  useEffect(() => {
    currentRevisionSnapshotRef.current = currentRevisionSnapshot;
  }, [currentRevisionSnapshot]);
  useEffect(() => {
    recordFlowerRevisionRef.current = recordFlowerRevision;
  }, [recordFlowerRevision]);
  const localFlowerBirthRating = useMemo(
    () =>
      myProfileId
        ? flowerBirthRatings.find((entry) => entry.user_id === myProfileId)?.rating ??
          savedFlowerBirthRating
        : savedFlowerBirthRating,
    [flowerBirthRatings, myProfileId, savedFlowerBirthRating],
  );
  const hasLocalFlowerBirthRating = localFlowerBirthRating > 0;
  const flowerBirthAverageRating = useMemo(() => {
    if (!flowerBirthRatings.length) return null;
    const total = flowerBirthRatings.reduce((sum, entry) => sum + entry.rating, 0);
    return total / flowerBirthRatings.length;
  }, [flowerBirthRatings]);
  const flowerBirthRatingsByUserId = useMemo(
    () => new Map(flowerBirthRatings.map((entry) => [entry.user_id, entry.rating] as const)),
    [flowerBirthRatings],
  );
  const flowerBirthReadyUserIds = useMemo(
    () => new Set(flowerBirthRatings.filter((entry) => entry.ready_at).map((entry) => entry.user_id)),
    [flowerBirthRatings],
  );
  const persistFlowerBirthReady = useCallback(
    (ready: boolean) => {
      if (!myProfileId || !activeGardenId || !page?.id || !flowerBirthRatingsAvailable) return;
      const normalizedRating = Math.min(5, Math.max(1, Math.round(localFlowerBirthRating)));
      if (!Number.isFinite(normalizedRating)) return;
      const readyAt = ready ? new Date().toISOString() : null;
      setFlowerBirthRatings((prev) => {
        const existingEntry = prev.find((entry) => entry.user_id === myProfileId) ?? null;
        const filtered = prev.filter((entry) => entry.user_id !== myProfileId);
        return [
          ...filtered,
          {
            page_id: page.id,
            garden_id: activeGardenId,
            user_id: myProfileId,
            rating: existingEntry?.rating ?? normalizedRating,
            ready_at: readyAt,
            created_at: existingEntry?.created_at ?? new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
      });
      const payload = withGardenIdOnInsert(
        {
          page_id: page.id,
          user_id: myProfileId,
          rating: normalizedRating,
          ready_at: readyAt,
        },
        activeGardenId,
      );
      void withGardenScope(
        supabase
          .from("flower_birth_ritual_ratings")
          .upsert(payload, { onConflict: "page_id,user_id" }),
        activeGardenId,
      ).then(({ error }) => {
        if (error) {
          if (isSchemaNotReadyError(error)) {
            setFlowerBirthRatingsAvailable(false);
            return;
          }
          console.warn("[page/detail] no se pudo guardar ready_at del flower_birth:", error);
          return;
        }
        void refreshFlowerBirthRatings();
      });
    },
    [
      activeGardenId,
      flowerBirthRatingsAvailable,
      localFlowerBirthRating,
      myProfileId,
      page?.id,
      refreshFlowerBirthRatings,
      setFlowerBirthRatings,
      setFlowerBirthRatingsAvailable,
    ],
  );
  useEffect(() => {
    if (!flowerBirthRitualPending) return;
    const intervalId = window.setInterval(() => {
      void refreshFlowerBirthRitual();
      if (flowerBirthRatingsAvailable) {
        void refreshFlowerBirthRatings();
      }
    }, 3000);
    return () => window.clearInterval(intervalId);
  }, [
    flowerBirthRatingsAvailable,
    flowerBirthRitualPending,
    refreshFlowerBirthRatings,
    refreshFlowerBirthRitual,
  ]);
  const flowerBirthSnapshot = useMemo(
    () =>
      buildFlowerBirthRitualSnapshot({
        planSummary: page?.plan_summary ?? "",
        planTypeId: page?.plan_type_id ?? null,
        isFavorite: page?.is_favorite,
        isYearHighlight,
        rating,
        canvasObjects: objects,
        locationLabel,
        locationLat,
        locationLng,
        audioUrl,
        audioLabel,
        coverPhotoUrl: page?.cover_photo_url ?? null,
      }),
    [
      audioLabel,
      audioUrl,
      isYearHighlight,
      locationLabel,
      locationLat,
      locationLng,
      objects,
      page?.cover_photo_url,
      page?.is_favorite,
      page?.plan_summary,
      page?.plan_type_id,
      rating,
    ],
  );
  const flowerBirthSnapshotVersion = useMemo(
    () => serializeFlowerBirthRitualSnapshot(flowerBirthSnapshot),
    [flowerBirthSnapshot],
  );
  const requiredSharedParticipants = useMemo(() => {
    if (flowerBirthRitualPending && activeGardenId && !activeGardenMemberCountLoaded) {
      return 2;
    }
    return resolveSharedGardenRequiredParticipants(activeGardenMemberCount);
  }, [
    activeGardenId,
    activeGardenMemberCount,
    activeGardenMemberCountLoaded,
    flowerBirthRitualPending,
  ]);
  const flowerBirthChannelName = useMemo(() => {
    if (!page?.id || !flowerBirthRitualPending) return null;
    return sharedGardenRitualChannelName({
      ritual: "flower",
      gardenId: activeGardenId,
      entityKey: page.id,
    });
  }, [activeGardenId, flowerBirthRitualPending, page?.id]);
  const hasUnsavedChanges = useMemo(
    () =>
      !isSameSavedSnapshot(savedSnapshot, currentSnapshot) ||
      (flowerBirthRitualPending &&
        flowerBirthRatingsAvailable &&
        localFlowerBirthRating !== savedFlowerBirthRating) ||
      savedReflectionJson !== currentReflectionJson,
    [
      currentReflectionJson,
      currentSnapshot,
      flowerBirthRatingsAvailable,
      flowerBirthRitualPending,
      localFlowerBirthRating,
      savedFlowerBirthRating,
      savedReflectionJson,
      savedSnapshot,
    ],
  );
  useEffect(() => {
    if (!page?.id || !activeGardenId) {
      setPersistedPageVisualState(null);
      return;
    }
    if (pageMode !== "read") return;

    let cancelled = false;

    void loadPageVisualStates(supabase, {
      gardenId: activeGardenId,
      pageIds: [page.id],
    }).then((result) => {
      if (cancelled) return;
      if (result.errorMessage && !result.schemaMissing) {
        console.warn("[page/detail] no se pudo cargar page_visual_states:", result.errorMessage);
      }
      setPersistedPageVisualState(result.states[0] ?? null);
    });

    return () => {
      cancelled = true;
    };
  }, [
    activeGardenId,
    page?.cover_photo_url,
    page?.element,
    page?.id,
    page?.plan_type_id,
    pageMode,
    rating,
  ]);
  const livePageVisualSnapshot = useMemo(
    () =>
      buildPageVisualSnapshot({
        planCategory: resolvedSeedContext.planTypeCategory,
        planFlowerAssetPath: resolvedSeedContext.planTypeFlowerAssetPath,
        planFlowerFamily: resolvedSeedContext.planTypeFlowerFamily,
        planFlowerBuilderConfig: resolvedSeedContext.planTypeFlowerBuilderConfig,
        planSuggestedElement: resolvedSeedContext.planTypeSuggestedElement,
        element: page?.element ?? "aether",
        rating,
      }),
    [
      page?.element,
      rating,
      resolvedSeedContext.planTypeCategory,
      resolvedSeedContext.planTypeFlowerAssetPath,
      resolvedSeedContext.planTypeFlowerFamily,
      resolvedSeedContext.planTypeFlowerBuilderConfig,
      resolvedSeedContext.planTypeSuggestedElement,
    ],
  );
  const persistedPageVisualSnapshot = useMemo(
    () =>
      persistedPageVisualState
        ? buildPageVisualSnapshotFromState(persistedPageVisualState)
        : null,
    [persistedPageVisualState],
  );
  const displayPlanContext = useMemo(
    () => ({
      planTypeId:
        pageMode === "read"
          ? persistedPageVisualState?.planTypeId ?? resolvedSeedContext.planTypeId
          : resolvedSeedContext.planTypeId,
      planTypeLabel:
        pageMode === "read"
          ? persistedPageVisualState?.planTypeLabel ??
            pagePlanTypeOption?.label ??
            resolvedSeedContext.planTypeLabel
          : resolvedSeedContext.planTypeLabel,
      planTypeFlowerFamily:
        pageMode === "read"
          ? persistedPageVisualState?.planFlowerFamily ??
            pagePlanTypeOption?.flowerFamily ??
            resolvedSeedContext.planTypeFlowerFamily
          : resolvedSeedContext.planTypeFlowerFamily,
    }),
    [pageMode, pagePlanTypeOption, persistedPageVisualState, resolvedSeedContext],
  );
  const plantAssetSrc = useMemo(() => {
    if (pageMode === "edit") return livePageVisualSnapshot.primaryAssetPath;
    return persistedPageVisualSnapshot?.primaryAssetPath ?? livePageVisualSnapshot.primaryAssetPath;
  }, [
    livePageVisualSnapshot.primaryAssetPath,
    pageMode,
    persistedPageVisualSnapshot,
  ]);
  const pushRoute = useCallback(
    (href: string) => {
      router.push(href);
    },
    [router],
  );
  const cleanupUnsavedMediaBeforeLeave = useCallback(async () => {
    if (!page) return;

    const currentManagedMediaUrls = currentSnapshot?.managedMediaUrls ?? [];
    const savedManagedMediaUrls = new Set(savedSnapshot?.managedMediaUrls ?? []);
    const unsavedManagedMediaUrls = currentManagedMediaUrls.filter(
      (url) => !savedManagedMediaUrls.has(url),
    );

    if (!unsavedManagedMediaUrls.length) return;

    const cleanup = await deleteManagedMediaBatchForPage(page.id, unsavedManagedMediaUrls);
    if (cleanup.failed.length) {
      throw new Error(
        `No se pudieron borrar ${cleanup.failed.length} archivo(s) temporal(es) de Drive. Guarda o reintenta antes de salir.`,
      );
    }
  }, [currentSnapshot, page, savedSnapshot]);
  const {
    showUnsavedLeaveModal,
    leavingWithoutSaving,
    requestExitToHome,
    confirmLeaveWithoutSaving,
    closeUnsavedLeaveModal,
  } = usePageUnsavedLeaveGuard({
    hasUnsavedChanges,
    saving,
    deletingPage,
    onPush: pushRoute,
    onSetMessage: setMsg,
    onCleanupBeforeLeave: cleanupUnsavedMediaBeforeLeave,
    getCleanupErrorMessage: (error) =>
      getErrorMessage(error, "No se pudo limpiar la media pendiente antes de salir."),
  });

  async function updatePageAudioFields(payload: Record<string, unknown>) {
    return await pagesTable().update(payload).eq("id", id);
  }

  function patchPageAudio(patch: { audio_url: string | null; audio_label: string | null }) {
    const previousRevisionSnapshot = currentRevisionSnapshotRef.current;
    const nextAudioUrl = normalizeSnapshotText(patch.audio_url);
    const nextAudioLabel = normalizeSnapshotText(patch.audio_label);

    setPage((prev) =>
      prev
        ? {
            ...prev,
            audio_url: patch.audio_url,
            audio_label: patch.audio_label,
          }
        : prev,
    );
    setSavedSnapshot((prev) =>
      patchSavedSnapshot(prev, {
        audioUrl: nextAudioUrl,
        audioLabel: nextAudioLabel,
      }),
    );

    if (previousRevisionSnapshot) {
      const nextRevisionSnapshot: FlowerPagePersistedSnapshot = {
        ...previousRevisionSnapshot,
        audioUrl: nextAudioUrl,
        audioLabel: nextAudioLabel,
      };
      void recordFlowerRevisionRef.current?.(previousRevisionSnapshot, nextRevisionSnapshot);
    }
  }

  const applyFlowerBirthSnapshot = useCallback(
    (snapshot: FlowerBirthRitualSnapshot) => {
      setPage((prev) =>
        prev
          ? {
              ...prev,
              plan_summary: snapshot.planSummary || null,
              plan_type_id: snapshot.planTypeId || null,
              is_favorite: snapshot.isFavorite,
              cover_photo_url: snapshot.coverPhotoUrl || null,
              audio_url: snapshot.audioUrl || null,
              audio_label: snapshot.audioLabel || null,
            }
          : prev,
      );
      setObjects(snapshot.canvasObjects);
      setRating(snapshot.rating);
      applyCurrentPageYearHighlight(snapshot.isYearHighlight);

      const nextPlanType =
        planTypeOptions.find((item) => item.id === snapshot.planTypeId) ?? null;
      setSeedContext((prev) => ({
        ...prev,
        planTypeId: snapshot.planTypeId || null,
        planTypeLabel: nextPlanType?.label ?? prev.planTypeLabel,
        planTypeCategory: nextPlanType?.category ?? prev.planTypeCategory,
        planTypeFlowerFamily: nextPlanType?.flowerFamily ?? prev.planTypeFlowerFamily,
        planTypeFlowerAssetPath: nextPlanType?.flowerAssetPath ?? prev.planTypeFlowerAssetPath,
        planTypeFlowerBuilderConfig:
          nextPlanType?.flowerBuilderConfig ?? prev.planTypeFlowerBuilderConfig,
        planTypeSuggestedElement: nextPlanType?.suggestedElement ?? prev.planTypeSuggestedElement,
      }));

      applyLoadedLocation({
        label: locationFieldsAvailable ? snapshot.locationLabel : "",
        lat: locationFieldsAvailable ? snapshot.locationLat : "",
        lng: locationFieldsAvailable ? snapshot.locationLng : "",
      });
      applyLoadedAudio({
        audioReady: audioFieldsAvailable,
        audioUrl: audioFieldsAvailable ? snapshot.audioUrl : "",
        audioLabel: audioFieldsAvailable ? snapshot.audioLabel : "",
      });
    },
    [
      applyCurrentPageYearHighlight,
      applyLoadedAudio,
      applyLoadedLocation,
      audioFieldsAvailable,
      locationFieldsAvailable,
      planTypeOptions,
    ],
  );

  const {
    audioEditorsLabel,
    canArmFlowerBirthHold,
    canEnterFlowerBirthSealStage,
    coverEditorsLabel,
    currentSharedEditorsLabel,
    displayRating,
    flowerBirthConnected,
    flowerBirthEditingLocked,
    flowerBirthHoldCanProgress,
    flowerBirthHoldProgressPercent,
    flowerBirthHoldStatusLabel,
    flowerBirthLeaderUserId,
    localReady: flowerBirthLocalReady,
    flowerBirthPendingEntry,
    flowerBirthRatingLocked,
    flowerBirthRitualNotice,
    flowerBirthRitualParticipants,
    flowerBirthSealStepItems,
    flowerBirthSealSummaryItems,
    handleFlowerBirthHoldEnd,
    handleFlowerBirthHoldStart,
    handleLocalCanvasPointerChange,
    hasDeferredSharedFlowerSnapshot,
    hasFlowerBirthRatingsForAllParticipants,
    locationEditorsLabel,
    planTypeEditorsLabel,
    readyFlowerBirthParticipantsCount,
    remoteCanvasPointers,
    returnToFlowerBirthDraftStage,
    summaryEditorsLabel,
    toggleFlowerBirthReady,
  } = usePageFlowerBirthRitual({
    activeSharedTarget,
    audioLabel,
    audioUrl,
    companionReference,
    flowerBirthChannelName,
    flowerBirthRitual,
    flowerBirthRitualPending,
    flowerBirthSnapshot,
    flowerBirthSnapshotVersion,
    hasLocalFlowerBirthRating,
    localFlowerBirthRating,
    localSharedActivityLabel,
    localSharedFocusLabel,
    locationLabel,
    myProfileId: myProfileId || null,
    myProfileName,
    objects,
    onApplySnapshot: applyFlowerBirthSnapshot,
    onBeforeFinalizeSeal: save,
    onPersistLocalReady: persistFlowerBirthReady,
    onRemoteSeal: ({ sentAt }) => {
      setFlowerBirthRitual((prev) =>
        prev
          ? {
              ...prev,
              completed_at: sentAt,
            }
          : prev,
      );
      void refreshFlowerBirthRatings();
      void refreshFlowerRevisions();
    },
    onSetMessage: setMsg,
    pagePlanSummary: page?.plan_summary,
    pageRating: rating,
    pageTitle: page?.title ?? null,
    readyUserIds: flowerBirthReadyUserIds,
    ratingsByUserId: flowerBirthRatingsByUserId,
    requiredSharedParticipants,
    saving,
  });
  const flowerBirthDisplayParticipants = useMemo<SharedGardenParticipantPresence[]>(() => {
    const participants = [...flowerBirthRitualParticipants];
    if (!flowerBirthRitualPending || requiredSharedParticipants <= participants.length) {
      return participants;
    }
    if (requiredSharedParticipants <= 1) return participants;

    const currentProfileId = String(myProfileId ?? "").trim();
    const hasOtherParticipant = participants.some(
      (participant) => participant.userId !== currentProfileId,
    );
    if (hasOtherParticipant) return participants;

    const companionName = String(companionReference ?? "").trim() || "La otra persona";
    return [
      ...participants,
      {
        activityLabel: "Todavia no esta dentro",
        activityProgress: null,
        cursorOffset: null,
        focusKey: null,
        focusLabel: null,
        holding: false,
        name: companionName,
        pointerX: null,
        pointerY: null,
        ready: false,
        updatedAt: "1970-01-01T00:00:00.000Z",
        userId: `expected-companion:${companionName.toLowerCase()}`,
      },
    ];
  }, [
    companionReference,
    flowerBirthRitualParticipants,
    flowerBirthRitualPending,
    myProfileId,
    requiredSharedParticipants,
  ]);

  useEffect(() => {
    let active = true;
    setPersistedPageVisualState(null);

    (async () => {
      const user = await getSessionUser();
      if (!active) return;
      if (!user) {
        router.push("/login");
        return;
      }

      const loadPageByGarden = (gardenIdOverride: string | null) =>
        loadPageRecordWithFallback(async (columns) =>
          withGardenScope(
            supabase
              .from("pages")
              .select(columns)
              .eq("id", id),
            gardenIdOverride,
          ).single(),
        );
      const optimisticPagePromise = loadPageByGarden(null);
      const moodThresholdsPromise = getCatalogItems("mood_thresholds");
      const profilePromise = getMyProfile(user.id);
      const resolvedGardenIdPromise = resolveActiveGardenIdForUser({
        userId: user.id,
      }).catch(() => null);

      const profile = await profilePromise;
      if (!active) return;
      setMyProfileId(profile.id);
      setMyProfileName(String(profile.name ?? "").trim() || "Tu mirada");

      void moodThresholdsPromise
        .then((moodThresholdRows) => {
          if (!active) return;
          const resolvedMoodThresholds = toMoodThresholds(moodThresholdRows);
          setMoodThresholds(resolvedMoodThresholds.length ? resolvedMoodThresholds : MOOD_THRESHOLDS);
        })
        .catch(() => {
          if (!active) return;
          setMoodThresholds(MOOD_THRESHOLDS);
        });

      const resolvedGardenId = await resolvedGardenIdPromise;
      if (!active) return;
      setActiveGardenId(resolvedGardenId);

      let loadResult = resolvedGardenId
        ? await loadPageByGarden(resolvedGardenId)
        : await optimisticPagePromise;
      let recoveredGardenId: string | null = null;

      if (!loadResult.row && resolvedGardenId) {
        const unscopedResult = await optimisticPagePromise;
        if (unscopedResult.row) {
          loadResult = unscopedResult;
          const rowGardenId = String(
            ((unscopedResult.row as Record<string, unknown> | null)?.garden_id ?? ""),
          ).trim();
          recoveredGardenId = rowGardenId || null;
        }
      }

      if (!active) return;
      if (loadResult.errorMessage) {
        setMsg(loadResult.errorMessage);
      }

      const row = loadResult.row as (Partial<PageRow> & Record<string, unknown>) | null;
      if (!row) {
        setMsg("No se pudo cargar la pagina.");
        return;
      }

      const effectiveGardenId =
        recoveredGardenId ||
        String((row.garden_id ?? resolvedGardenId ?? "")).trim() ||
        resolvedGardenId;

      if (effectiveGardenId && effectiveGardenId !== resolvedGardenId) {
        setActiveGardenId(effectiveGardenId);
        void setActiveGardenIdForUser({
          userId: profile.id,
          gardenId: effectiveGardenId,
        }).catch(() => {
          // best effort
        });
      }

      const normalizedPage = normalizePageRow(row, id);
      const locationReady = loadResult.locationReady;
      const audioReady = loadResult.audioReady;
      const initialCompletionState = derivePageCompletionState({
        canvasObjects: normalizedPage.canvas_objects ?? [],
        rating: normalizedPage.rating ?? 0,
        planSummary: normalizedPage.plan_summary ?? "",
        audioUrl: audioReady ? String(normalizedPage.audio_url ?? "") : "",
        coverPhotoUrl: normalizedPage.cover_photo_url ?? null,
      });
      const nextPageMode = initialCompletionState === "pending_capture" ? "edit" : "read";
      let nextPersistedPageVisualState: PageVisualState | null = null;

      if (effectiveGardenId && nextPageMode === "read") {
        const pageVisualStatesResult = await loadPageVisualStates(supabase, {
          gardenId: effectiveGardenId,
          pageIds: [normalizedPage.id],
        });
        if (!active) return;
        if (pageVisualStatesResult.errorMessage && !pageVisualStatesResult.schemaMissing) {
          console.warn(
            "[page/detail] no se pudo precargar page_visual_states:",
            pageVisualStatesResult.errorMessage,
          );
        }
        nextPersistedPageVisualState = pageVisualStatesResult.states[0] ?? null;
      }

      setLocationFieldsAvailable(locationReady);
      setAudioFieldsAvailable(audioReady);
      setPage(normalizedPage);
      setPersistedPageVisualState(nextPersistedPageVisualState);
      setRating(normalizedPage.rating ?? 0);
      setMoodState(normalizedPage.mood_state ?? "healthy");
      applyLoadedLocation({
        label: locationReady ? String(normalizedPage.location_label ?? "") : "",
        lat:
          locationReady && normalizedPage.location_lat != null
            ? String(normalizedPage.location_lat)
            : "",
        lng:
          locationReady && normalizedPage.location_lng != null
            ? String(normalizedPage.location_lng)
            : "",
      });
      applyLoadedAudio({
        audioReady,
        audioUrl: String(normalizedPage.audio_url ?? ""),
        audioLabel: String(normalizedPage.audio_label ?? ""),
      });
      setObjects(normalizedPage.canvas_objects ?? []);
      setPageMode(nextPageMode);
      setDetailSection("canvas");
      setContextSection("location");
      setSavedSnapshot(
        buildPageSavedSnapshot({
          objects: normalizedPage.canvas_objects ?? [],
          rating: normalizedPage.rating ?? 0,
          planSummary: normalizedPage.plan_summary ?? "",
          planTypeId: normalizedPage.plan_type_id ?? null,
          isFavorite: normalizedPage.is_favorite,
          isYearHighlight: false,
          locationLabel: locationReady ? String(normalizedPage.location_label ?? "") : "",
          locationLat:
            locationReady && normalizedPage.location_lat != null
              ? String(normalizedPage.location_lat)
              : "",
          locationLng:
            locationReady && normalizedPage.location_lng != null
              ? String(normalizedPage.location_lng)
              : "",
          audioUrl: audioReady ? String(normalizedPage.audio_url ?? "") : "",
          audioLabel: audioReady ? String(normalizedPage.audio_label ?? "") : "",
          coverPhotoUrl: normalizedPage.cover_photo_url ?? null,
        }),
      );
    })();

    return () => {
      active = false;
    };
  }, [applyLoadedAudio, applyLoadedLocation, id, router, setMoodThresholds]);

  useEffect(() => {
    if (!shouldLoadPageAncillaryData || !page?.id || !activeGardenId || !myProfileId) return;
    void refreshReflections({ syncMyDraft: true });
  }, [activeGardenId, myProfileId, page?.id, refreshReflections, shouldLoadPageAncillaryData]);

  useEffect(() => {
    if (!activeGardenId) {
      setPlanTypeOptions(getFallbackPlanTypeOptions());
      return;
    }
    if (!shouldLoadPageAncillaryData) return;

    let active = true;

    (async () => {
      const loadPlanTypes = async () =>
        withGardenScope(
          supabase
            .from("garden_plan_types")
            .select(
              "id,code,label,category,description,flower_family,suggested_element,icon_emoji,flower_asset_path,seed_asset_path,flower_builder_config,is_custom,sort_order,archived_at",
            )
            .is("archived_at", null)
            .order("sort_order", { ascending: true }),
          activeGardenId,
        );

      let response = await loadPlanTypes();

      if (response.error && isSchemaNotReadyError(response.error)) {
        if (active) setPlanTypeOptions(getFallbackPlanTypeOptions());
        return;
      }

      if ((!response.data || response.data.length === 0) && myProfileId) {
        try {
          await ensureGardenPlanTypes({
            gardenId: activeGardenId,
            profileId: myProfileId,
          });
          response = await loadPlanTypes();
        } catch (error) {
          if (active) {
            setPlanTypeOptions(getFallbackPlanTypeOptions());
            setMsg(getErrorMessage(error, "No se pudo cargar la biblioteca de tipos de plan."));
          }
          return;
        }
      }

      if (!active) return;

      if (response.error) {
        setPlanTypeOptions(getFallbackPlanTypeOptions());
        setMsg(response.error.message);
        return;
      }

      const rows = ((response.data as Record<string, unknown>[] | null) ?? []).map(mapGardenPlanTypeRow);
      setPlanTypeOptions(rows.length ? rows : getFallbackPlanTypeOptions());
    })();

    return () => {
      active = false;
    };
  }, [activeGardenId, myProfileId, shouldLoadPageAncillaryData]);

  useEffect(() => {
    if (!page?.id || !activeGardenId || page.plan_type_id) return;

    let active = true;

    (async () => {
      const response = await withGardenScope(
        supabase
          .from("pages")
          .select("plan_type_id")
          .eq("id", page.id)
          .maybeSingle(),
        activeGardenId,
      );

      if (!active) return;
      if (response.error) {
        if (isSchemaNotReadyError(response.error)) return;
        return;
      }

      const loadedPlanTypeId = String(
        ((response.data as { plan_type_id?: string | null } | null)?.plan_type_id ?? ""),
      ).trim();
      setPage((prev) =>
        prev && prev.id === page.id ? { ...prev, plan_type_id: loadedPlanTypeId || null } : prev,
      );
    })();

    return () => {
      active = false;
    };
  }, [activeGardenId, page?.id, page?.plan_type_id]);

  function openExternalAudioUrlModal() {
    setMsg(null);
    if (!audioFieldsAvailable) {
      setMsg(
        "Faltan columnas de audio en pages. Ejecuta: supabase/sql/2026-03-06_page_audio_support.sql",
      );
      return;
    }
    handleSharedTargetStart("audio");
    const current = audioUrl.trim();
    setExternalAudioDraft(current || "https://");
    setShowExternalAudioModal(true);
  }

  async function submitExternalAudioUrl() {
    const saved = await saveExternalAudioUrl(externalAudioDraft);
    if (!saved) return;
    setShowExternalAudioModal(false);
    setExternalAudioDraft("");
    handleSharedTargetEnd("audio");
  }

  const persistCoverPhoto = useCallback(
    async (url: string | null) => {
      const previousRevisionSnapshot = currentRevisionSnapshotRef.current;
      setMsg(null);
      const { error } = await pagesTable()
        .update({ cover_photo_url: url })
        .eq("id", id);
      if (error) {
        setMsg(error.message);
        return;
      }

      setPage((prev) => (prev ? { ...prev, cover_photo_url: url } : prev));
      setSavedSnapshot((prev) =>
        patchSavedSnapshot(prev, {
          coverPhotoUrl: url ?? "",
        }),
      );
      if (previousRevisionSnapshot) {
        const nextRevisionSnapshot: FlowerPagePersistedSnapshot = {
          ...previousRevisionSnapshot,
          coverPhotoUrl: String(url ?? "").trim(),
        };
        void recordFlowerRevisionRef.current?.(previousRevisionSnapshot, nextRevisionSnapshot);
      }
    },
    [id, pagesTable],
  );

  const uploadDedicatedCoverPhoto = useCallback(
    async (file: File) => {
      if (!page) return;
      handleSharedTargetStart("cover");
      setUploadingCoverPhoto(true);
      setMsg(null);

      try {
        const uploadedUrl = await uploadPagePhoto(page.id, file);
        await persistCoverPhoto(uploadedUrl);
        setMsg("Portada actualizada");
      } catch (error: unknown) {
        setMsg(getErrorMessage(error, "No se pudo subir la portada."));
      } finally {
        setUploadingCoverPhoto(false);
        handleSharedTargetEnd("cover");
      }
    },
    [handleSharedTargetEnd, handleSharedTargetStart, page, persistCoverPhoto],
  );

  async function save() {
    return await savePageDetail({
      activeGardenId,
      audioFieldsAvailable,
      audioLabel,
      audioUrl,
      currentReflectionJson,
      exportCanvasPng: () => canvasRef.current?.exportPng(),
      flowerBirthRatings,
      flowerBirthRatingsAvailable,
      flowerBirthRitualAvailable,
      flowerBirthRitualPending,
      isYearHighlight,
      localFlowerBirthRating,
      locationFieldsAvailable,
      locationLabel,
      locationLat,
      locationLng,
      moodState,
      myProfileId,
      myReflectionDraft,
      objects,
      page,
      rating,
      recordFlowerRevision,
      reflectionFieldsAvailable,
      reflections,
      requiredSharedParticipants,
      savedReflectionJson,
      savedRevisionSnapshot,
      savedSnapshot,
      setAudioFieldsAvailable,
      setContextSection,
      setDetailSection,
      setFlowerBirthRatings,
      setFlowerBirthRatingsAvailable,
      setFlowerBirthRitual,
      setLocationFieldsAvailable,
      setMessage: setMsg,
      setPageMode,
      setRating,
      setReflections,
      setSavedFlowerBirthRating,
      setSavedReflectionJson,
      setSavedSnapshot,
      setSaving,
    });
  }

  // quickSave for care actions - deprecated, care system removed

  const {
    confirmDeleteCurrentPage: confirmDeleteCurrentPageAction,
    shareCurrentPageToChat: shareCurrentPageToChatAction,
    toggleFavorite,
    updatePlanType: updatePlanTypeAction,
  } = usePageDetailMutations({
    activeGardenId,
    audioUrl,
    currentRevisionSnapshot,
    myProfileId,
    objects,
    onNavigateHome: () => pushRoute("/home"),
    page,
    planTypeLabel: displayPlanContext.planTypeLabel,
    planTypeOptions,
    pulseSharedTarget,
    recordFlowerRevision,
    setChangingPlanType,
    setDeletingPage,
    setMessage: setMsg,
    setPage,
    setSavedSnapshot,
    setSeedContext,
    setSharingToChat,
    setShowDeleteConfirmModal,
  });

  async function updatePlanType(nextPlanTypeId: string) {
    await updatePlanTypeAction(nextPlanTypeId);
  }

  function openDeleteConfirmModal() {
    if (!page) return;
    setShowDeleteConfirmModal(true);
  }

  async function shareCurrentPageToChat() {
    await shareCurrentPageToChatAction();
  }

  async function confirmDeleteCurrentPage() {
    await confirmDeleteCurrentPageAction();
  }

  /* legacy action bodies extracted to usePageDetailMutations


  async function updatePlanType(nextPlanTypeId: string) {
    await updatePlanTypeAction(nextPlanTypeId);
  }

      if (!persistedSomewhere) {
        throw new Error(
          "Falta la columna plan_type_id en pages. Ejecuta la migración nueva antes de cambiar el tipo de plan aquí.",
        );
      }

      const selectedPlanType =
        planTypeOptions.find((item) => item.id === normalizedPlanTypeId) ?? null;

      setSeedContext((prev) => ({
        ...prev,
        planTypeId: normalizedPlanTypeId,
        planTypeLabel: selectedPlanType?.label ?? null,
        planTypeCategory: selectedPlanType?.category ?? null,
        planTypeFlowerFamily: selectedPlanType?.flowerFamily ?? null,
        planTypeFlowerAssetPath: selectedPlanType?.flowerAssetPath ?? null,
        planTypeFlowerBuilderConfig: selectedPlanType?.flowerBuilderConfig ?? null,
        planTypeSuggestedElement: selectedPlanType?.suggestedElement ?? null,
      }));
      setSavedSnapshot((prev) =>
        prev
          ? {
              ...prev,
              planTypeId: normalizedPlanTypeId ?? "",
            }
          : prev,
      );
      if (previousRevisionSnapshot) {
        const nextRevisionSnapshot: FlowerPagePersistedSnapshot = {
          ...previousRevisionSnapshot,
          planTypeId: normalizedPlanTypeId ?? "",
        };
        void recordFlowerRevisionRef.current?.(previousRevisionSnapshot, nextRevisionSnapshot);
      }

      setMsg("Tipo de plan actualizado");
    } catch (error: unknown) {
      setMsg(getErrorMessage(error, "No se pudo actualizar el tipo de plan."));
    } finally {
      setChangingPlanType(false);
    }
  }

  const {
    confirmDeleteCurrentPage: confirmDeleteCurrentPageAction,
    shareCurrentPageToChat: shareCurrentPageToChatAction,
    toggleFavorite,
    updatePlanType: updatePlanTypeAction,
  } = usePageDetailMutations({
    activeGardenId,
    audioUrl,
    currentRevisionSnapshot: currentRevisionSnapshotRef.current,
    myProfileId,
    objects,
    onNavigateHome: () => pushRoute("/home"),
    page,
    planTypeLabel: seedContext.planTypeLabel,
    planTypeOptions,
    pulseSharedTarget,
    recordFlowerRevision,
    setChangingPlanType,
    setDeletingPage,
    setMessage: setMsg,
    setPage,
    setSavedSnapshot,
    setSeedContext,
    setSharingToChat,
    setShowDeleteConfirmModal,
  });

  function openDeleteConfirmModal() {
    if (!page) return;
    setShowDeleteConfirmModal(true);
  }

  async function shareCurrentPageToChat() {
    const gardenId = String(activeGardenId ?? "").trim();
    const profileId = String(myProfileId ?? "").trim();
    if (!page || !gardenId || !profileId) {
      setMsg("Necesitamos la flor cargada, jardin activo y sesion valida para compartirla.");
      return;
    }

    setSharingToChat(true);
    setMsg(null);
    try {
      await sendGardenChatReferenceMessage({
        gardenId,
        authorUserId: profileId,
        reference: buildGardenChatPageReference({
          page,
          planTypeLabel: resolvedSeedContext.planTypeLabel,
        }),
      });
      setMsg(`"${page.title?.trim() || "La flor"}" ya esta compartida en el chat.`);
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "No se pudo compartir la flor en el chat.");
    } finally {
      setSharingToChat(false);
    }
  }

  async function confirmDeleteCurrentPage() {
    if (!page) return;

    setShowDeleteConfirmModal(false);
    setDeletingPage(true);
    setMsg(null);

    try {
      const managedMediaUrls = collectManagedPageMediaUrls({
        audioUrl,
        coverPhotoUrl: page.cover_photo_url ?? null,
        canvasObjects: objects,
      });

      const deleteRes = await supabase.rpc("delete_garden_page", {
        p_page_id: page.id,
      });
      if (deleteRes.error) {
        if (isSchemaNotReadyError(deleteRes.error)) {
          throw new Error(
            "Falta la funcion delete_garden_page. Ejecuta la migracion 2026-03-25_page_delete_member_rpc.sql antes de borrar flores.",
          );
        }
        throw deleteRes.error;
      }

      const cleanup = await deleteManagedMediaBatchForPage(page.id, managedMediaUrls);
      if (cleanup.failed.length && typeof window !== "undefined") {
        window.alert(
          `La página se borro, pero ${cleanup.failed.length} archivo(s) no pudieron borrarse de Drive.`,
        );
      }

      router.push(getHomePathSummaryHref());
    } catch (error: unknown) {
      setMsg(getErrorMessage(error, "No se pudo borrar la página."));
    } finally {
      setDeletingPage(false);
    }
  }

  */

  const otherReflections = useMemo(() => {
    return reflections
      .filter((row) => row.user_id !== myProfileId)
      .map((row) => ({
        id: row.id,
        userId: row.user_id,
        authorLabel:
          memberNamesById[row.user_id] ||
          (row.user_id === myProfileId ? myProfileName : "Persona del jardín"),
        ...toReflectionDraft(row),
      }));
  }, [memberNamesById, myProfileId, myProfileName, reflections]);

  const handlePageModeChange = useCallback((nextMode: "read" | "edit") => {
    setPageMode(nextMode);
    if (nextMode === "read") {
      setDetailSection("canvas");
      setContextSection("location");
      return;
    }

    setDetailSection("canvas");
  }, []);

  const handleCancelEdit = useCallback(async () => {
    await cancelPageDetailEdit({
      activeGardenId,
      applyCurrentPageYearHighlight,
      applyLoadedAudio,
      applyLoadedLocation,
      audioFieldsAvailable,
      currentSnapshot,
      flowerBirthRitualPending,
      hasUnsavedChanges,
      locationFieldsAvailable,
      myProfileId,
      onExitEditMode: () => handlePageModeChange("read"),
      page,
      planTypeOptions,
      savedFlowerBirthRating,
      savedReflectionJson,
      savedSnapshot,
      setFlowerBirthRatings,
      setMessage: setMsg,
      setMyReflectionDraft,
      setObjects,
      setPage,
      setRating,
      setSeedContext,
    });
  }, [
    activeGardenId,
    applyLoadedAudio,
    applyLoadedLocation,
    audioFieldsAvailable,
    currentSnapshot,
    flowerBirthRitualPending,
    handlePageModeChange,
    hasUnsavedChanges,
    locationFieldsAvailable,
    myProfileId,
    page,
    planTypeOptions,
    savedFlowerBirthRating,
    savedReflectionJson,
    savedSnapshot,
  ]);

  const openContextEditor = useCallback(
    (preferredSection: "location" | "audio" | "video" = "location") => {
      setPageMode("edit");
      setDetailSection("context");
      setContextSection(preferredSection);
    },
    [],
  );

  const handleSharedCanvasObjectsChange = useCallback((next: CanvasObject[]) => {
    setObjects(next);
    markCanvasInteraction();
  }, [markCanvasInteraction]);

  function handleSharedTargetStart(target: "location" | "audio" | "cover" | "plan_type") {
    activateSharedTarget(target);
  }

  function handleSharedTargetEnd(target: "location" | "audio" | "cover" | "plan_type") {
    clearSharedTarget(target);
  }

  const handleSharedRatingChange = useCallback((value: number) => {
    if (!flowerBirthRitualPending) return;
    markRatingInteraction();
    setFlowerBirthRatings((prev) => {
      const existingEntry = prev.find((entry) => entry.user_id === myProfileId) ?? null;
      const filtered = prev.filter((entry) => entry.user_id !== myProfileId);
      if (value <= 0 || !myProfileId || !activeGardenId || !page?.id) return filtered;
      return [
        ...filtered,
        {
          page_id: page.id,
          garden_id: activeGardenId,
          user_id: myProfileId,
          rating: value,
          ready_at: existingEntry?.ready_at ?? null,
          created_at: existingEntry?.created_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
    });
    if (myProfileId && activeGardenId && page?.id && flowerBirthRatingsAvailable) {
      if (value > 0) {
        const ratingPayload = withGardenIdOnInsert(
          {
            page_id: page.id,
            user_id: myProfileId,
            rating: value,
            ready_at:
              flowerBirthRatings.find((entry) => entry.user_id === myProfileId)?.ready_at ?? null,
          },
          activeGardenId,
        );
        void supabase
          .from("flower_birth_ritual_ratings")
          .upsert(ratingPayload, { onConflict: "page_id,user_id" })
          .then(({ error }) => {
            if (error) {
              if (isSchemaNotReadyError(error)) {
                setFlowerBirthRatingsAvailable(false);
                return;
              }
              console.warn("[page/detail] no se pudo guardar la valoracion del flower_birth:", error);
              return;
            }
            void refreshFlowerBirthRatings();
          });
      } else {
        void withGardenScope(
          supabase
            .from("flower_birth_ritual_ratings")
            .delete()
            .eq("page_id", page.id)
            .eq("user_id", myProfileId),
          activeGardenId,
        ).then(({ error }) => {
          if (error) {
            if (isSchemaNotReadyError(error)) {
              setFlowerBirthRatingsAvailable(false);
              return;
            }
            console.warn("[page/detail] no se pudo borrar la valoracion del flower_birth:", error);
            return;
          }
          setSavedFlowerBirthRating(0);
          void refreshFlowerBirthRatings();
        });
      }
    }
  }, [activeGardenId, flowerBirthRatingsAvailable, flowerBirthRitualPending, markRatingInteraction, myProfileId, page?.id, refreshFlowerBirthRatings]);

  if (!page) {
    return (
      <div className="lv-page p-6">
        <div className="lv-shell max-w-xl">
          <div className="lv-card p-5">
          <p>{msg ?? "Cargando página..."}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lv-page p-6">
      <div className="lv-shell max-w-6xl space-y-4">
        {flowerBirthPendingEntry ? (
          <FlowerBirthPendingPanel
            connected={flowerBirthConnected}
            companionReference={companionReference}
            myProfileId={myProfileId || null}
            onExit={requestExitToHome}
            participants={flowerBirthDisplayParticipants}
            requiredParticipants={requiredSharedParticipants}
          />
        ) : flowerBirthRitualPending ? (
          <section className="rounded-[28px] border border-[color-mix(in_srgb,var(--lv-primary)_26%,white)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--lv-primary-soft)_82%,white),color-mix(in_srgb,var(--lv-surface)_94%,white))] p-5 shadow-[var(--lv-shadow-md)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1 max-w-3xl">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-primary-strong)]">
                  Nacimiento compartido
                </div>
                <h2 className="mt-2 text-xl font-semibold text-[var(--lv-text)]">
                  Esta flor se crea entre las dos personas, ahora y en directo.
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--lv-text-muted)]">
                  La fecha ya ha llegado y el riego conjunto ya se ha cumplido. Ahora toca darle forma entre las dos personas:
                  texto, lienzo y detalles viven sincronizados mientras este ritual siga abierto.
                </p>
              </div>

              <button
                type="button"
                onClick={requestExitToHome}
                className="rounded-full border border-[var(--lv-border)] bg-white/85 px-4 py-2 text-sm font-medium text-[var(--lv-text)] transition hover:bg-white"
              >
                Salir a home
              </button>

              <div className="grid w-full gap-4 lg:grid-cols-[minmax(320px,340px)_minmax(0,1fr)]">
                <div className="min-w-0 rounded-[22px] border border-[var(--lv-border)] bg-white/80 p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Estado compartido
                  </div>
                  <div className="mt-2 text-sm font-medium text-[var(--lv-text)]">
                    {flowerBirthConnected ? "En directo" : "Conectando ritual..."}
                  </div>
                  <div className="mt-3 space-y-2">
                    {flowerBirthDisplayParticipants.length ? (
                      flowerBirthDisplayParticipants.map((participant) => {
                        const participantMissing = participant.userId.startsWith("expected-companion:");
                        const participantReady =
                          !participantMissing &&
                          (participant.ready ||
                            flowerBirthReadyUserIds.has(participant.userId));
                        return (
                        <div
                          key={`flower-birth:${participant.userId}`}
                          data-testid="flower-birth-participant"
                          className={`rounded-[16px] border px-3 py-2 ${
                            participantMissing
                              ? "border-dashed border-[var(--lv-border)] bg-[color-mix(in_srgb,var(--lv-surface)_74%,transparent)]"
                              : "border-[var(--lv-border)] bg-[var(--lv-surface)]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-[var(--lv-text)]">
                              {participant.name}
                            </span>
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor: participantMissing
                                  ? "var(--lv-text-muted)"
                                  : flowerPresenceColor(participant.userId),
                              }}
                            />
                          </div>
                          <div className="mt-1 text-xs text-[var(--lv-text-muted)]">
                            {participantMissing
                              ? "Todavia no esta dentro"
                              : participant.focusLabel ?? participant.activityLabel ?? "Mirando la flor"}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                            <span
                              className={`rounded-full px-2 py-0.5 font-medium ${
                                participantMissing
                                  ? "bg-[var(--lv-surface-elevated)] text-[var(--lv-text-muted)]"
                                  : participantReady
                                  ? "bg-[var(--lv-primary-soft)] text-[var(--lv-primary-strong)]"
                                  : "bg-[var(--lv-surface-elevated)] text-[var(--lv-text-muted)]"
                              }`}
                            >
                              {participantMissing ? "fuera" : participantReady ? "a punto" : "preparando"}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 font-medium ${
                                participantMissing
                                  ? "bg-[var(--lv-surface-elevated)] text-[var(--lv-text-muted)]"
                                  : participant.holding
                                  ? "bg-[var(--lv-warning-soft)] text-[var(--lv-warning)]"
                                  : "bg-[var(--lv-surface-elevated)] text-[var(--lv-text-muted)]"
                              }`}
                            >
                              {participantMissing
                                ? "sin entrar"
                                : participant.holding
                                  ? "guardando"
                                  : "sin sellar"}
                            </span>
                          </div>
                        </div>
                        );
                      })
                    ) : (
                      <div className="rounded-[16px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2 text-sm text-[var(--lv-text-muted)]">
                        Esperando presencia compartida.
                      </div>
                    )}
                    </div>
                    <div className="mt-3 text-xs text-[var(--lv-text-muted)]">
                      {hasFlowerBirthRatingsForAllParticipants
                        ? "Cuando las dos personas la dejeis a punto, aparecera el guardado compartido."
                        : "El nacimiento no se cerrara hasta que esteis las dos personas dentro y cada una haya dejado su valoracion."}
                    </div>
                  {flowerBirthEditingLocked ? (
                    <div className="mt-3 rounded-[18px] border border-[var(--lv-warning)] bg-[var(--lv-warning-soft)] px-3 py-2 text-xs font-medium text-[var(--lv-warning)]">
                      {companionReference} no esta dentro ahora mismo. La flor queda en pausa hasta que vuelva.
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-[var(--lv-surface)] px-3 py-1 text-xs font-medium text-[var(--lv-text)]">
                      Tu valoracion: {localFlowerBirthRating > 0 ? `${localFlowerBirthRating}/5` : "pendiente"}
                    </span>
                    <span className="rounded-full bg-[var(--lv-surface)] px-3 py-1 text-xs font-medium text-[var(--lv-text)]">
                      Media provisional: {flowerBirthAverageRating != null ? `${flowerBirthAverageRating.toFixed(1)}/5` : "sin media aun"}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={toggleFlowerBirthReady}
                    disabled={flowerBirthEditingLocked}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-55 ${
                      flowerBirthLocalReady
                        ? "border-[var(--lv-primary)] bg-[var(--lv-primary-soft)] text-[var(--lv-primary-strong)]"
                        : "border-[var(--lv-border)] bg-white text-[var(--lv-text)]"
                    }`}
                  >
                    {flowerBirthLocalReady ? "Ya la veo a punto" : "Marcar que ya esta a punto"}
                  </button>
                  <span className="rounded-full bg-[var(--lv-surface)] px-3 py-2 text-xs font-medium text-[var(--lv-text-muted)]">
                    Listas/os: {readyFlowerBirthParticipantsCount}/{requiredSharedParticipants}
                  </span>
                </div>
                  {!hasLocalFlowerBirthRating ? (
                    <div className="mt-2 text-xs text-[var(--lv-text-muted)]">
                      Primero deja tu valoracion para poder marcar que ya esta a punto.
                    </div>
                  ) : !hasFlowerBirthRatingsForAllParticipants ? (
                    <div className="mt-2 text-xs text-[var(--lv-text-muted)]">
                      Ya puedes marcar tu lado. El gesto final se abrira cuando esten las dos personas dentro y ambas hayan valorado la flor.
                    </div>
                  ) : null}
              </div>

                <PageRevisionHistoryPanel
                  revisions={flowerRevisions}
                  revisionsAvailable={flowerRevisionsAvailable}
                  currentUserId={myProfileId || null}
                  draftSummary={liveRevisionSummary}
                  compact
                  initialVisibleRevisions={3}
                  className="min-w-0 bg-white/80"
                />
              </div>
            </div>

            {(activeSharedTarget && currentSharedEditorsLabel) || hasDeferredSharedFlowerSnapshot ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {activeSharedTarget && currentSharedEditorsLabel ? (
                  <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-[var(--lv-primary-strong)]">
                    {currentSharedEditorsLabel} esta tocando esta misma zona.
                  </span>
                ) : null}
                {hasDeferredSharedFlowerSnapshot ? (
                  <span className="rounded-full bg-[var(--lv-warning-soft)] px-3 py-1 text-xs font-medium text-[var(--lv-warning)]">
                    Han entrado cambios remotos en el campo activo y se aplicaran al salir de el.
                  </span>
                ) : null}
                {flowerBirthRitualNotice ? (
                  <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-[var(--lv-primary-strong)]">
                    {flowerBirthRitualNotice}
                  </span>
                ) : null}
              </div>
            ) : null}

            {!canEnterFlowerBirthSealStage ? (
              <div className="mt-5 rounded-[24px] border border-dashed border-[color-mix(in_srgb,var(--lv-primary)_18%,white)] bg-white/55 px-5 py-4 text-sm text-[var(--lv-text-muted)]">
                Cuando las dos personas la marqueis como lista, se abrira aqui el gesto final de guardado conjunto.
              </div>
            ) : null}
          </section>
        ) : null}

        {flowerBirthPendingEntry ? null : (
        <div className="relative space-y-4">
          {flowerBirthEditingLocked ? (
            <div className="pointer-events-auto absolute inset-0 z-20 flex items-start justify-end rounded-[28px] bg-white/45 p-3 backdrop-blur-[2px]">
              <div className="max-w-sm rounded-[22px] border border-[var(--lv-warning)] bg-white/92 px-4 py-3 text-sm text-[var(--lv-warning)] shadow-[var(--lv-shadow-sm)]">
                La flor queda bloqueada mientras falta {companionReference}. Puedes salir, pero no seguir editando hasta que vuelva.
              </div>
            </div>
          ) : null}

          <div className="flex justify-end">
            <ChatShareButton
              onClick={() => void shareCurrentPageToChat()}
              busy={sharingToChat}
              recipientLabel={chatShareRecipientLabel}
              label="Compartir esta flor"
              busyLabel="Compartiendo flor..."
              disabled={!page}
            />
          </div>

          <PageDetailMainPanel
            page={page}
            msg={msg}
            mode={pageMode}
            completionState={pageCompletionState}
            hasUnsavedChanges={hasUnsavedChanges}
            rating={displayRating}
            onRatingChange={handleSharedRatingChange}
            ratingReadOnly={flowerBirthRatingLocked}
            ratingHint={
              flowerBirthRitualPending
                ? localFlowerBirthRating > 0
                  ? `Tu valoracion personal es ${localFlowerBirthRating}/5. Al cerrar el nacimiento compartido se guardara la media de ambas.`
                  : "Pon tu valoracion personal. Cuando las dos personas la hayan dejado, la flor guardara la media final."
                : "La valoracion quedo sellada con la media del nacimiento compartido y ya no puede modificarse."
            }
            onPlanSummaryChange={(value) =>
              setPage((prev) => (prev ? { ...prev, plan_summary: value } : prev))
            }
            onSummaryFocus={() => activateSharedTarget("summary")}
            onSummaryBlur={() => clearSharedTarget("summary")}
            summaryPresenceLabel={
              activeSharedTarget === "summary" && summaryEditorsLabel
                ? `${summaryEditorsLabel} tambien esta en el texto`
                : null
            }
            summaryConflictNotice={activeSharedTarget === "summary" && hasDeferredSharedFlowerSnapshot}
            saving={saving}
            deletingPage={deletingPage}
            onSave={() => void save()}
            hideSaveButton={flowerBirthRitualPending}
            hideEditTopControls={flowerBirthRitualPending}
            hideReadModeEditButton={flowerBirthRitualPending}
            backButtonLabel="Salir"
            onModeChange={handlePageModeChange}
            onCancelEdit={() => void handleCancelEdit()}
            onBackHome={requestExitToHome}
            onOpenDeleteConfirm={openDeleteConfirmModal}
            onToggleFavorite={toggleFavorite}
            onToggleYearHighlight={() => void toggleYearHighlight()}
            onUploadCoverPhoto={(file) => void uploadDedicatedCoverPhoto(file)}
            coverPhotoUrl={page.cover_photo_url ?? null}
            uploadingCoverPhoto={uploadingCoverPhoto}
            coverPresenceLabel={
              flowerBirthRitualPending && coverEditorsLabel
                ? `${coverEditorsLabel} tambien esta con la portada`
                : null
            }
            coverConflictNotice={flowerBirthRitualPending && activeSharedTarget === "cover" && hasDeferredSharedFlowerSnapshot}
            onCoverInteractionStart={() => handleSharedTargetStart("cover")}
            onCoverInteractionEnd={() => handleSharedTargetEnd("cover")}
            isYearHighlight={isYearHighlight}
            canToggleYearHighlight={canToggleYearHighlight}
            updatingYearHighlight={updatingYearHighlight}
            plantAssetSrc={plantAssetSrc}
            planTypeId={displayPlanContext.planTypeId}
            planTypeLabel={displayPlanContext.planTypeLabel}
            planTypeFlowerFamily={displayPlanContext.planTypeFlowerFamily}
            planTypeOptions={planTypeOptions}
            changingPlanType={changingPlanType}
            onPlanTypeChange={(value) => void updatePlanType(value)}
            planTypePresenceLabel={
              flowerBirthRitualPending && planTypeEditorsLabel
                ? `${planTypeEditorsLabel} tambien esta en el tipo de plan`
                : null
            }
            planTypeConflictNotice={
              flowerBirthRitualPending &&
              activeSharedTarget === "plan_type" &&
              hasDeferredSharedFlowerSnapshot
            }
            onPlanTypeInteractionStart={() => handleSharedTargetStart("plan_type")}
            onPlanTypeInteractionEnd={() => handleSharedTargetEnd("plan_type")}
            linkedSeedTitle={resolvedSeedContext.seedTitle}
            linkedPlaceKind={resolvedSeedContext.linkedPlaceKind}
            linkedPlaceLabel={resolvedSeedContext.linkedPlaceLabel}
            linkedRouteLabel={resolvedSeedContext.linkedRouteLabel}
            currentLocationLabel={locationLabel}
            audioDisplayUrl={audioUrl}
            layoutConfig={flowerPageLayoutConfig}
          />

          {readMode ? (
            <>
            <PageDetailCanvasSection
              pageId={id}
              activeGardenId={activeGardenId}
              canvasRef={canvasRef}
              objects={objects}
              readOnly
              onObjectsChange={setObjects}
              onPhotoUploadStateChange={handleCanvasPhotoUploadStateChange}
              onVideoUploadStateChange={handleCanvasVideoUploadStateChange}
              uploadTaskChannels={uploadTaskChannels}
              coverPhotoUrl={page.cover_photo_url ?? null}
              onPointerStateChange={undefined}
              remotePointers={[]}
            />

            <PageReflectionsPanel
              mode="read"
              reflectionsAvailable={reflectionFieldsAvailable}
              myDraft={myReflectionDraft}
              onDraftChange={(patch) =>
                setMyReflectionDraft((prev) => ({
                  ...prev,
                  ...patch,
                }))
              }
              otherReflections={otherReflections}
              config={flowerRuntimeConfig}
            />

            <PageContextSummarySection
              locationLabel={locationLabel}
              audioUrl={audioUrl}
              audioLabel={audioLabel}
              videoObjectsCount={videoObjectsCount}
              onEditContext={() =>
                openContextEditor(
                  locationLabel
                    ? "location"
                    : audioUrl
                      ? "audio"
                      : videoObjectsCount > 0
                        ? "video"
                        : "location",
                )
              }
              config={flowerRuntimeConfig}
            />
            </>
          ) : (
            <>
            <section className="lv-card p-3">
              <div className="grid gap-2 md:grid-cols-3">
                <button
                  type="button"
                  className={`rounded-[22px] border px-4 py-3 text-left transition ${
                    detailSection === "canvas"
                      ? "border-[#8bb888] bg-[#eef8eb]"
                      : "border-[var(--lv-border)] bg-white/85 hover:bg-[#f8faf4]"
                  }`}
                  onClick={() => setDetailSection("canvas")}
                >
                  <div className="text-sm font-semibold text-[var(--lv-text)]">Lienzo</div>
                  <div className="mt-1 text-xs text-[var(--lv-text-muted)]">
                    Donde montas fotos, texto, stickers y la composicion del recuerdo.
                  </div>
                </button>
                <button
                  type="button"
                  className={`rounded-[22px] border px-4 py-3 text-left transition ${
                    detailSection === "reflections"
                      ? "border-[#8bb888] bg-[#eef8eb]"
                      : "border-[var(--lv-border)] bg-white/85 hover:bg-[#f8faf4]"
                  }`}
                  onClick={() => setDetailSection("reflections")}
                >
                  <div className="text-sm font-semibold text-[var(--lv-text)]">
                    Miradas {reflections.length ? `(${reflections.length})` : ""}
                  </div>
                  <div className="mt-1 text-xs text-[var(--lv-text-muted)]">
                    Lo que recordaste tu y lo que dejo este momento en la otra persona.
                  </div>
                </button>
                <button
                  type="button"
                  className={`rounded-[22px] border px-4 py-3 text-left transition ${
                    detailSection === "context"
                      ? "border-[#8bb888] bg-[#eef8eb]"
                      : "border-[var(--lv-border)] bg-white/85 hover:bg-[#f8faf4]"
                  }`}
                  onClick={() => setDetailSection("context")}
                >
                  <div className="text-sm font-semibold text-[var(--lv-text)]">Contexto</div>
                  <div className="mt-1 text-xs text-[var(--lv-text-muted)]">
                    Lugar y audio, solo cuando los necesitas tocar.
                  </div>
                </button>
              </div>
            </section>

            {detailSection === "canvas" ? (
              <PageDetailCanvasSection
                pageId={id}
                activeGardenId={activeGardenId}
                canvasRef={canvasRef}
                objects={objects}
                onObjectsChange={handleSharedCanvasObjectsChange}
                onPhotoUploadStateChange={handleCanvasPhotoUploadStateChange}
                onVideoUploadStateChange={handleCanvasVideoUploadStateChange}
                uploadTaskChannels={uploadTaskChannels}
                coverPhotoUrl={page.cover_photo_url ?? null}
                onPointerStateChange={
                  flowerBirthRitualPending
                    ? (pointer) => {
                        handleLocalCanvasPointerChange(pointer);
                        if (pointer) {
                          activateSharedTarget("canvas");
                        } else {
                          clearSharedTarget("canvas");
                        }
                      }
                    : undefined
                }
                remotePointers={flowerBirthRitualPending ? remoteCanvasPointers : []}
              />
            ) : null}

            {detailSection === "reflections" ? (
              <PageReflectionsPanel
                mode="edit"
                reflectionsAvailable={reflectionFieldsAvailable}
                myDraft={myReflectionDraft}
                onDraftChange={(patch) =>
                  setMyReflectionDraft((prev) => ({
                    ...prev,
                    ...patch,
                  }))
                }
                otherReflections={otherReflections}
                config={flowerRuntimeConfig}
              />
            ) : null}

            {detailSection === "context" ? (
              <section className="lv-card space-y-4 p-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Contexto
                  </div>
                  <div className="w-full max-w-2xl">
                    <h2 className="mt-1 text-xl font-semibold text-[var(--lv-text)]">
                      Lo que acompana al recuerdo
                    </h2>
                    <p className="mt-1 text-sm text-[var(--lv-text-muted)]">
                      Lugar, audio y video viven aqui para no pelear con el lienzo. Entra en uno y
                      ajustalo solo cuando haga falta.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={`lv-btn px-4 py-2 text-sm ${
                      contextSection === "location" ? "lv-tone-info" : "lv-btn-secondary"
                    }`}
                    onClick={() => setContextSection("location")}
                  >
                    Lugar {locationLabel ? "asociado" : ""}
                  </button>
                  <button
                    type="button"
                    className={`lv-btn px-4 py-2 text-sm ${
                      contextSection === "audio" ? "lv-tone-info" : "lv-btn-secondary"
                    }`}
                    onClick={() => setContextSection("audio")}
                  >
                    Audio {audioUrl ? "listo" : ""}
                  </button>
                  <button
                    type="button"
                    className={`lv-btn px-4 py-2 text-sm ${
                      contextSection === "video" ? "lv-tone-info" : "lv-btn-secondary"
                    }`}
                    onClick={() => setContextSection("video")}
                  >
                    Video {videoObjectsCount ? `(${videoObjectsCount})` : ""}
                  </button>
                </div>

                <div>
                  {contextSection === "location" ? (
                    <PageLocationCard
                      locationFieldsAvailable={locationFieldsAvailable}
                      locationLabel={locationLabel}
                      locationLat={locationLat}
                      locationLng={locationLng}
                      onOpenMapPicker={() => setShowLocationMapPicker(true)}
                      onClearLocation={clearSelectedLocation}
                      onInteractionStart={() => handleSharedTargetStart("location")}
                      onInteractionEnd={() => handleSharedTargetEnd("location")}
                      presenceLabel={
                        flowerBirthRitualPending && locationEditorsLabel
                          ? `${locationEditorsLabel} tambien esta en lugar`
                          : null
                      }
                      conflictNotice={
                        flowerBirthRitualPending &&
                        activeSharedTarget === "location" &&
                        hasDeferredSharedFlowerSnapshot
                      }
                      config={flowerRuntimeConfig}
                    />
                  ) : (
                    <PageAudioCard
                      mode={contextSection === "video" ? "video" : "audio"}
                      audioFieldsAvailable={audioFieldsAvailable}
                      audioLabel={audioLabel}
                      onAudioLabelChange={setAudioLabel}
                      uploadingAudio={uploadingAudio}
                      isRecordingAudio={isRecordingAudio}
                      canRecordAudio={canRecordAudio}
                      onStartRecording={() => void startAudioRecording()}
                      onStopRecording={stopAudioRecording}
                      onOpenExternalAudioUrl={openExternalAudioUrlModal}
                      onEnqueueAudioFiles={enqueueAudioFiles}
                      audioQueueLength={audioQueue.length}
                      hasActiveAudioItem={Boolean(activeAudioItem)}
                      hasFailedAudioItem={Boolean(failedAudioItem)}
                      audioQueueInfo={audioQueueInfo}
                      audioUrl={audioUrl}
                      onClearAudio={() => void clearAudio()}
                      videoObjectsCount={videoObjectsCount}
                      onAddVideoToCanvas={() => {
                        canvasRef.current?.addVideoFrame();
                        setDetailSection("canvas");
                      }}
                      onInteractionStart={() => handleSharedTargetStart("audio")}
                      onInteractionEnd={() => handleSharedTargetEnd("audio")}
                      presenceLabel={
                        flowerBirthRitualPending && audioEditorsLabel
                          ? `${audioEditorsLabel} tambien esta en audio`
                          : null
                      }
                      conflictNotice={
                        flowerBirthRitualPending &&
                        activeSharedTarget === "audio" &&
                        hasDeferredSharedFlowerSnapshot
                      }
                      config={flowerRuntimeConfig}
                    />
                  )}
                </div>
              </section>
            ) : null}
            </>
          )}
        </div>
        )}

        {flowerBirthRitualPending ? null : (
          <PageRevisionHistoryPanel
            revisions={flowerRevisions}
            revisionsAvailable={flowerRevisionsAvailable}
            currentUserId={myProfileId || null}
            draftSummary={liveRevisionSummary}
          />
        )}
      </div>

      {canEnterFlowerBirthSealStage ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,248,231,0.42)_0%,rgba(24,34,21,0.62)_72%)] p-3 backdrop-blur-[5px] md:p-4">
          <section className="relative w-full max-w-6xl overflow-hidden rounded-[38px] border border-[color-mix(in_srgb,var(--lv-primary)_20%,white)] bg-[linear-gradient(180deg,rgba(255,252,245,0.96)_0%,rgba(247,241,231,0.95)_42%,rgba(237,246,238,0.97)_100%)] shadow-[0_34px_90px_rgba(39,30,20,0.34)]">
            {page.cover_photo_url ? (
              <img
                src={page.cover_photo_url}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.14]"
              />
            ) : null}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,251,244,0.94)_0%,rgba(247,241,231,0.82)_40%,rgba(236,246,238,0.92)_100%)]" />
            <div className="pointer-events-none absolute -left-16 top-10 h-48 w-48 rounded-full bg-[rgba(236,205,176,0.45)] blur-3xl" />
            <div className="pointer-events-none absolute right-6 top-16 h-56 w-56 rounded-full bg-[rgba(182,219,190,0.32)] blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-1/2 h-40 w-[70%] -translate-x-1/2 rounded-full bg-[rgba(140,181,126,0.16)] blur-3xl" />

            <div className="relative z-10 max-h-[92vh] overflow-y-auto">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/55 px-5 py-5 md:px-6">
                <div className="max-w-3xl">
                  <div className="text-xs uppercase tracking-[0.22em] text-[var(--lv-text-muted)]">
                    Guardado compartido
                  </div>
                  <h3 className="mt-2 text-3xl font-semibold text-[var(--lv-text)] md:text-[2.2rem]">
                    {page.title ?? "Flor compartida"}
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--lv-text-muted)] md:text-[15px]">
                    La flor ya esta preparada. Ahora el nacimiento se cierra con un gesto unico:
                    las dos personas la sosteneis a la vez y la dejais guardada como memoria
                    compartida.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
                    <span className="rounded-full border border-[var(--lv-border)] bg-white/84 px-3 py-1">
                      {readyFlowerBirthParticipantsCount}/{requiredSharedParticipants} a punto
                    </span>
                    <span className="rounded-full border border-[var(--lv-border)] bg-white/84 px-3 py-1">
                      Media provisional{" "}
                      {flowerBirthAverageRating != null
                        ? `${flowerBirthAverageRating.toFixed(1)}/5`
                        : "pendiente"}
                    </span>
                    <span className="rounded-full border border-[var(--lv-border)] bg-white/84 px-3 py-1">
                      {objects.length} pieza(s) en el lienzo
                    </span>
                  </div>
                  {flowerBirthRitualNotice ? (
                    <div className="mt-3 inline-flex rounded-[18px] border border-[var(--lv-primary)] bg-white/78 px-3 py-2 text-sm text-[var(--lv-primary-strong)] shadow-[var(--lv-shadow-sm)]">
                      {flowerBirthRitualNotice}
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  className="lv-btn lv-btn-secondary"
                  onClick={returnToFlowerBirthDraftStage}
                  disabled={saving}
                >
                  Seguir preparando
                </button>
              </div>

              <div className="grid gap-5 px-4 pb-5 pt-5 md:px-5 lg:grid-cols-[minmax(250px,290px)_minmax(0,1fr)_minmax(260px,300px)] lg:pb-6">
                <aside className="rounded-[30px] border border-[color-mix(in_srgb,var(--lv-primary)_14%,white)] bg-white/72 p-4 shadow-[var(--lv-shadow-sm)] backdrop-blur-md">
                  <div className="text-xs uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Compas compartido
                  </div>
                  <h4 className="mt-2 text-lg font-semibold text-[var(--lv-text)]">
                    Quien sostiene este nacimiento
                  </h4>
                  <div className="mt-4 space-y-3">
                    {flowerBirthRitualParticipants.map((participant) => {
                      const participantRating =
                        flowerBirthRatingsByUserId.get(participant.userId) ?? 0;
                      const participantReady =
                        participant.ready || flowerBirthReadyUserIds.has(participant.userId);

                      return (
                        <div
                          key={`flower-birth-seal:${participant.userId}`}
                          className="rounded-[22px] border border-[var(--lv-border)] bg-white/78 p-3 shadow-[0_10px_22px_rgba(36,44,31,0.08)]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-[var(--lv-text)]">
                                {participant.name}
                              </div>
                              <div className="mt-1 text-xs text-[var(--lv-text-muted)]">
                                {participant.focusLabel ??
                                  participant.activityLabel ??
                                  "Mirando la flor"}
                              </div>
                            </div>
                            <span
                              className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full shadow-[0_0_0_4px_rgba(255,255,255,0.6)]"
                              style={{
                                backgroundColor: flowerPresenceColor(participant.userId),
                              }}
                            />
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
                            <span
                              className={`rounded-full px-2.5 py-1 ${
                                participantReady
                                  ? "bg-[var(--lv-primary-soft)] text-[var(--lv-primary-strong)]"
                                  : "bg-[var(--lv-surface-elevated)]"
                              }`}
                            >
                              {participantReady ? "a punto" : "preparando"}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-1 ${
                                participant.holding
                                  ? "bg-[var(--lv-warning-soft)] text-[var(--lv-warning)]"
                                  : "bg-[var(--lv-surface-elevated)]"
                              }`}
                            >
                              {participant.holding ? "sosteniendo" : "esperando"}
                            </span>
                            <span className="rounded-full bg-[color-mix(in_srgb,var(--lv-surface)_92%,white)] px-2.5 py-1">
                              {participantRating > 0
                                ? `${participantRating}/5`
                                : "sin valorar"}
                            </span>
                            {participant.userId === flowerBirthLeaderUserId ? (
                              <span className="rounded-full bg-[color-mix(in_srgb,var(--lv-warning-soft)_92%,white)] px-2.5 py-1 text-[var(--lv-warning)]">
                                lider del cierre
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </aside>

                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    {flowerBirthSealStepItems.map((step) => (
                      <article
                        key={step.id}
                        className={`rounded-[24px] border p-4 shadow-[var(--lv-shadow-sm)] ${
                          step.done
                            ? "border-[color-mix(in_srgb,var(--lv-primary)_18%,white)] bg-[color-mix(in_srgb,var(--lv-primary-soft)_78%,white)]"
                            : step.active
                              ? "border-[color-mix(in_srgb,var(--lv-warning)_22%,white)] bg-[color-mix(in_srgb,var(--lv-warning-soft)_84%,white)]"
                              : "border-[var(--lv-border)] bg-white/72"
                        }`}
                      >
                        <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                          {step.label}
                        </div>
                        <div className="mt-2 text-sm font-medium text-[var(--lv-text)]">
                          {step.detail}
                        </div>
                      </article>
                    ))}
                  </div>

                  <div className="lv-flower-birth-ritual-stage relative overflow-hidden rounded-[34px] border border-[color-mix(in_srgb,var(--lv-primary)_18%,white)] px-5 py-5 shadow-[0_24px_50px_rgba(57,46,32,0.12)] md:px-6 md:py-6">
                    <div className="text-center text-sm font-medium text-[var(--lv-text)]">
                      {flowerBirthHoldStatusLabel}
                    </div>
                    <div className="mt-2 text-center text-[11px] uppercase tracking-[0.22em] text-[var(--lv-text-muted)]">
                      {requiredSharedParticipants > 1
                        ? "Las dos personas teneis que mantener la flor al mismo tiempo"
                        : "Manten la flor unos segundos"}
                    </div>

                    <div className="relative mx-auto mt-6 flex min-h-[380px] w-full max-w-[520px] items-end justify-center pb-4">
                      <div className="lv-flower-birth-aura absolute bottom-4 left-1/2 h-[220px] w-[220px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,241,219,0.92)_0%,rgba(247,214,189,0.4)_48%,rgba(255,255,255,0)_78%)]" />
                      <div className="lv-flower-birth-aura absolute bottom-0 left-1/2 h-[320px] w-[320px] -translate-x-1/2 rounded-full border border-white/45" />
                      <div
                        className={`lv-capsule-ritual-orbit absolute bottom-18 left-1/2 h-[220px] w-[220px] -translate-x-1/2 rounded-full border border-white/40 ${
                          flowerBirthHoldCanProgress ? "opacity-100" : "opacity-60"
                        }`}
                      />
                      <div
                        className={`lv-capsule-ritual-orbit absolute bottom-8 left-1/2 h-[320px] w-[320px] -translate-x-1/2 rounded-full border border-[color-mix(in_srgb,var(--lv-primary)_24%,white)] ${
                          canArmFlowerBirthHold ? "opacity-100" : "opacity-60"
                        }`}
                      />
                      <span className="lv-flower-birth-petal lv-flower-birth-petal-1 absolute left-[14%] top-[21%]" />
                      <span className="lv-flower-birth-petal lv-flower-birth-petal-2 absolute right-[14%] top-[18%]" />
                      <span className="lv-flower-birth-petal lv-flower-birth-petal-3 absolute left-[10%] bottom-[22%]" />
                      <span className="lv-flower-birth-petal lv-flower-birth-petal-4 absolute right-[10%] bottom-[25%]" />

                      <button
                        type="button"
                        disabled={!canArmFlowerBirthHold || saving}
                        onPointerDown={handleFlowerBirthHoldStart}
                        onPointerUp={handleFlowerBirthHoldEnd}
                        onPointerLeave={handleFlowerBirthHoldEnd}
                        onPointerCancel={handleFlowerBirthHoldEnd}
                        onDragStart={(event) => event.preventDefault()}
                        className={`lv-capsule-ritual-shell lv-flower-birth-shell relative z-10 flex h-[300px] w-[300px] touch-none select-none flex-col items-center justify-end overflow-hidden rounded-full border px-8 pb-9 pt-12 transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          canArmFlowerBirthHold ? "lv-capsule-ritual-shell-armed" : ""
                        } ${flowerBirthHoldCanProgress ? "lv-capsule-ritual-shell-holding" : ""}`}
                        style={{
                          touchAction: "none",
                          userSelect: "none",
                          WebkitUserSelect: "none",
                          WebkitTouchCallout: "none",
                        }}
                      >
                        <span className="sr-only">{flowerBirthHoldStatusLabel}</span>
                        <span className="absolute inset-[7%] rounded-full border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.74)_0%,rgba(255,255,255,0.12)_44%,rgba(104,67,42,0.1)_100%)]" />
                        <span className="absolute inset-x-[14%] bottom-[10%] overflow-hidden rounded-full">
                          <span
                            className="lv-capsule-ritual-fill absolute inset-x-0 bottom-0"
                            style={{
                              height: `${Math.max(
                                flowerBirthHoldProgressPercent > 0 ? 10 : 0,
                                flowerBirthHoldProgressPercent,
                              )}%`,
                            }}
                          />
                          <span className="lv-capsule-ritual-fill-glow absolute inset-x-0 bottom-0 h-8" />
                        </span>
                        <span
                          className={`lv-capsule-ritual-halo absolute inset-[2.5%] rounded-full ${
                            flowerBirthHoldCanProgress ? "opacity-100" : "opacity-60"
                          }`}
                        />
                        <span className="absolute left-1/2 top-[10%] flex h-20 w-20 -translate-x-1/2 items-center justify-center rounded-full border border-[rgba(198,130,91,0.42)] bg-[radial-gradient(circle,#ffe5d6_0%,#efb996_55%,#d78360_100%)] text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-[#fff8f3] shadow-[0_16px_28px_rgba(144,78,48,0.24)]">
                          {flowerBirthHoldProgressPercent > 0
                            ? `${flowerBirthHoldProgressPercent}%`
                            : "Guardar"}
                        </span>
                        <span className="relative z-10 flex select-none flex-col items-center text-center">
                          <span className="rounded-full border border-white/55 bg-white/70 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-[var(--lv-text-muted)] backdrop-blur">
                            Nacimiento compartido
                          </span>
                          <span className="mt-8 flex h-32 w-32 items-center justify-center rounded-full border border-white/50 bg-white/38 p-4 shadow-[inset_0_10px_26px_rgba(255,255,255,0.34)] backdrop-blur">
                            <img
                              src={plantAssetSrc}
                              alt=""
                              draggable={false}
                              className={`h-full w-full object-contain transition ${
                                flowerBirthHoldCanProgress ? "scale-110" : "scale-100"
                              }`}
                            />
                          </span>
                          <span className="mt-4 text-xl font-semibold text-[var(--lv-text)]">
                            {page.title ?? "Flor compartida"}
                          </span>
                          <span className="mt-2 max-w-[220px] text-sm leading-6 text-[var(--lv-text-muted)]">
                            Cuando ambas la mantengais, el nacimiento quedara cerrado y guardado.
                          </span>
                        </span>
                      </button>
                    </div>

                    <div className="mx-auto max-w-xl">
                      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                        <span>Guardado compartido</span>
                        <span>{flowerBirthHoldProgressPercent}%</span>
                      </div>
                      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--lv-primary-soft)_78%,white)]">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#d98f6a_0%,#b56249_100%)] transition-all"
                          style={{
                            width: `${Math.max(
                              flowerBirthHoldProgressPercent > 0 ? 8 : 0,
                              flowerBirthHoldProgressPercent,
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <aside className="rounded-[30px] border border-[color-mix(in_srgb,var(--lv-primary)_14%,white)] bg-white/72 p-4 shadow-[var(--lv-shadow-sm)] backdrop-blur-md">
                  <div className="text-xs uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Lo que queda sellado
                  </div>
                  <h4 className="mt-2 text-lg font-semibold text-[var(--lv-text)]">
                    Esta flor ya tiene materia viva
                  </h4>
                  <p className="mt-2 text-sm leading-6 text-[var(--lv-text-muted)]">
                    Este gesto no cierra un formulario. Cierra la primera forma compartida de la
                    flor para que despues pueda seguir creciendo sin perder este origen comun.
                  </p>

                  {String(page.plan_summary ?? "").trim() ? (
                    <blockquote className="mt-4 rounded-[22px] border border-[rgba(210,193,165,0.7)] bg-[rgba(255,250,241,0.88)] px-4 py-4 text-sm leading-6 text-[var(--lv-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                      “{String(page.plan_summary ?? "").trim()}”
                    </blockquote>
                  ) : null}

                  <div className="mt-4 space-y-2.5">
                    {flowerBirthSealSummaryItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-3 rounded-[20px] border border-[var(--lv-border)] bg-white/78 px-3 py-3"
                      >
                        <div className="min-w-0">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                            {item.label}
                          </div>
                          <div className="mt-1 text-sm text-[var(--lv-text)]">
                            {item.value}
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] ${
                            item.ready
                              ? "bg-[var(--lv-primary-soft)] text-[var(--lv-primary-strong)]"
                              : "bg-[var(--lv-surface-elevated)] text-[var(--lv-text-muted)]"
                          }`}
                        >
                          {item.ready ? "listo" : "pendiente"}
                        </span>
                      </div>
                    ))}
                  </div>
                </aside>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      <PageDetailDialogs
        showExternalAudioModal={showExternalAudioModal}
        externalAudioDraft={externalAudioDraft}
        uploadingAudio={uploadingAudio}
        onExternalAudioDraftChange={setExternalAudioDraft}
        onSubmitExternalAudioUrl={() => void submitExternalAudioUrl()}
        onCloseExternalAudioModal={() => {
          if (uploadingAudio) return;
          setShowExternalAudioModal(false);
          setExternalAudioDraft("");
        }}
        showDeleteConfirmModal={showDeleteConfirmModal}
        deletingPage={deletingPage}
        onConfirmDelete={() => void confirmDeleteCurrentPage()}
        onCloseDeleteConfirm={() => {
          if (deletingPage) return;
          setShowDeleteConfirmModal(false);
        }}
        showUnsavedLeaveModal={showUnsavedLeaveModal}
        leavingWithoutSaving={leavingWithoutSaving}
        onConfirmLeaveWithoutSaving={() => void confirmLeaveWithoutSaving()}
        onCloseUnsavedLeaveModal={closeUnsavedLeaveModal}
        showYearHighlightReplaceModal={showYearHighlightReplaceModal}
        yearHighlightYear={pageYear}
        yearHighlightTargetTitle={currentPageHighlightTitle}
        yearHighlightTargetDate={page.date}
        yearHighlightItems={yearHighlightDialogItems}
        updatingYearHighlight={updatingYearHighlight}
        onReplaceYearHighlight={(pageId) => void replaceYearHighlightWithCurrentPage(pageId)}
        onCloseYearHighlightReplaceModal={closeYearHighlightReplaceModal}
      />

      {showLocationMapPicker ? (
        <PageLocationMapPickerDialog
          open
          pageId={id}
          selectedYearValue={String(page.date ?? "").slice(0, 4)}
          onClose={() => setShowLocationMapPicker(false)}
          onPickPlace={(place) => {
            const label =
              String(place.title ?? "").trim() ||
              String(place.subtitle ?? "").trim() ||
              String(place.addressLabel ?? "").trim() ||
              "Lugar del mapa";
            const subtitle = String(place.subtitle ?? "").trim();
            applyLoadedLocation({
              label: subtitle ? `${label} - ${subtitle}` : label,
              lat: String(place.lat),
              lng: String(place.lng),
            });
            setMsg("Lugar vinculado desde el mapa.");
            setContextSection("location");
          }}
        />
      ) : null}
    </div>
  );
}
