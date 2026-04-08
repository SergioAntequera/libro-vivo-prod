"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getSessionAccessToken } from "@/lib/auth";
import {
  annualTreePhaseLabel,
} from "@/lib/annualTreeEngine";
import {
  buildCanonicalAnnualTreeSnapshot,
  countAnnualTreeMilestonesForYear,
} from "@/lib/annualTreeCanonical";
import {
  buildAnnualTreeSnapshotFromState,
  indexGardenYearTreeStatesByYear,
} from "@/lib/annualTreeState";
import {
  RITUAL_PREVIEW_MODE,
  type AnnualTreeCheckInRow,
  type AnnualTreeCheckInStatus,
  isRitualEligible,
  ritualStatusLabel,
  type AnnualTreeRitualRow,
} from "@/lib/annualTreeRitual";
import { roleLabel } from "@/lib/roles";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { StatusNotice } from "@/components/ui/StatusNotice";
import ActiveTrailPreviewCard from "@/components/home/ActiveTrailPreviewCard";
import TrailEventMarkersLayer from "@/components/home/TrailEventMarkersLayer";
import TrailFocusBadgesLayer from "@/components/home/TrailFocusBadgesLayer";
import TrailSummitAvatarLayer from "@/components/home/TrailSummitAvatarLayer";
import TrailDateSlider from "@/components/home/TrailDateSlider";
import HomeFullscreenPanel from "@/components/home/HomeFullscreenPanel";
import HomeDailyFocusCard from "@/components/home/HomeDailyFocusCard";
import HomeFirstWalkthrough from "@/components/home/HomeFirstWalkthrough";
import HomeFuturePromisesPanel from "@/components/home/HomeFuturePromisesPanel";
import HomeHillMobileTeaser from "@/components/home/HomeHillMobileTeaser";
import HomeMapSummaryCard from "@/components/home/HomeMapSummaryCard";
import HomePathSummaryView from "@/components/home/HomePathSummaryView";
import HomeMemoriesMapSection from "@/components/home/HomeMemoriesMapSection";
import HomeTopHeaderCard from "@/components/home/HomeTopHeaderCard";
import HomeTrailSceneFrame from "@/components/home/HomeTrailSceneFrame";
import { useGardenChatUnreadCount } from "@/components/chat/useGardenChatUnreadCount";
import TrailSceneTerrainLayer from "@/components/home/TrailSceneTerrainLayer";
import { useHomeTrailInteractions } from "@/components/home/useHomeTrailInteractions";
import { useHomeBootstrapData } from "@/components/home/useHomeBootstrapData";
import { useHomeActivityUnseenCount } from "@/components/home/useHomeActivityUnseenCount";
import { useHomeMapMemoriesFilters } from "@/components/home/useHomeMapMemoriesFilters";
import { normalizeAccessibleHomeTrailBackgroundAssetUrl } from "@/lib/homeTrailBackgroundAsset";
import {
  useHomeTrailEvents,
  type PathEvent,
} from "@/components/home/useHomeTrailEvents";
import {
  formatFocusDate,
  eventKindLabel,
  inferLandscapeAssetFromScene,
  parseIsoLocal,
  seasonFromIso,
  sortEventsForDisplay,
  todayIsoLocal,
  trailEventAnchor,
  trailMarkerFrameSize,
  trailMarkerIconSize,
} from "@/lib/homePageUtils";
import type { MapPlaceRecord, MapRouteRecord, MapZoneRecord } from "@/lib/mapDomainTypes";
import { assignItemsToSceneRegions } from "@/lib/homeSceneRegions";
import {
  DEFAULT_LANDSCAPE_ASSET,
  SEASON_THEME,
} from "@/lib/homeSceneDefaults";
import {
  buildTrailPoints,
  computeTrailMarkerSpreadOffsets,
  resolveTrailGeometry,
  clampRange,
  computeFocusAvatarOffset,
  trailPerspectiveScale,
  type TrailPoint,
} from "@/lib/homeTrailGeometry";
import { computeActiveTrailPreviewCardPos } from "@/lib/homeTrailPreviewLayout";
import { resolveHomeSceneScale } from "@/lib/homeSceneScale";
import {
  resolveHomeWelcomeText,
  resolveProfileAvatarSrc,
} from "@/lib/productIdentity";
import {
  capsuleStatusLabel,
  capsuleWindowLabel,
  isCapsuleReady,
  type TimeCapsuleRow,
} from "@/lib/timeCapsuleModel";
import {
  getProductSurfaceHref,
  getYearBookHref,
} from "@/lib/productSurfaces";
import AnnualTreeRitualPopup from "@/components/year/AnnualTreeRitualPopup";
import AnnualTreeAnniversaryPopup from "@/components/year/AnnualTreeAnniversaryPopup";
import {
  getHomeCapsuleAction,
  getHomeRitualAction,
} from "@/lib/futureMomentsRuntime";
import {
  DEFAULT_FUTURE_MOMENTS_CONFIG,
  getFutureMomentsConfig,
  type FutureMomentsConfig,
} from "@/lib/futureMomentsConfig";

type TrailDayLayout = {
  iso: string;
  point: TrailPoint;
  primaryEvent: PathEvent;
  hiddenCount: number;
};

type TrailDayVisualLayout = TrailDayLayout & {
  baseAnchor?: { x: number; y: number };
  anchor: { x: number; y: number };
  frame: { width: number; height: number };
  size: number;
};

type MapSelectionMode = "seed_place" | "ritual_place";

type RitualDraft = {
  locationLabel: string;
  locationLat: number | null;
  locationLng: number | null;
  notes: string;
};

type AnniversaryDraft = {
  status: AnnualTreeCheckInStatus;
  locationLabel: string;
  locationLat: number | null;
  locationLng: number | null;
  notes: string;
  photoUrl: string;
};

type RitualPopupMode = "planting" | "anniversary";
type HomeNotice = {
  id: string;
  title: string;
  message: string;
};
type HomeNoticeState = HomeNotice | string | null;

const HOME_TOUR_PENDING_STORAGE_KEY = "lv-home-first-walk:pending";

const HOME_FIRST_WALK_STEPS = [
  {
    targetId: "header-card",
    title: "Aqui vive vuestro jardin",
    description:
      "Esta cabecera reune el saludo, el año activo y la entrada a lo principal del jardin.",
  },
  {
    targetId: "header-menu",
    title: "Menu rapido",
    description:
      "Desde aqui abris actividad, chat, bosque, hitos, vinculos y vuestro perfil sin perder el hilo.",
  },
  {
    targetId: "plant-seed",
    title: "Plantar una semilla",
    description:
      "Aqui empieza un plan nuevo. Si necesita preparacion previa, el propio flujo os guiara antes de plantarlo.",
  },
  {
    targetId: "daily-focus",
    title: "Lo importante de hoy",
    description:
      "Este bloque deja a la vista el momento principal del dia, el sendero y la subida a la colina.",
  },
  {
    targetId: "map-summary",
    title: "Mapa vivo",
    description:
      "Aqui vereis lugares, rutas y recuerdos conectados para moveros mejor por vuestra historia compartida.",
  },
] as const;

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [homeBootstrapReloadTick, setHomeBootstrapReloadTick] = useState(0);
  const [gardenCompanionAvatars, setGardenCompanionAvatars] = useState<
    Array<{ src: string; alt: string }>
  >([]);
  const [landscapeAssetFailed, setLandscapeAssetFailed] = useState(false);
  const [customLandscapeFailed, setCustomLandscapeFailed] = useState(false);
  const [useLandscapeFallback, setUseLandscapeFallback] = useState(false);
  const [jumpDate, setJumpDate] = useState(todayIsoLocal());
  const [plantingEventIds, setPlantingEventIds] = useState<Record<string, number>>({});
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const [localMapPlaces, setLocalMapPlaces] = useState<MapPlaceRecord[]>([]);
  const [localMapRoutes, setLocalMapRoutes] = useState<MapRouteRecord[]>([]);
  const [localMapZones, setLocalMapZones] = useState<MapZoneRecord[]>([]);
  const [homeNotice, setHomeNotice] = useState<HomeNoticeState>(null);
  const [homeNoticeBusy, setHomeNoticeBusy] = useState(false);
  const [homeCapsules, setHomeCapsules] = useState<TimeCapsuleRow[]>([]);
  const [homeRituals, setHomeRituals] = useState<AnnualTreeRitualRow[]>([]);
  const [homeRitualCheckIns, setHomeRitualCheckIns] = useState<AnnualTreeCheckInRow[]>([]);
  const [futureMomentsConfig, setFutureMomentsConfig] = useState<FutureMomentsConfig>(
    DEFAULT_FUTURE_MOMENTS_CONFIG,
  );
  const [showFirstWalkthrough, setShowFirstWalkthrough] = useState(false);
  const [secondaryHomeDataReady, setSecondaryHomeDataReady] = useState(false);
  const [ritualPopupMode, setRitualPopupMode] = useState<RitualPopupMode | null>(null);
  const [ritualDraft, setRitualDraft] = useState<RitualDraft>({
    locationLabel: "",
    locationLat: null,
    locationLng: null,
    notes: "",
  });
  const [anniversaryDraft, setAnniversaryDraft] = useState<AnniversaryDraft>({
    status: "growing",
    locationLabel: "",
    locationLat: null,
    locationLng: null,
    notes: "",
    photoUrl: "",
  });

  const currentYear = new Date().getFullYear();
  const ritualPromptYear = currentYear - 1;
  const [focusDate, setFocusDate] = useState(todayIsoLocal());
  const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
  const [dateTo, setDateTo] = useState(`${currentYear}-12-31`);
  const [pendingHomeTour, setPendingHomeTour] = useState(false);
  const immersiveMode = useMemo(() => {
    const raw = searchParams.get("immersive");
    if (raw === "hill" || raw === "map" || raw === "path") return raw;
    return null;
  }, [searchParams]);
  const mapSelectionMode = useMemo<MapSelectionMode | null>(() => {
    const raw = String(searchParams.get("pick") ?? "").trim().toLowerCase();
    if (raw === "seed_place" || raw === "ritual_place") return raw;
    return null;
  }, [searchParams]);
  const ritualPopupRequested = searchParams.get("ritual_popup") === "1";
  const homeTourRequested = searchParams.get("tour") === "1" || pendingHomeTour;
  const ritualPopupModeFromSearch = useMemo<RitualPopupMode | null>(() => {
    const raw = String(searchParams.get("ritual_mode") ?? "").trim().toLowerCase();
    if (raw === "planting" || raw === "anniversary") return raw;
    return null;
  }, [searchParams]);
  const pickedPlaceIdFromSearch = String(searchParams.get("picked_place_id") ?? "").trim();
  const mapSelectionReturnTo = useMemo(() => {
    const raw = String(searchParams.get("return_to") ?? "").trim();
    if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
    if (mapSelectionMode === "ritual_place") {
      const params = new URLSearchParams();
      params.set("ritual_popup", "1");
      params.set("ritual_mode", ritualPopupModeFromSearch ?? "planting");
      return `${getProductSurfaceHref("home")}?${params.toString()}`;
    }
    return getProductSurfaceHref("plans");
  }, [mapSelectionMode, ritualPopupModeFromSearch, searchParams]);

  const seenEventIdsRef = useRef<Set<string>>(new Set());
  const seededSeenEventsRef = useRef(false);
  const homeTourHandledRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPendingHomeTour(window.sessionStorage.getItem(HOME_TOUR_PENDING_STORAGE_KEY) === "1");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(hover: none) and (pointer: coarse)");
    const update = () => setIsCoarsePointer(media.matches);
    update();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }
    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  const requireLogin = useCallback(() => {
    router.push(getProductSurfaceHref("login"));
  }, [router]);

  const {
    profile,
    activeGardenId,
    settings,
    loading,
    hasGarden,
    fetchWarning,
    bloomedStatusCode,
    seedRows,
    unlocks,
    rulesById,
    pageRows,
    pageElementById,
    pageVisualStateById,
    pagePlanVisualById,
    bloomPagePreviewById,
    mapMemories,
    mapPlaces,
    mapRoutes,
    mapZones,
    treeIconByTier,
    defaultTreeIcon,
    sceneTokens,
    homeTrailConfig,
    annualTreeStates,
    refreshProfile: refreshHomeProfile,
  } = useHomeBootstrapData({
    homeBootstrapReloadTick,
    onRequireLogin: requireLogin,
  });
  const homeChatUnreadCount = useGardenChatUnreadCount({
    gardenId: activeGardenId,
    myProfileId: profile?.id ?? null,
    enabled: !loading && secondaryHomeDataReady,
  });
  const ritualDraftStorageKey = useMemo(
    () => (profile?.id ? `home:ritual-draft:${profile.id}:${ritualPromptYear}` : null),
    [profile?.id, ritualPromptYear],
  );
  const fallbackCompanionAvatars = useMemo(
    () =>
      profile
        ? [
            {
              src: resolveProfileAvatarSrc({
                avatarUrl: profile.avatar_url,
                pronoun: profile.pronoun,
                role: profile.role,
              }),
              alt: profile.name?.trim() || "Tu lado",
            },
          ]
        : [],
    [profile],
  );

  // Onboarding: users without a garden should land in the welcome flow first.
  useEffect(() => {
    if (!loading && !hasGarden && profile && !homeTourRequested) {
      router.replace("/welcome");
    }
  }, [loading, hasGarden, homeTourRequested, profile, router]);
  const activityUnseenCount = useHomeActivityUnseenCount({
    activeGardenId,
    pageRows,
    profile,
    rulesById,
    unlocks,
    enabled: !loading && secondaryHomeDataReady,
  });
  const homeFirstWalkStorageKey = useMemo(() => {
    if (!profile?.id || !activeGardenId) return null;
    return `lv-home-first-walk:v1:${profile.id}:${activeGardenId}`;
  }, [activeGardenId, profile?.id]);

  const closeFirstWalkthrough = useCallback(() => {
    if (typeof window !== "undefined") {
      if (homeFirstWalkStorageKey) {
        window.localStorage.setItem(homeFirstWalkStorageKey, "1");
      }
      window.sessionStorage.removeItem(HOME_TOUR_PENDING_STORAGE_KEY);
    }
    setPendingHomeTour(false);
    setShowFirstWalkthrough(false);
    const params = new URLSearchParams(searchParams.toString());
    if (params.get("tour") === "1") {
      params.delete("tour");
      const nextQuery = params.toString();
      router.replace(
        nextQuery
          ? `${getProductSurfaceHref("home")}?${nextQuery}`
          : getProductSurfaceHref("home"),
        { scroll: false },
      );
    }
  }, [homeFirstWalkStorageKey, router, searchParams]);

  const refreshHomeBootstrap = useCallback(() => {
    setHomeBootstrapReloadTick((prev) => prev + 1);
  }, []);

  const dismissHomeNotice = useCallback(
    async (nextHref?: string) => {
      const currentNotice = homeNotice;
      if (!currentNotice || typeof currentNotice === "string" || homeNoticeBusy) {
        if (typeof currentNotice === "string") {
          setHomeNotice(null);
        }
        if (nextHref) router.push(nextHref);
        return;
      }

      setHomeNoticeBusy(true);
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
            body: JSON.stringify({ noticeIds: [currentNotice.id] }),
          });
        }
      } catch {
        // El aviso volvera a aparecer si no se pudo marcar como leido.
      } finally {
        setHomeNotice(null);
        setHomeNoticeBusy(false);
        if (nextHref) router.push(nextHref);
      }
    },
    [homeNotice, homeNoticeBusy, router],
  );

  useEffect(() => {
    if (!homeTourRequested || loading || !hasGarden || immersiveMode) return;
    if (homeTourHandledRef.current) return;
    homeTourHandledRef.current = true;
    setShowFirstWalkthrough(true);
  }, [hasGarden, homeTourRequested, immersiveMode, loading]);

  useEffect(() => {
    if (loading || !hasGarden || !activeGardenId || typeof window === "undefined") {
      setSecondaryHomeDataReady(false);
      return;
    }
    setSecondaryHomeDataReady(false);
    const timeoutId = window.setTimeout(() => {
      setSecondaryHomeDataReady(true);
    }, 150);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeGardenId, hasGarden, loading]);

  useEffect(() => {
    setLocalMapPlaces(mapPlaces);
  }, [mapPlaces]);

  useEffect(() => {
    setLocalMapRoutes(mapRoutes);
  }, [mapRoutes]);

  useEffect(() => {
    setLocalMapZones(mapZones);
  }, [mapZones]);

  useEffect(() => {
    let active = true;

    async function loadCompanionAvatars() {
      if (!secondaryHomeDataReady || !profile || !activeGardenId) {
        if (active) setGardenCompanionAvatars(fallbackCompanionAvatars);
        return;
      }

      try {
        const membersRes = await supabase
          .from("garden_members")
          .select("user_id,joined_at")
          .eq("garden_id", activeGardenId)
          .is("left_at", null)
          .order("joined_at", { ascending: true });

        if (membersRes.error) throw membersRes.error;

        const memberIds = (((membersRes.data as Array<{ user_id?: string | null }> | null) ?? [])
          .map((row) => String(row.user_id ?? "").trim())
          .filter(Boolean));

        if (!memberIds.length) {
          if (active) setGardenCompanionAvatars(fallbackCompanionAvatars);
          return;
        }

        const profilesRes = await supabase
          .from("profiles")
          .select("id,name,avatar_url,pronoun,role")
          .in("id", memberIds);

        if (profilesRes.error) throw profilesRes.error;

        const profileById = new Map(
          (((profilesRes.data as Array<{
            id?: string | null;
            name?: string | null;
            avatar_url?: string | null;
            pronoun?: string | null;
            role?: string | null;
          }> | null) ?? [])).map((row) => [String(row.id ?? "").trim(), row] as const),
        );

        const nextAvatars = memberIds
          .map((memberId) => {
            const memberProfile = profileById.get(memberId);
            const name = String(memberProfile?.name ?? "").trim();
            return {
              src: resolveProfileAvatarSrc({
                avatarUrl: memberProfile?.avatar_url ?? null,
                pronoun: memberProfile?.pronoun ?? null,
                role: memberProfile?.role ?? null,
              }),
              alt: name || (memberId === profile.id ? "Tu lado" : "Miembro del jardin"),
            };
          })
          .filter((entry, index, array) => {
            const duplicateIndex = array.findIndex(
              (candidate) => candidate.src === entry.src && candidate.alt === entry.alt,
            );
            return duplicateIndex === index;
          });

        if (active) {
          setGardenCompanionAvatars(nextAvatars.length ? nextAvatars : fallbackCompanionAvatars);
        }
      } catch {
        if (active) setGardenCompanionAvatars(fallbackCompanionAvatars);
      }
    }

    void loadCompanionAvatars();
    return () => {
      active = false;
    };
  }, [activeGardenId, fallbackCompanionAvatars, profile, secondaryHomeDataReady]);

  useEffect(() => {
    if (!ritualDraftStorageKey || typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem(ritualDraftStorageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<RitualDraft>;
      setRitualDraft({
        locationLabel: String(parsed.locationLabel ?? "").trim(),
        locationLat:
          typeof parsed.locationLat === "number" && Number.isFinite(parsed.locationLat)
            ? parsed.locationLat
            : null,
        locationLng:
          typeof parsed.locationLng === "number" && Number.isFinite(parsed.locationLng)
            ? parsed.locationLng
            : null,
        notes: String(parsed.notes ?? "").trim(),
      });
    } catch {
      // Ignore broken ritual drafts.
    }
  }, [ritualDraftStorageKey]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const config = await getFutureMomentsConfig();
      if (active) setFutureMomentsConfig(config);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (loading || !hasGarden || !profile?.id || !secondaryHomeDataReady) {
      setHomeCapsules([]);
      return;
    }
    let active = true;
    void (async () => {
      try {
        const token = await getSessionAccessToken();
        if (!token) return;
        const res = await fetch("/api/capsules", {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "same-origin",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { capsules?: TimeCapsuleRow[] };
        if (!active) return;
        setHomeCapsules(Array.isArray(data.capsules) ? data.capsules : []);
      } catch {
        if (active) setHomeCapsules([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [hasGarden, loading, profile?.id, secondaryHomeDataReady]);

  useEffect(() => {
    if (loading || !profile?.id || !secondaryHomeDataReady) {
      setHomeNotice(null);
      return;
    }

    let active = true;
    void (async () => {
      try {
        const token = await getSessionAccessToken();
        if (!token) return;
        const res = await fetch("/api/notices", {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "same-origin",
        });
        if (!res.ok) {
          if (active) setHomeNotice(null);
          return;
        }
        const data = (await res.json()) as {
          notices?: Array<{
            id?: string | null;
            title?: string | null;
            message?: string | null;
          }>;
        };
        if (!active) return;
        const nextNotice =
          Array.isArray(data.notices) &&
          data.notices.find(
            (notice) =>
              typeof notice.id === "string" &&
              notice.id.trim().length > 0 &&
              typeof notice.title === "string" &&
              notice.title.trim().length > 0 &&
              typeof notice.message === "string" &&
              notice.message.trim().length > 0,
          );
        setHomeNotice(
          nextNotice
            ? {
                id: nextNotice.id!.trim(),
                title: nextNotice.title!.trim(),
                message: nextNotice.message!.trim(),
              }
            : null,
        );
      } catch {
        if (active) setHomeNotice(null);
      }
    })();

    return () => {
      active = false;
    };
  }, [activeGardenId, loading, profile?.id, secondaryHomeDataReady]);

  useEffect(() => {
    if (loading || !hasGarden || !profile?.id || !secondaryHomeDataReady) {
      setHomeRituals([]);
      return;
    }
    let active = true;
    void (async () => {
      try {
        const token = await getSessionAccessToken();
        if (!token) return;
        const res = await fetch("/api/rituals", {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "same-origin",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { rituals?: AnnualTreeRitualRow[] };
        if (!active) return;
        const rituals = Array.isArray(data.rituals) ? data.rituals : [];
        setHomeRituals(rituals);
      } catch {
        if (active) setHomeRituals([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [hasGarden, loading, profile?.id, secondaryHomeDataReady]);

  useEffect(() => {
    if (loading || !hasGarden || !profile?.id || !secondaryHomeDataReady) {
      setHomeRitualCheckIns([]);
      return;
    }
    let active = true;
    void (async () => {
      try {
        const token = await getSessionAccessToken();
        if (!token) return;
        const res = await fetch("/api/rituals/check-ins", {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "same-origin",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { checkIns?: AnnualTreeCheckInRow[] };
        if (!active) return;
        setHomeRitualCheckIns(Array.isArray(data.checkIns) ? data.checkIns : []);
      } catch {
        if (active) setHomeRitualCheckIns([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [hasGarden, loading, profile?.id, secondaryHomeDataReady]);

  const handleMapPlaceSaved = useCallback((place: MapPlaceRecord) => {
    setLocalMapPlaces((prev) => {
      const next = new Map(prev.map((entry) => [entry.id, entry]));
      next.set(place.id, place);
      return Array.from(next.values()).sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt),
      );
    });
  }, []);

  const handleMapRouteSaved = useCallback((route: MapRouteRecord) => {
    setLocalMapRoutes((prev) => {
      const next = new Map(prev.map((entry) => [entry.id, entry]));
      next.set(route.id, route);
      return Array.from(next.values()).sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt),
      );
    });
  }, []);

  const handleMapRouteArchived = useCallback((routeId: string) => {
    setLocalMapRoutes((prev) => prev.filter((route) => route.id !== routeId));
  }, []);

  const handleMapZoneSaved = useCallback((zone: MapZoneRecord) => {
    setLocalMapZones((prev) => {
      const next = new Map(prev.map((entry) => [entry.id, entry]));
      next.set(zone.id, zone);
      return Array.from(next.values()).sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt),
      );
    });
  }, []);

  const handleMapZoneArchived = useCallback((zoneId: string) => {
    setLocalMapZones((prev) => prev.filter((zone) => zone.id !== zoneId));
  }, []);

  const isAdmin = useMemo(() => profile?.role === "superadmin", [profile]);

  const {
    allEvents,
    normalizedRange,
    pathDays,
    visibleEvents,
    eventsByDate,
    availableYears,
    selectedYearValue,
  } = useHomeTrailEvents({
    currentYear,
    dateFrom,
    dateTo,
    bloomedStatusCode,
    seedRows,
    pageRows,
    unlocks,
    rulesById,
    pageElementById,
    pageVisualStateById,
    bloomPagePreviewById,
    pagePlanVisualById,
    treeIconByTier,
    defaultTreeIcon,
    seedAsset: sceneTokens.seedAsset,
    sproutAsset: sceneTokens.sproutAsset,
  });

  const selectedYear = useMemo(() => Number(selectedYearValue), [selectedYearValue]);
  const selectableYears = useMemo(() => {
    const filteredYears = availableYears.filter((year) => year <= currentYear);
    return filteredYears.length ? filteredYears : [currentYear];
  }, [availableYears, currentYear]);

  useEffect(() => {
    if (!selectableYears.length) return;
    if (selectableYears.includes(selectedYear)) return;
    const fallbackYear = selectableYears[0] ?? currentYear;
    setDateFrom(`${fallbackYear}-01-01`);
    setDateTo(`${fallbackYear}-12-31`);
    setFocusDate(`${fallbackYear}-01-01`);
  }, [currentYear, selectableYears, selectedYear]);

  const {
    mapScope,
    setMapScope,
    mapOnlyFavorites,
    setMapOnlyFavorites,
    mapSeasonFilter,
    setMapSeasonFilter,
    mapFlowerFamilyFilter,
    setMapFlowerFamilyFilter,
    filteredMapMemories,
    mapFlowerFamilyOptions,
    hasActiveMapFilters,
    resetMapFilters,
  } = useHomeMapMemoriesFilters({
    mapMemories,
    selectedYearValue,
  });
  const activeSeason = useMemo(() => seasonFromIso(focusDate), [focusDate]);
  const seasonTheme = useMemo(() => SEASON_THEME[activeSeason], [activeSeason]);
  const trailGeometry = useMemo(
    () => resolveTrailGeometry(homeTrailConfig),
    [homeTrailConfig],
  );
  const trailCanvasWidth = trailGeometry.canvasWidth;
  const trailCanvasHeight = trailGeometry.canvasHeight;
  const trailAnchors = trailGeometry.anchors;
  const trailCurveSegments = trailGeometry.segments;
  const customTrailBackgroundSrc = normalizeAccessibleHomeTrailBackgroundAssetUrl(
    homeTrailConfig.sourceAsset,
  );
  const useCustomSceneAsset = Boolean(customTrailBackgroundSrc) && !customLandscapeFailed;
  const resolvedLandscapeAsset = useMemo(() => {
    const inferred = inferLandscapeAssetFromScene(sceneTokens);
    const direct = sceneTokens.landscapeAsset?.trim();
    if (useCustomSceneAsset) return customTrailBackgroundSrc;
    if (useLandscapeFallback) return inferred || DEFAULT_LANDSCAPE_ASSET;
    return direct || inferred || DEFAULT_LANDSCAPE_ASSET;
  }, [customTrailBackgroundSrc, sceneTokens, useCustomSceneAsset, useLandscapeFallback]);
  const parallax = useMemo(() => {
    const progress =
      pathDays.length <= 1
        ? 0
        : Math.max(pathDays.indexOf(focusDate), 0) / Math.max(pathDays.length - 1, 1);
    const centered = progress - 0.5;
    return {
      bgX: centered * -18,
      farX: centered * -8,
      midX: centered * 20,
      frontX: centered * 34,
      nearX: centered * 44,
      cloudLeftX: centered * 16,
      cloudRightX: centered * -14,
    };
  }, [focusDate, pathDays]);
  const showAmbienceLayer = true;
  const useLandscapeAsset = useCustomSceneAsset || !landscapeAssetFailed;
  const summitLabelPoint = useMemo(
    () => ({
      x: homeTrailConfig.summitLabelX,
      y: homeTrailConfig.summitLabelY,
      text: homeTrailConfig.summitLabelText,
    }),
    [homeTrailConfig.summitLabelText, homeTrailConfig.summitLabelX, homeTrailConfig.summitLabelY],
  );
  const summitTreeAnchor = useMemo(
    () => ({
      x: homeTrailConfig.summitTreeX,
      y: homeTrailConfig.summitTreeY,
    }),
    [homeTrailConfig.summitTreeX, homeTrailConfig.summitTreeY],
  );
  const summitStatusAnchor = useMemo(
    () => ({
      x: homeTrailConfig.summitStatusX,
      y: homeTrailConfig.summitStatusY,
    }),
    [homeTrailConfig.summitStatusX, homeTrailConfig.summitStatusY],
  );
  const focusIndex = useMemo(
    () => Math.max(pathDays.indexOf(focusDate), 0),
    [pathDays, focusDate],
  );
  const focusDayEvents = useMemo(
    () => sortEventsForDisplay(eventsByDate.get(focusDate) ?? []),
    [eventsByDate, focusDate],
  );
  const featuredFocusEvent = useMemo(() => {
    if (!focusDayEvents.length) return null;
    return (
      focusDayEvents.find((event) => event.kind === "flower") ??
      focusDayEvents.find((event) => event.kind === "sprout") ??
      focusDayEvents.find((event) => event.kind === "seed") ??
      focusDayEvents.find((event) => event.kind === "tree") ??
      focusDayEvents[0]
    );
  }, [focusDayEvents]);
  const todayFeaturedEvent = useMemo(() => {
    const todayEvents = sortEventsForDisplay(eventsByDate.get(todayIsoLocal()) ?? []);
    if (!todayEvents.length) return null;
    return (
      todayEvents.find((event) => event.kind === "flower") ??
      todayEvents.find((event) => event.kind === "sprout") ??
      todayEvents.find((event) => event.kind === "seed") ??
      todayEvents.find((event) => event.kind === "tree") ??
      todayEvents[0]
    );
  }, [eventsByDate]);
  const activePathPreviewEvent = featuredFocusEvent;
  const activePathPreview = useMemo(() => {
    if (!activePathPreviewEvent?.pageId) return null;
    return bloomPagePreviewById[activePathPreviewEvent.pageId] ?? null;
  }, [activePathPreviewEvent, bloomPagePreviewById]);
  const homeFocusSnippet = useMemo(() => {
    if (activePathPreview?.snippet?.trim()) return activePathPreview.snippet.trim();
    if (!featuredFocusEvent) return null;
    if (featuredFocusEvent.kind === "tree") return "Un hito del sendero os esta esperando en el recorrido.";
    if (featuredFocusEvent.kind === "flower") return "La flor del dia ya forma parte de vuestra historia compartida.";
    if (featuredFocusEvent.kind === "sprout") return "Este plan ya tiene fecha y esta listo para convertirse en experiencia vivida.";
    return "La semilla del dia sigue esperando el momento de entrar de verdad en vuestra historia.";
  }, [activePathPreview, featuredFocusEvent]);
  const homeFocusLocation = useMemo(() => activePathPreview?.location ?? null, [activePathPreview]);
  const isSparseCanvas = useMemo(() => visibleEvents.length <= 6, [visibleEvents.length]);
  const trailPoints = useMemo(() => {
    if (!pathDays.length) return [] as TrailPoint[];
    return buildTrailPoints(pathDays.length, trailCurveSegments);
  }, [pathDays, trailCurveSegments]);
  const focusTrailPoint = useMemo(
    () => trailPoints[focusIndex] ?? trailAnchors[0] ?? { x: 0, y: 0 },
    [focusIndex, trailAnchors, trailPoints],
  );
  const pathDayIndexByIso = useMemo(() => {
    const map = new Map<string, number>();
    pathDays.forEach((iso, index) => map.set(iso, index));
    return map;
  }, [pathDays]);
  const milestoneTreePlacements = useMemo(() => {
    const sortedTrees = [...visibleEvents]
      .filter((event) => event.kind === "tree" && Boolean(event.ruleId))
      .sort((left, right) => {
        if (left.date !== right.date) return left.date.localeCompare(right.date);
        return left.title.localeCompare(right.title, "es");
      });
    return assignItemsToSceneRegions(sortedTrees, homeTrailConfig.regions, "tree");
  }, [homeTrailConfig.regions, visibleEvents]);
  const offPathMilestonePlacementById = useMemo(() => {
    return new Map(
      milestoneTreePlacements.placements.map((placement) => [placement.item.id, placement]),
    );
  }, [milestoneTreePlacements]);
  const pathEventsByDate = useMemo(() => {
    const map = new Map<string, PathEvent[]>();
    for (const event of visibleEvents) {
      if (event.kind === "tree" && offPathMilestonePlacementById.has(event.id)) continue;
      if (!map.has(event.date)) map.set(event.date, []);
      map.get(event.date)!.push(event);
    }
    return map;
  }, [offPathMilestonePlacementById, visibleEvents]);
  const trailDayLayouts = useMemo(() => {
    return pathDays.flatMap((iso, index) => {
      const events = sortEventsForDisplay(pathEventsByDate.get(iso) ?? []);
      const primaryEvent = events[0];
      if (!primaryEvent) return [];
      return [
        {
          iso,
          point: trailPoints[index] ?? trailAnchors[0] ?? { x: 0, y: 0 },
          primaryEvent,
          hiddenCount: Math.max(0, events.length - 1),
        } satisfies TrailDayLayout,
      ];
    });
  }, [pathDays, pathEventsByDate, trailAnchors, trailPoints]);
  const trailDayVisualLayouts = useMemo(() => {
    if (!trailDayLayouts.length) return [] as TrailDayVisualLayout[];

    const baseLayouts = trailDayLayouts.map((day) => {
      const baseAnchor = trailEventAnchor(day.point, day.primaryEvent.kind, 0);
      const depthScale = 0.78 + trailPerspectiveScale(baseAnchor.y, trailCanvasHeight) * 0.34;
      const size = Math.round(trailMarkerIconSize(day.primaryEvent, isSparseCanvas) * depthScale);
      const frame = trailMarkerFrameSize(day.primaryEvent, size);
      return {
        ...day,
        baseAnchor,
        anchor: {
          x: clampRange(baseAnchor.x, 24, trailCanvasWidth - 24),
          y: clampRange(baseAnchor.y, 24, trailCanvasHeight - 106),
        },
        frame,
        size,
      } satisfies TrailDayVisualLayout;
    });

    const lateralOffsets = computeTrailMarkerSpreadOffsets(
      baseLayouts.map((day) => ({
        point: day.point,
        anchor: day.baseAnchor,
        frame: day.frame,
      })),
      trailCanvasHeight,
    );

    return baseLayouts.map((day, index) => {
      const spreadAnchor = trailEventAnchor(
        day.point,
        day.primaryEvent.kind,
        lateralOffsets[index] ?? 0,
      );
      return {
        ...day,
        anchor: {
          x: clampRange(spreadAnchor.x, 24, trailCanvasWidth - 24),
          y: clampRange(spreadAnchor.y, 24, trailCanvasHeight - 106),
        },
      } satisfies TrailDayVisualLayout;
    });
  }, [isSparseCanvas, trailCanvasHeight, trailCanvasWidth, trailDayLayouts]);
  const offPathMilestoneVisualLayouts = useMemo(() => {
    return milestoneTreePlacements.placements.map((placement) => {
      const event = placement.item;
      const baseAnchor = placement.point;
      const depthScale = 0.78 + trailPerspectiveScale(baseAnchor.y, trailCanvasHeight) * 0.34;
      const size = Math.round(trailMarkerIconSize(event, isSparseCanvas) * depthScale);
      const frame = trailMarkerFrameSize(event, size);
      const dayIndex = pathDayIndexByIso.get(event.date) ?? 0;
      const pathReference = trailPoints[Math.max(0, Math.min(dayIndex, trailPoints.length - 1))];
      return {
        iso: event.date,
        point:
          pathReference ?? {
            x: baseAnchor.x,
            y: baseAnchor.y,
            t:
              pathDays.length <= 1
                ? 0
                : dayIndex / Math.max(pathDays.length - 1, 1),
            normalX: 0,
            normalY: -1,
          },
        primaryEvent: event,
        hiddenCount: 0,
        baseAnchor,
        anchor: {
          x: clampRange(baseAnchor.x, 24, trailCanvasWidth - 24),
          y: clampRange(baseAnchor.y, 24, trailCanvasHeight - 106),
        },
        frame,
        size,
      } satisfies TrailDayVisualLayout;
    });
  }, [
    isSparseCanvas,
    milestoneTreePlacements.placements,
    pathDays.length,
    pathDayIndexByIso,
    trailCanvasHeight,
    trailCanvasWidth,
    trailPoints,
  ]);
  const markerVisualLayouts = useMemo(() => {
    return [...trailDayVisualLayouts, ...offPathMilestoneVisualLayouts].sort(
      (left, right) => left.anchor.y - right.anchor.y,
    );
  }, [offPathMilestoneVisualLayouts, trailDayVisualLayouts]);
  const eventDayIndexSet = useMemo(() => {
    const set = new Set<number>();
    visibleEvents.forEach((event) => {
      const index = pathDayIndexByIso.get(event.date) ?? -1;
      if (index >= 0) set.add(index);
    });
    return set;
  }, [pathDayIndexByIso, visibleEvents]);
  const eventDayIndexes = useMemo(
    () => Array.from(eventDayIndexSet).sort((a, b) => a - b),
    [eventDayIndexSet],
  );
  const focusDayLayout = useMemo(
    () => trailDayVisualLayouts.find((day) => day.iso === focusDate) ?? null,
    [trailDayVisualLayouts, focusDate],
  );
  const focusEventAnchor = useMemo(() => {
    if (!focusDayLayout) return { x: focusTrailPoint.x, y: focusTrailPoint.y };
    return focusDayLayout.anchor;
  }, [focusDayLayout, focusTrailPoint]);
  const focusEventFrame = useMemo(() => {
    if (!focusDayLayout) return { width: 44, height: 44 };
    return focusDayLayout.frame;
  }, [focusDayLayout]);
  const focusAvatarBaseOffset = useMemo(
    () =>
      computeFocusAvatarOffset({
        trailPoints,
        focusIndex,
        focusTrailPoint,
        focusDayLayout,
        cardSide: null,
        canvasWidth: trailCanvasWidth,
        canvasHeight: trailCanvasHeight,
      }),
    [trailCanvasHeight, trailCanvasWidth, trailPoints, focusIndex, focusTrailPoint, focusDayLayout],
  );
  const focusAvatarBasePoint = useMemo(
    () => ({
      x: focusTrailPoint.x + focusAvatarBaseOffset.x,
      y: focusTrailPoint.y + focusAvatarBaseOffset.y,
    }),
    [focusTrailPoint, focusAvatarBaseOffset],
  );
  const focusDayProgress = useMemo(() => {
    if (!pathDays.length) return 0;
    return (focusIndex + 1) / pathDays.length;
  }, [focusIndex, pathDays.length]);
  const focusEventKindLabel = useMemo(() => {
    if (!featuredFocusEvent) return "Día tranquilo";
    return eventKindLabel(featuredFocusEvent.kind);
  }, [featuredFocusEvent]);
  const focusActionLabel = useMemo(() => {
    if (!featuredFocusEvent) return "Abrir momento del día";
    if (featuredFocusEvent.kind === "flower") return "Abrir flor del día";
    if (featuredFocusEvent.kind === "tree") return "Abrir hito del día";
    return "Abrir plan del día";
  }, [featuredFocusEvent]);
  const focusDaySummary = useMemo(() => {
    if (!featuredFocusEvent) return "Sin evento destacado hoy";
    return featuredFocusEvent.title || focusEventKindLabel;
  }, [featuredFocusEvent, focusEventKindLabel]);
  const immersiveHillSubtitle = useMemo(() => {
    const dayLabel = `Día ${focusIndex + 1}/${Math.max(pathDays.length, 1)}`;
    const typeLabel = featuredFocusEvent ? focusEventKindLabel : "Sin evento";
    return `${seasonTheme.label} · ${dayLabel} · ${typeLabel}`;
  }, [featuredFocusEvent, focusEventKindLabel, focusIndex, pathDays.length, seasonTheme.label]);
  const activePathPreviewCardPos = useMemo(
    () =>
      computeActiveTrailPreviewCardPos({
        hasActivePreview: Boolean(activePathPreviewEvent),
        focusTrailPoint,
        focusEventAnchor,
        focusEventFrame,
        focusAvatarBasePoint,
        trailDayVisualLayouts,
        pathDayIndexByIso,
        focusIndex,
        canvasWidth: trailCanvasWidth,
        canvasHeight: trailCanvasHeight,
        summitPoint: summitTreeAnchor,
      }),
    [
      activePathPreviewEvent,
      trailCanvasHeight,
      trailCanvasWidth,
      focusTrailPoint,
      focusEventAnchor,
      focusEventFrame,
      focusAvatarBasePoint,
      summitTreeAnchor,
      trailDayVisualLayouts,
      pathDayIndexByIso,
      focusIndex,
    ],
  );
  const annualEvents = useMemo(() => {
    const yearPrefix = `${selectedYearValue}-`;
    return allEvents.filter((event) => event.date.startsWith(yearPrefix));
  }, [allEvents, selectedYearValue]);
  const annualTreeYear = useMemo(
    () => Number(selectedYearValue) || currentYear,
    [selectedYearValue, currentYear],
  );
  const annualTreeStatesByYear = useMemo(
    () => indexGardenYearTreeStatesByYear(annualTreeStates),
    [annualTreeStates],
  );
  const annualTreePages = useMemo(() => {
    const yearPrefix = `${annualTreeYear}-`;
    return pageRows.filter(
      (page): page is typeof page & { date: string } =>
        typeof page.date === "string" && page.date.startsWith(yearPrefix),
    );
  }, [annualTreeYear, pageRows]);
  const annualMilestoneCount = useMemo(
    () =>
      countAnnualTreeMilestonesForYear({
        year: annualTreeYear,
        entries: unlocks,
        resolveDate: (unlock) => unlock.claimed_at ?? unlock.created_at ?? null,
      }),
    [annualTreeYear, unlocks],
  );
  const annualTreeState = useMemo(
    () => annualTreeStatesByYear.get(annualTreeYear) ?? null,
    [annualTreeStatesByYear, annualTreeYear],
  );
  const annualTreeSnapshot = useMemo(
    () => {
      if (annualTreeState) {
        return buildAnnualTreeSnapshotFromState(
          annualTreeState,
          homeTrailConfig.annualTreeAssets,
        );
      }
      return buildCanonicalAnnualTreeSnapshot({
        year: annualTreeYear,
        pages: annualTreePages,
        milestonesUnlocked: annualMilestoneCount,
        annualTreeAssets: homeTrailConfig.annualTreeAssets,
        idPrefix: "home-annual-page",
        titleFallback: "Recuerdo del año",
      });
    },
    [
      annualMilestoneCount,
      annualTreePages,
      annualTreeState,
      annualTreeYear,
      homeTrailConfig.annualTreeAssets,
    ],
  );
  const annualTreeGrowth = annualTreeSnapshot.growth;
  const mobileHillTeaserSummary = useMemo(() => {
    return `${annualTreePhaseLabel(annualTreeGrowth.phase)} · ${annualTreeGrowth.stage}/100`;
  }, [annualTreeGrowth.phase, annualTreeGrowth.stage]);
  const ritualYearPages = useMemo(() => {
    const yearPrefix = `${ritualPromptYear}-`;
    return pageRows.filter(
      (page): page is typeof page & { date: string } =>
        typeof page.date === "string" && page.date.startsWith(yearPrefix),
    );
  }, [pageRows, ritualPromptYear]);
  const ritualYearMilestoneCount = useMemo(
    () =>
      countAnnualTreeMilestonesForYear({
        year: ritualPromptYear,
        entries: unlocks,
        resolveDate: (unlock) => unlock.claimed_at ?? unlock.created_at ?? null,
      }),
    [ritualPromptYear, unlocks],
  );
  const ritualYearState = useMemo(
    () => annualTreeStatesByYear.get(ritualPromptYear) ?? null,
    [annualTreeStatesByYear, ritualPromptYear],
  );
  const ritualYearSnapshot = useMemo(
    () => {
      if (ritualYearState) {
        return buildAnnualTreeSnapshotFromState(
          ritualYearState,
          homeTrailConfig.annualTreeAssets,
        );
      }
      return buildCanonicalAnnualTreeSnapshot({
        year: ritualPromptYear,
        pages: ritualYearPages,
        milestonesUnlocked: ritualYearMilestoneCount,
        annualTreeAssets: homeTrailConfig.annualTreeAssets,
        idPrefix: "home-ritual-page",
        titleFallback: "Recuerdo del ritual",
      });
    },
    [
      homeTrailConfig.annualTreeAssets,
      ritualPromptYear,
      ritualYearMilestoneCount,
      ritualYearPages,
      ritualYearState,
    ],
  );
  const ritualYearGrowth = ritualYearSnapshot.growth;
  const ritualEligible = useMemo(
    () => isRitualEligible(ritualPromptYear, ritualYearGrowth.stage),
    [ritualPromptYear, ritualYearGrowth.stage],
  );
  const homeRitual = useMemo(
    () => homeRituals.find((ritual) => ritual.year === ritualPromptYear) ?? null,
    [homeRituals, ritualPromptYear],
  );
  const legacyCapsulesSummary = useMemo(() => {
    if (!hasGarden) return null;
    if (!homeCapsules.length) {
      return {
        title: "Aún no habéis sellado ninguna cápsula",
        description:
          "Guardad una promesa, una predicción o una foto para que el tiempo os la devuelva más adelante.",
        statusLabel: "Nueva",
        actionLabel: "Crear cápsula",
      };
    }

    const ready = homeCapsules.filter(
      (capsule) => capsule.status === "ready" || isCapsuleReady(capsule),
    );
    if (ready.length > 0) {
      return {
        title:
          ready.length === 1
            ? `La cápsula "${ready[0].title}" ya está lista`
            : `Tenéis ${ready.length} cápsulas listas para abrir`,
        description:
          "El tiempo ya ha cumplido su parte. Podéis abrirlas y ver qué prometisteis o imaginasteis.",
        statusLabel: "Lista para abrir",
        actionLabel: "Abrir cápsulas",
      };
    }

    const nextCapsule = [...homeCapsules]
      .filter((capsule) => capsule.status !== "opened")
      .sort((left, right) => left.opens_at.localeCompare(right.opens_at))[0];

    if (!nextCapsule) {
      return {
        title: "Vuestras cápsulas ya están abiertas",
        description:
          "Todo lo que sellasteis ya forma parte de la historia visible del jardín.",
        statusLabel: "Abiertas",
        actionLabel: "Ver cápsulas",
      };
    }

    const openDate = new Date(nextCapsule.opens_at);
    const daysUntilOpen = Math.max(
      0,
      Math.ceil((openDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    );

    return {
      title: nextCapsule.title,
      description: `Se abrirá el ${openDate.toLocaleDateString("es-ES")} · Ventana ${capsuleWindowLabel(nextCapsule.window_code)}.`,
      statusLabel:
        daysUntilOpen > 0 ? `En ${daysUntilOpen} día(s)` : capsuleStatusLabel(nextCapsule.status),
      actionLabel: "Ver cápsulas",
    };
  }, [hasGarden, homeCapsules]);
  const legacyRitualSummary = useMemo(() => {
    if (!ritualEligible && !homeRitual) return null;
    if (homeRitual) {
      return {
        year: ritualPromptYear,
        title:
          homeRitual.status === "confirmed"
            ? "Árbol anual confirmado"
            : homeRitual.status === "planted"
              ? "Árbol anual plantado"
              : "Ritual del árbol listo",
        description:
          homeRitual.status === "confirmed"
            ? "Ya queda registrado en vuestra historia y seguirá visible como parte del jardín."
            : homeRitual.status === "planted"
              ? "El gesto ya existe. Podéis retocar la ubicación o las notas cuando queréis."
              : "El árbol ya está listo para salir del jardín digital y convertirse en un gesto real.",
        statusLabel: ritualStatusLabel(homeRitual.status),
        locationLabel: homeRitual.location_label ?? null,
        actionLabel: homeRitual.status === "pending" ? "Completar ritual" : "Ver ritual",
      };
    }

    return {
      year: ritualPromptYear,
      title: RITUAL_PREVIEW_MODE ? "Vista previa del ritual del árbol" : "Árbol anual listo para plantar",
      description: RITUAL_PREVIEW_MODE
        ? "Estamos mostrando este ritual en modo revisión. Registrad dónde lo habéis plantado o dónde queréis dejarlo marcado para pulir el flujo antes de activarlo con las condiciones reales."
        : "El año ya ha cerrado y el árbol puede salir del jardín digital. Registrad dónde lo habéis plantado o dónde queréis dejarlo marcado.",
      statusLabel: RITUAL_PREVIEW_MODE ? "Vista previa" : "Listo para plantar",
      locationLabel: null,
      actionLabel: "Abrir ritual",
    };
  }, [homeRitual, ritualEligible, ritualPromptYear]);
  const ritualAction = useMemo(
    () =>
      getHomeRitualAction({
        promptYear: ritualPromptYear,
        promptTreeStage: ritualYearGrowth.stage,
        rituals: homeRituals,
        checkIns: homeRitualCheckIns,
      }),
    [homeRitualCheckIns, homeRituals, ritualPromptYear, ritualYearGrowth.stage],
  );
  const ritualSummary = useMemo(() => {
    if (!ritualAction) return null;
    return {
      year: ritualAction.year,
      title: ritualAction.title,
      description: ritualAction.description,
      statusLabel: ritualAction.statusLabel,
      locationLabel: ritualAction.locationLabel,
      actionLabel: ritualAction.actionLabel,
    };
  }, [ritualAction]);
  const ritualAnniversaryAction = useMemo(
    () => (ritualAction?.kind === "anniversary" ? ritualAction : null),
    [ritualAction],
  );
  const homeRitualDismissStorageKey = useMemo(() => {
    if (!profile?.id || !ritualAction) return null;
    if (ritualAction.kind === "anniversary") {
      return `home:ritual-popup-dismissed:${profile.id}:anniversary:${ritualAction.ritual.id}:${ritualAction.milestoneYear}`;
    }
    return `home:ritual-popup-dismissed:${profile.id}:planting:${ritualAction.year}`;
  }, [profile?.id, ritualAction]);
  const anniversaryDraftStorageKey = useMemo(() => {
    if (!profile?.id || !ritualAnniversaryAction) return null;
    return `home:ritual-anniversary-draft:${profile.id}:${ritualAnniversaryAction.ritual.id}:${ritualAnniversaryAction.milestoneYear}`;
  }, [profile?.id, ritualAnniversaryAction]);
  const capsuleAction = useMemo(
    () =>
      hasGarden
        ? getHomeCapsuleAction({
            capsules: homeCapsules,
            currentYear,
            capsulePromptStartMonth: futureMomentsConfig.capsule.annualPromptStartMonth,
          })
        : null,
    [currentYear, futureMomentsConfig.capsule.annualPromptStartMonth, hasGarden, homeCapsules],
  );
  const capsulesSummary = useMemo(() => {
    if (!capsuleAction) return null;
    return {
      title: capsuleAction.title,
      description: capsuleAction.description,
      statusLabel: capsuleAction.statusLabel,
      actionLabel: capsuleAction.actionLabel,
    };
  }, [capsuleAction]);
  const setHomeRitual = useCallback(
    (ritual: AnnualTreeRitualRow | null) => {
      if (!ritual) {
        setHomeRituals((prev) => prev.filter((entry) => entry.year !== ritualPromptYear));
        return;
      }
      setHomeRituals((prev) => {
        const next = new Map(prev.map((entry) => [entry.id, entry]));
        next.set(ritual.id, ritual);
        return Array.from(next.values()).sort((left, right) => right.year - left.year);
      });
    },
    [ritualPromptYear],
  );
  const setShowHomeRitualPopup = useCallback(
    (open: boolean) => {
      setRitualPopupMode(open ? ritualAction?.kind ?? "planting" : null);
    },
    [ritualAction],
  );
  useEffect(() => {
    if (!anniversaryDraftStorageKey || typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem(anniversaryDraftStorageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<AnniversaryDraft>;
      setAnniversaryDraft({
        status:
          parsed.status === "growing" ||
          parsed.status === "stable" ||
          parsed.status === "delicate" ||
          parsed.status === "lost" ||
          parsed.status === "dead" ||
          parsed.status === "replanted"
            ? parsed.status
            : "growing",
        locationLabel: String(parsed.locationLabel ?? "").trim(),
        locationLat:
          typeof parsed.locationLat === "number" && Number.isFinite(parsed.locationLat)
            ? parsed.locationLat
            : null,
        locationLng:
          typeof parsed.locationLng === "number" && Number.isFinite(parsed.locationLng)
            ? parsed.locationLng
            : null,
        notes: String(parsed.notes ?? "").trim(),
        photoUrl: String(parsed.photoUrl ?? "").trim(),
      });
    } catch {
      // Ignore broken anniversary drafts.
    }
  }, [anniversaryDraftStorageKey]);
  const focusMonthLabel = useMemo(
    () =>
      parseIsoLocal(focusDate)
        .toLocaleDateString("es-ES", { month: "short" })
        .replace(".", "")
        .toUpperCase(),
    [focusDate],
  );
  const focusPerspectiveScale = useMemo(
    () => trailPerspectiveScale(focusTrailPoint.y, trailCanvasHeight),
    [focusTrailPoint.y, trailCanvasHeight],
  );
  const focusAvatarOffset = useMemo(() => {
    return computeFocusAvatarOffset({
      trailPoints,
      focusIndex,
      focusTrailPoint,
      focusDayLayout,
      cardSide: activePathPreviewCardPos?.side ?? null,
      canvasWidth: trailCanvasWidth,
      canvasHeight: trailCanvasHeight,
    });
  }, [
    trailCanvasHeight,
    trailCanvasWidth,
    trailPoints,
    focusIndex,
    focusTrailPoint,
    focusDayLayout,
    activePathPreviewCardPos,
  ]);

  useEffect(() => {
    setUseLandscapeFallback(false);
    setLandscapeAssetFailed(false);
    setCustomLandscapeFailed(false);
  }, [
    customTrailBackgroundSrc,
    sceneTokens.landscapeAsset,
    sceneTokens.seedAsset,
    sceneTokens.cloudLeftAsset,
    sceneTokens.cloudRightAsset,
    sceneTokens.decoFlowerLeftAsset,
    sceneTokens.decoFlowerCenterAsset,
    sceneTokens.decoFlowerRightAsset,
  ]);

  useEffect(() => {
    const ids = allEvents.map((event) => event.id);
    if (!seededSeenEventsRef.current) {
      seenEventIdsRef.current = new Set(ids);
      seededSeenEventsRef.current = true;
      return;
    }

    const freshIds = ids.filter((id) => !seenEventIdsRef.current.has(id));
    if (!freshIds.length) return;

    for (const id of freshIds) seenEventIdsRef.current.add(id);

    const stamp = Date.now();
    setPlantingEventIds((prev) => {
      const next = { ...prev };
      for (const id of freshIds) next[id] = stamp;
      return next;
    });

    const timer = setTimeout(() => {
      setPlantingEventIds((prev) => {
        const next = { ...prev };
        for (const id of freshIds) delete next[id];
        return next;
      });
    }, 820);

    return () => clearTimeout(timer);
  }, [allEvents]);

  useEffect(() => {
    if (!homeRitualDismissStorageKey || typeof window === "undefined") return;
    if (ritualPopupRequested) {
      setRitualPopupMode(ritualPopupModeFromSearch ?? ritualAction?.kind ?? "planting");
      return;
    }
    if (!ritualAction) {
      setRitualPopupMode(null);
      return;
    }
    const shouldIgnoreDismissal =
      ritualAction.kind === "planting" && RITUAL_PREVIEW_MODE && !homeRitual;
    const wasDismissed =
      !shouldIgnoreDismissal &&
      window.localStorage.getItem(homeRitualDismissStorageKey) === "1";
    if (!wasDismissed) {
      setRitualPopupMode(ritualAction.kind);
    }
  }, [
    homeRitual,
    homeRitualDismissStorageKey,
    ritualAction,
    ritualPopupModeFromSearch,
    ritualPopupRequested,
  ]);

  useEffect(() => {
    if (!pickedPlaceIdFromSearch) return;
    const pickedPlace = localMapPlaces.find((place) => place.id === pickedPlaceIdFromSearch);
    if (!pickedPlace) return;

    const nextMode = ritualPopupModeFromSearch ?? ritualAction?.kind ?? "planting";

    if (nextMode === "anniversary" && ritualAnniversaryAction) {
      const nextDraft: AnniversaryDraft = {
        status: anniversaryDraft.status,
        locationLabel: pickedPlace.addressLabel ?? pickedPlace.title ?? "",
        locationLat: pickedPlace.lat,
        locationLng: pickedPlace.lng,
        notes: anniversaryDraft.notes,
        photoUrl: anniversaryDraft.photoUrl,
      };
      setAnniversaryDraft(nextDraft);
      if (anniversaryDraftStorageKey && typeof window !== "undefined") {
        window.sessionStorage.setItem(anniversaryDraftStorageKey, JSON.stringify(nextDraft));
      }
      setRitualPopupMode("anniversary");
    } else {
      const nextDraft: RitualDraft = {
        locationLabel: pickedPlace.addressLabel ?? pickedPlace.title ?? "",
        locationLat: pickedPlace.lat,
        locationLng: pickedPlace.lng,
        notes: ritualDraft.notes,
      };
      setRitualDraft(nextDraft);
      if (ritualDraftStorageKey && typeof window !== "undefined") {
        window.sessionStorage.setItem(ritualDraftStorageKey, JSON.stringify(nextDraft));
      }
      setRitualPopupMode("planting");
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("picked_place_id");
    params.set("ritual_popup", "1");
    params.set("ritual_mode", nextMode);
    router.replace(`${getProductSurfaceHref("home")}?${params.toString()}`, { scroll: false });
  }, [
    anniversaryDraft.notes,
    anniversaryDraft.photoUrl,
    anniversaryDraft.status,
    anniversaryDraftStorageKey,
    localMapPlaces,
    pickedPlaceIdFromSearch,
    ritualAction?.kind,
    ritualAnniversaryAction,
    ritualPopupModeFromSearch,
    ritualDraft.notes,
    ritualDraftStorageKey,
    router,
    searchParams,
  ]);

  const {
    viewportRef,
    viewportTransform,
    suppressClickUntilRef,
    onPathPointerDown,
    onPathPointerMove,
    finishDrag,
    centerDate,
    snapSliderIndex,
  } = useHomeTrailInteractions({
    loading,
    pathDays,
    trailPoints,
    normalizedRange,
    focusDate,
    selectedYear,
    canvasWidth: trailCanvasWidth,
    canvasHeight: trailCanvasHeight,
    eventDayIndexes,
    eventDayIndexSet,
    setFocusDate,
    setJumpDate,
    setDateFrom,
    setDateTo,
  });

  useEffect(() => {
    setJumpDate(focusDate);
  }, [focusDate]);

  function onLandscapeAssetError() {
    if (useCustomSceneAsset) {
      setCustomLandscapeFailed(true);
      return;
    }
    if (!useLandscapeFallback) {
      setUseLandscapeFallback(true);
      return;
    }
    setLandscapeAssetFailed(true);
  }

  function onEventClick(event: PathEvent) {
    router.push(event.href);
  }

  const openImmersiveMode = useCallback(
    (mode: "hill" | "map" | "path") => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("immersive", mode);
      router.push(`${getProductSurfaceHref("home")}?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const openPlansComposer = useCallback(() => {
    router.push(`${getProductSurfaceHref("plans")}?planting=1`, { scroll: false });
  }, [router]);

  const closeImmersiveMode = useCallback(() => {
    if (mapSelectionMode) {
      router.push(mapSelectionReturnTo, { scroll: false });
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.delete("immersive");
    const nextQuery = params.toString();
    router.push(
      nextQuery ? `${getProductSurfaceHref("home")}?${nextQuery}` : getProductSurfaceHref("home"),
      { scroll: false },
    );
  }, [mapSelectionMode, mapSelectionReturnTo, router, searchParams]);

  const handleMapPlacePicked = useCallback(
    (place: MapPlaceRecord) => {
      handleMapPlaceSaved(place);
      const [path, rawQuery = ""] = mapSelectionReturnTo.split("?");
      const params = new URLSearchParams(rawQuery);
      params.set("picked_place_id", place.id);
      const nextQuery = params.toString();
      router.push(nextQuery ? `${path}?${nextQuery}` : path, { scroll: false });
    },
    [handleMapPlaceSaved, mapSelectionReturnTo, router],
  );

  const clearRitualPopupQuery = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.has("ritual_popup")) return;
    params.delete("ritual_popup");
    params.delete("ritual_mode");
    const nextQuery = params.toString();
    router.replace(
      nextQuery ? `${getProductSurfaceHref("home")}?${nextQuery}` : getProductSurfaceHref("home"),
      { scroll: false },
    );
  }, [router, searchParams]);

  const dismissHomeRitualPopup = useCallback(() => {
    if (
      homeRitualDismissStorageKey &&
      typeof window !== "undefined" &&
      !RITUAL_PREVIEW_MODE &&
      !ritualPopupRequested
    ) {
      window.localStorage.setItem(homeRitualDismissStorageKey, "1");
    }
    setRitualPopupMode(null);
    clearRitualPopupQuery();
  }, [clearRitualPopupQuery, homeRitualDismissStorageKey, ritualPopupRequested]);

  const openHomeRitualPopup = useCallback(() => {
    if (!ritualAction) return;
    if (homeRitualDismissStorageKey && typeof window !== "undefined") {
      window.localStorage.removeItem(homeRitualDismissStorageKey);
    }
    setRitualPopupMode(ritualAction.kind);
  }, [ritualAction, homeRitualDismissStorageKey]);

  const openHomeRitualMapPicker = useCallback(
    (draft: RitualDraft) => {
      setRitualDraft(draft);
      if (ritualDraftStorageKey && typeof window !== "undefined") {
        window.sessionStorage.setItem(ritualDraftStorageKey, JSON.stringify(draft));
      }
      router.push(
        `${getProductSurfaceHref("home")}?immersive=map&pick=ritual_place&ritual_mode=planting&return_to=${encodeURIComponent(
          `${getProductSurfaceHref("home")}?ritual_popup=1&ritual_mode=planting`,
        )}`,
        { scroll: false },
      );
    },
    [ritualDraftStorageKey, router],
  );

  const openHomeAnniversaryMapPicker = useCallback(
    (draft: AnniversaryDraft) => {
      setAnniversaryDraft(draft);
      if (anniversaryDraftStorageKey && typeof window !== "undefined") {
        window.sessionStorage.setItem(anniversaryDraftStorageKey, JSON.stringify(draft));
      }
      router.push(
        `${getProductSurfaceHref("home")}?immersive=map&pick=ritual_place&ritual_mode=anniversary&return_to=${encodeURIComponent(
          `${getProductSurfaceHref("home")}?ritual_popup=1&ritual_mode=anniversary`,
        )}`,
        { scroll: false },
      );
    },
    [anniversaryDraftStorageKey, router],
  );

  const saveHomeRitual = useCallback(
    async (draft: RitualDraft) => {
      const token = await getSessionAccessToken();
      if (!token) throw new Error("No pudimos validar tu sesión.");

      const response = await fetch("/api/rituals", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          year: ritualPromptYear,
          locationLabel: draft.locationLabel,
          locationLat: draft.locationLat,
          locationLng: draft.locationLng,
          notes: draft.notes,
        }),
      });

      const body = (await response.json().catch(() => null)) as
        | { ritual?: AnnualTreeRitualRow; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "No se pudo guardar el ritual del árbol.");
      }
      if (!body?.ritual) {
        throw new Error("La API no devolvió el ritual guardado.");
      }

      setHomeRitual(body.ritual);
      setRitualDraft({
        locationLabel: body.ritual.location_label ?? draft.locationLabel,
        locationLat: body.ritual.location_lat ?? draft.locationLat,
        locationLng: body.ritual.location_lng ?? draft.locationLng,
        notes: body.ritual.notes ?? draft.notes,
      });
      if (ritualDraftStorageKey && typeof window !== "undefined") {
        window.sessionStorage.removeItem(ritualDraftStorageKey);
      }
      if (homeRitualDismissStorageKey && typeof window !== "undefined") {
        window.localStorage.setItem(homeRitualDismissStorageKey, "1");
      }
      setHomeNotice("Ritual del árbol actualizado.");
      setShowHomeRitualPopup(false);
      clearRitualPopupQuery();
    },
    [
      clearRitualPopupQuery,
      homeRitualDismissStorageKey,
      ritualDraftStorageKey,
      ritualPromptYear,
    ],
  );

  const saveHomeRitualCheckIn = useCallback(
    async (draft: AnniversaryDraft) => {
      if (!ritualAnniversaryAction) {
        throw new Error("No hay recordatorio pendiente para este arbol.");
      }

      const token = await getSessionAccessToken();
      if (!token) throw new Error("No pudimos validar tu sesion.");

      const response = await fetch("/api/rituals/check-ins", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          ritualId: ritualAnniversaryAction.ritual.id,
          milestoneYear: ritualAnniversaryAction.milestoneYear,
          status: draft.status,
          locationLabel: draft.locationLabel,
          locationLat: draft.locationLat,
          locationLng: draft.locationLng,
          notes: draft.notes,
          photoUrl: draft.photoUrl,
        }),
      });

      const body = (await response.json().catch(() => null)) as
        | { checkIn?: AnnualTreeCheckInRow; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "No se pudo guardar el seguimiento del arbol.");
      }
      if (!body?.checkIn) {
        throw new Error("La API no devolvio el seguimiento guardado.");
      }
      const checkIn = body.checkIn;

      setHomeRitualCheckIns((prev) => {
        const next = new Map(prev.map((checkIn) => [checkIn.id, checkIn]));
        next.set(checkIn.id, checkIn);
        return Array.from(next.values()).sort((left, right) => {
          if (left.ritual_id !== right.ritual_id) {
            return left.ritual_id.localeCompare(right.ritual_id);
          }
          return left.milestone_year - right.milestone_year;
        });
      });
      setAnniversaryDraft({
        status: checkIn.status,
        locationLabel: checkIn.location_label ?? draft.locationLabel,
        locationLat: checkIn.location_lat ?? draft.locationLat,
        locationLng: checkIn.location_lng ?? draft.locationLng,
        notes: checkIn.notes ?? draft.notes,
        photoUrl: checkIn.photo_url ?? draft.photoUrl,
      });
      if (anniversaryDraftStorageKey && typeof window !== "undefined") {
        window.sessionStorage.removeItem(anniversaryDraftStorageKey);
      }
      if (homeRitualDismissStorageKey && typeof window !== "undefined") {
        window.localStorage.setItem(homeRitualDismissStorageKey, "1");
      }
      setHomeNotice("Seguimiento del arbol actualizado.");
      setRitualPopupMode(null);
      clearRitualPopupQuery();
    },
    [
      anniversaryDraftStorageKey,
      clearRitualPopupQuery,
      ritualAnniversaryAction,
      homeRitualDismissStorageKey,
    ],
  );

  async function logout() {
    await supabase.auth.signOut();
    router.push(getProductSurfaceHref("login"));
  }

  function renderHillScene(fullscreen = false) {
    const compactImmersive = fullscreen && isCoarsePointer;
    const sceneScale = resolveHomeSceneScale({
      immersive: fullscreen,
      mobileLike: isCoarsePointer,
    });

    return (
      <div
        className={
          fullscreen
            ? "relative h-dvh w-full overflow-hidden"
            : "homeTrailSceneShell relative mx-auto w-full"
        }
        style={
          fullscreen
            ? ({
                background: homeTrailConfig.sceneBackgroundSolid || "#f3eee5",
              } as CSSProperties)
            : ({
                "--home-trail-desktop-width": `${homeTrailConfig.displayDesktopWidth}px`,
                "--home-trail-tablet-width": `${homeTrailConfig.displayTabletWidth}px`,
                "--home-trail-mobile-width": `${homeTrailConfig.displayMobileWidth}px`,
              } as CSSProperties)
        }
      >
        <HomeTrailSceneFrame
          sceneTokens={sceneTokens}
          pathGlow={seasonTheme.pathGlow}
          useLandscapeAsset={useLandscapeAsset}
          resolvedLandscapeAsset={resolvedLandscapeAsset}
          landscapeMode={useCustomSceneAsset ? "scene" : "ambient"}
          sceneBackgroundMode={homeTrailConfig.sceneBackgroundMode}
          sceneBackgroundSolid={homeTrailConfig.sceneBackgroundSolid}
          seasonSceneWash={seasonTheme.tint}
          onLandscapeAssetError={onLandscapeAssetError}
          parallax={parallax}
          showAmbienceLayer={showAmbienceLayer && !useCustomSceneAsset}
          canvasWidth={trailCanvasWidth}
          canvasHeight={trailCanvasHeight}
          viewportTransform={viewportTransform}
          viewportRef={viewportRef}
          onPathPointerDown={onPathPointerDown}
          onPathPointerMove={onPathPointerMove}
          onFinishDrag={finishDrag}
          immersive={fullscreen}
        >
          <TrailSceneTerrainLayer
            trailCurveSegments={trailCurveSegments}
            trailPoints={trailPoints}
            eventDayIndexSet={eventDayIndexSet}
            focusIndex={focusIndex}
            canvasWidth={trailCanvasWidth}
            canvasHeight={trailCanvasHeight}
            hillBackdropPath={trailGeometry.hillBackdropPath}
            seasonBands={trailGeometry.seasonBands}
            renderTerrain={!useCustomSceneAsset}
            showSeasonLabels={homeTrailConfig.showSeasonBandLabels}
          />

          <TrailFocusBadgesLayer
            focusTrailPoint={focusTrailPoint}
            focusPerspectiveScale={focusPerspectiveScale}
            focusMonthLabel={focusMonthLabel}
            summitLabel={summitLabelPoint}
            canvasWidth={trailCanvasWidth}
            canvasHeight={trailCanvasHeight}
            compact={compactImmersive}
          />

          <TrailEventMarkersLayer
            days={markerVisualLayouts}
            todayEventId={todayFeaturedEvent?.id ?? null}
            plantingEventIds={plantingEventIds}
            focusEventId={featuredFocusEvent?.id ?? null}
            canvasWidth={trailCanvasWidth}
            canvasHeight={trailCanvasHeight}
            suppressClickUntilRef={suppressClickUntilRef}
            onEventClick={onEventClick}
            compact={compactImmersive}
            markerScale={sceneScale.markerScale}
          />

          {!compactImmersive && !fullscreen && activePathPreviewEvent && activePathPreviewCardPos && (
            <ActiveTrailPreviewCard
              event={activePathPreviewEvent}
              preview={activePathPreview}
              cardPos={activePathPreviewCardPos}
              viewportZoom={viewportTransform.zoom}
              focusMonthLabel={focusMonthLabel}
              focusDayProgress={focusDayProgress}
              focusIndex={focusIndex}
              pathDaysCount={pathDays.length}
              suppressClickUntilRef={suppressClickUntilRef}
              onEventClick={onEventClick}
            />
          )}

          <TrailSummitAvatarLayer
            treeAnchor={summitTreeAnchor}
            statusAnchor={summitStatusAnchor}
            canvasWidth={trailCanvasWidth}
            canvasHeight={trailCanvasHeight}
            annualTreeStage={annualTreeGrowth.stage}
            annualTreeSeed={annualTreeYear * 29 + annualTreeGrowth.stage}
            annualTreeStatusLabel={`${selectedYearValue} - ${annualTreePhaseLabel(annualTreeGrowth.phase)} - ${annualTreeGrowth.stage}/100`}
            annualTreeAssets={homeTrailConfig.annualTreeAssets}
            focusTrailPoint={focusTrailPoint}
            focusAvatarOffset={focusAvatarOffset}
            focusPerspectiveScale={focusPerspectiveScale}
            compact={compactImmersive}
            treeScale={sceneScale.annualTreeScale}
            avatars={gardenCompanionAvatars}
          />
        </HomeTrailSceneFrame>
        <TrailDateSlider
          pathDaysCount={pathDays.length}
          focusIndex={focusIndex}
          compact={compactImmersive}
          onChangeIndex={(rawIndex) => {
            const nextIndex = snapSliderIndex(rawIndex);
            const nextIso = pathDays[nextIndex];
            if (!nextIso) return;
            centerDate(nextIso);
          }}
        />
      </div>
    );
  }

  if (loading) {
    return <PageLoadingState message="Cargando jardín..." />;
  }

  if (immersiveMode === "hill") {
    return (
      <HomeFullscreenPanel
        title={formatFocusDate(focusDate)}
        subtitle={immersiveHillSubtitle}
        detail={featuredFocusEvent ? `${focusEventKindLabel} · ${focusDaySummary}` : `Árbol anual · ${mobileHillTeaserSummary}`}
        onInfoClick={featuredFocusEvent ? () => onEventClick(featuredFocusEvent) : undefined}
        infoActionLabel="Abrir"
        onClose={closeImmersiveMode}
        variant="immersive"
      >
        {renderHillScene(true)}
      </HomeFullscreenPanel>
    );
  }

  if (immersiveMode === "path") {
    return (
      <HomeFullscreenPanel
        title={`Sendero ${selectedYearValue}`}
        subtitle="Resumen del año por estaciones, meses y momentos vividos."
        onClose={closeImmersiveMode}
      >
        <HomePathSummaryView
          events={annualEvents}
          selectedYearValue={selectedYearValue}
          activeSeason={activeSeason}
          onEventClick={onEventClick}
        />
      </HomeFullscreenPanel>
    );
  }

  if (immersiveMode === "map") {
    return (
      <HomeFullscreenPanel
        title={mapSelectionMode ? "Elegir ubicación" : "Mapa de recuerdos"}
        subtitle={
          mapSelectionMode === "seed_place"
            ? "Vuelve a la semilla con un lugar ya conectado a vuestro mapa"
            : mapSelectionMode === "ritual_place"
              ? "Elige dónde queréis dejar marcado el ritual del árbol"
              : `Año ${selectedYearValue} - ${filteredMapMemories.length} lugares`
        }
        onClose={closeImmersiveMode}
        variant="immersive"
        showInfoCard={false}
        showCloseButton={false}
      >
        <HomeMemoriesMapSection
          filteredMemories={filteredMapMemories}
          mapPlaces={localMapPlaces}
          mapRoutes={localMapRoutes}
          mapZones={localMapZones}
          totalMemories={mapMemories.length}
          mapScope={mapScope}
          selectedYearValue={selectedYearValue}
          mapOnlyFavorites={mapOnlyFavorites}
          mapSeasonFilter={mapSeasonFilter}
          mapFlowerFamilyFilter={mapFlowerFamilyFilter}
          mapFlowerFamilyOptions={mapFlowerFamilyOptions}
          hasActiveMapFilters={hasActiveMapFilters}
          onMapScopeChange={(scope) => setMapScope(scope)}
          onToggleOnlyFavorites={() => setMapOnlyFavorites((prev) => !prev)}
          onMapSeasonFilterChange={(value) => setMapSeasonFilter(value)}
          onMapFlowerFamilyFilterChange={(value) => setMapFlowerFamilyFilter(value)}
          onResetFilters={resetMapFilters}
          onMapDataChanged={refreshHomeBootstrap}
          onMapPlaceSaved={handleMapPlaceSaved}
          onMapRouteSaved={handleMapRouteSaved}
          onMapRouteArchived={handleMapRouteArchived}
          onMapZoneSaved={handleMapZoneSaved}
          onMapZoneArchived={handleMapZoneArchived}
          selectionMode={mapSelectionMode}
          onMapPlacePicked={handleMapPlacePicked}
          onClose={closeImmersiveMode}
          immersive
        />
      </HomeFullscreenPanel>
    );
  }

  return (
    <div className="lv-page p-4 sm:p-6">
      <div className="lv-shell max-w-6xl space-y-3 sm:space-y-4">
        {fetchWarning ? (
          <StatusNotice message={fetchWarning} tone="warning" />
        ) : null}
        {typeof homeNotice === "string" ? (
          <StatusNotice message={homeNotice} tone="success" />
        ) : null}
        {homeNotice && typeof homeNotice !== "string" ? (
          <section className="rounded-[22px] border border-[var(--lv-warning)] bg-[var(--lv-warning-soft)] p-4 shadow-[var(--lv-shadow-sm)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--lv-warning)]">
                  Aviso importante
                </div>
                <h2 className="mt-2 text-lg font-semibold text-[var(--lv-text)]">
                  {homeNotice.title}
                </h2>
                <p className="mt-1 text-sm leading-6 text-[var(--lv-text-muted)]">
                  {homeNotice.message}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="lv-btn lv-btn-primary"
                  disabled={homeNoticeBusy}
                  onClick={() =>
                    void dismissHomeNotice(`${getProductSurfaceHref("bonds")}/manage`)
                  }
                >
                  {homeNoticeBusy ? "Abriendo..." : "Abrir vinculos"}
                </button>
                <button
                  type="button"
                  className="lv-btn lv-btn-secondary"
                  disabled={homeNoticeBusy}
                  onClick={() => void dismissHomeNotice()}
                >
                  Entendido
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <HomeTopHeaderCard
          welcomeText={resolveHomeWelcomeText(settings?.welcome_text, {
            profileName: profile?.name ?? null,
            gardenName: settings?.garden_name ?? null,
          })}
          profileId={profile?.id ?? null}
          profileName={profile?.name ?? null}
          profileLastName={profile?.last_name ?? null}
          profilePronoun={profile?.pronoun ?? null}
          profileRole={profile?.role ?? null}
          profileRoleLabel={profile ? roleLabel(profile.role) : ""}
          avatarSrc={resolveProfileAvatarSrc({
            avatarUrl: profile?.avatar_url,
            pronoun: profile?.pronoun,
            role: profile?.role,
          })}
          isAdmin={isAdmin}
          selectedYear={selectedYear}
          availableYears={selectableYears}
          onYearChange={(year) => {
            if (!selectableYears.includes(year) || year > currentYear) return;
            setDateFrom(`${year}-01-01`);
            setDateTo(`${year}-12-31`);
            setFocusDate(`${year}-01-01`);
          }}
          onOpenAdmin={() => router.push(getProductSurfaceHref("admin"))}
          onOpenYearBook={(year) => router.push(getYearBookHref(year))}
          onOpenForest={() => router.push(getProductSurfaceHref("forest"))}
          onOpenChat={() => router.push(getProductSurfaceHref("chat"))}
          onOpenActivity={() => router.push(getProductSurfaceHref("activity"))}
          onOpenAchievements={() => router.push(getProductSurfaceHref("achievements"))}
          onOpenBonds={() => router.push(getProductSurfaceHref("bonds"))}
          onOpenCapsules={() => router.push(getProductSurfaceHref("capsules"))}
          onPlantSeed={openPlansComposer}
          onOpenPlans={() => router.push(getProductSurfaceHref("plans"))}
          chatUnreadCount={homeChatUnreadCount}
          activityUnseenCount={activityUnseenCount}
          onGardenChanged={refreshHomeBootstrap}
          onProfileUpdated={refreshHomeProfile}
          onLogout={logout}
        />

        <HomeFuturePromisesPanel
          ritual={ritualSummary}
          capsules={capsulesSummary}
          onOpenRitual={openHomeRitualPopup}
          onOpenCapsules={() =>
            router.push(
              capsuleAction?.kind === "create_annual"
                ? `${getProductSurfaceHref("capsules")}?create=1`
                : getProductSurfaceHref("capsules"),
            )
          }
        />

        <div className="hidden md:block">
          <HomeDailyFocusCard
            selectedYearValue={selectedYearValue}
            focusDateLabel={formatFocusDate(focusDate)}
            seasonLabel={seasonTheme.label}
            annualTreeLabel={mobileHillTeaserSummary}
            focusTitle={focusDaySummary}
            focusKindLabel={focusEventKindLabel}
            focusSnippet={homeFocusSnippet}
            focusLocation={homeFocusLocation}
            activityUnseenCount={activityUnseenCount}
            focusActionLabel={focusActionLabel}
            onOpenFocus={featuredFocusEvent ? () => onEventClick(featuredFocusEvent) : undefined}
            onOpenPathSummary={() => openImmersiveMode("path")}
            onOpenHill={() => openImmersiveMode("hill")}
          />
        </div>

        <HomeHillMobileTeaser
          selectedYearValue={selectedYearValue}
          seasonLabel={seasonTheme.label}
          focusDayLabel={formatFocusDate(focusDate)}
          focusKindLabel={focusEventKindLabel}
          annualTreeLabel={mobileHillTeaserSummary}
          todaySummary={focusDaySummary}
          focusSnippet={homeFocusSnippet}
          focusLocation={homeFocusLocation}
          activityUnseenCount={activityUnseenCount}
          focusActionLabel={focusActionLabel}
          onOpenFocus={featuredFocusEvent ? () => onEventClick(featuredFocusEvent) : undefined}
          onOpenPathSummary={() => openImmersiveMode("path")}
          onOpenHill={() => openImmersiveMode("hill")}
        />
        <HomeMapSummaryCard
          memories={filteredMapMemories}
          places={localMapPlaces}
          routes={localMapRoutes}
          selectedYearValue={selectedYearValue}
          onOpenMap={() => openImmersiveMode("map")}
        />
      </div>
      <HomeFirstWalkthrough
        open={showFirstWalkthrough}
        steps={[...HOME_FIRST_WALK_STEPS]}
        onDismiss={closeFirstWalkthrough}
        onComplete={closeFirstWalkthrough}
      />
      {ritualPopupMode === "planting" && ritualSummary ? (
        <AnnualTreeRitualPopup
          year={ritualPromptYear}
          treeStage={ritualYearGrowth.stage}
          ritual={homeRitual}
          config={futureMomentsConfig.tree}
          initialLocationLabel={ritualDraft.locationLabel}
          initialLocationLat={ritualDraft.locationLat}
          initialLocationLng={ritualDraft.locationLng}
          initialNotes={ritualDraft.notes}
          onPlant={async (draft) => {
            setRitualDraft(draft);
            await saveHomeRitual(draft);
          }}
          onOpenMapPicker={openHomeRitualMapPicker}
          onDismiss={dismissHomeRitualPopup}
        />
      ) : null}
      {ritualPopupMode === "anniversary" && ritualAnniversaryAction ? (
        <AnnualTreeAnniversaryPopup
          ritual={ritualAnniversaryAction.ritual}
          milestoneYear={ritualAnniversaryAction.milestoneYear}
          existingCheckIn={ritualAnniversaryAction.existingCheckIn}
          config={futureMomentsConfig.tree}
          initialStatus={anniversaryDraft.status}
          initialLocationLabel={anniversaryDraft.locationLabel}
          initialLocationLat={anniversaryDraft.locationLat}
          initialLocationLng={anniversaryDraft.locationLng}
          initialNotes={anniversaryDraft.notes}
          initialPhotoUrl={anniversaryDraft.photoUrl}
          onSave={async (draft) => {
            setAnniversaryDraft(draft);
            await saveHomeRitualCheckIn(draft);
          }}
          onOpenMapPicker={openHomeAnniversaryMapPicker}
          onDismiss={dismissHomeRitualPopup}
        />
      ) : null}
      <style jsx>{`
        @keyframes lvCloudPulse {
          0% { opacity: 0.62; }
          50% { opacity: 0.86; }
          100% { opacity: 0.62; }
        }
        @keyframes lvAvatarBob {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
          100% { transform: translateY(0px); }
        }
        @keyframes lvAmbientGlow {
          0% { opacity: 0.52; }
          50% { opacity: 0.78; }
          100% { opacity: 0.52; }
        }
        @keyframes lvTodayPulse {
          0% { box-shadow: 0 0 8px rgba(255, 215, 0, 0.35), 0 2px 6px rgba(0,0,0,.22); }
          50% { box-shadow: 0 0 22px rgba(255, 215, 0, 0.68), 0 2px 6px rgba(0,0,0,.22); }
          100% { box-shadow: 0 0 8px rgba(255, 215, 0, 0.35), 0 2px 6px rgba(0,0,0,.22); }
        }
        @keyframes lvPlantIn {
          0% { transform: translate(-50%, -28px) scale(0.78); opacity: 0.15; }
          38% { transform: translate(-50%, 4px) scale(1.08); opacity: 0.95; }
          62% { transform: translate(-50%, -2px) scale(0.98); opacity: 1; }
          100% { transform: translate(-50%, 0) scale(1); opacity: 1; }
        }
        .homeTrailSceneShell {
          max-width: var(--home-trail-desktop-width);
        }
        @media (max-width: 1024px) {
          .homeTrailSceneShell {
            max-width: var(--home-trail-tablet-width);
          }
        }
        @media (max-width: 640px) {
          .homeTrailSceneShell {
            max-width: min(100%, var(--home-trail-mobile-width));
          }
        }
      `}</style>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<PageLoadingState message="Cargando jardín..." />}>
      <HomePageContent />
    </Suspense>
  );
}
