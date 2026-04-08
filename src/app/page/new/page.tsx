"use client";

import { StarRating } from "@/components/ui/StarRating";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getMyProfile, getSessionUser } from "@/lib/auth";
import {
  resolveActiveGardenIdForUser,
  withGardenIdOnInsert,
  withGardenScope,
} from "@/lib/gardens";
import type { CanvasObject, ElementKind } from "@/lib/canvasTypes";
import { CanvasEditor } from "@/components/canvas/CanvasEditor";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { syncProgressionUnlocks } from "@/lib/progressionUnlocks";
import {
  getManyCatalogItems,
  getCatalogLabelWithEmoji,
  getFallbackCatalogItems,
  type CatalogItemConfig,
} from "@/lib/appConfig";
import {
  evaluateSeedTransitionGuard,
  getSeedCalendarConfig,
  resolveSeedTransition,
  todayIsoDate,
} from "@/lib/seedCalendarConfig";
import {
  getPageDetailHref,
  getProductSurface,
  getProductSurfaceHref,
} from "@/lib/productSurfaces";
import { normalizeElementKind } from "@/lib/productDomainContracts";
import { toErrorMessage } from "@/lib/errorMessage";

type CreateStep = 1 | 2 | 3;
type MoodState = "wilted" | "healthy" | "shiny";
type DraftStatus = "idle" | "saving" | "saved" | "error";

const CREATE_STEPS: CreateStep[] = [1, 2, 3];
const NEW_PAGE_DRAFT_KEY = "libro_vivo:new_page_draft:v1";
const DRAFT_AUTOSAVE_DELAY_MS = 500;
const NEW_PAGE_SURFACE = getProductSurface("new_page");

type NewPageDraft = {
  version: 1;
  updatedAt: string;
  sourceSeedId: string | null;
  title: string;
  date: string;
  element: ElementKind;
  rating: number;
  moodState: MoodState;
  objects: CanvasObject[];
  step: CreateStep;
};

type SeedPrefill = {
  seedId: string | null;
  title: string | null;
  date: string | null;
  element: ElementKind | null;
};

type SeedLinkedLocation = {
  lat: number;
  lng: number;
  label: string;
};

function stepLabel(step: CreateStep) {
  if (step === 1) return "Captura";
  if (step === 2) return "Tono";
  return "Lienzo";
}

function stepDescription(step: CreateStep) {
  if (step === 1) {
    return "Guarda la base del recuerdo con lo mínimo: fecha, elemento y, si quieres, un título.";
  }
  if (step === 2) {
    return "Si te apetece, añade tono y valoración para enriquecer la narrativa antes de guardar.";
  }
  return "Si quieres ir más alla, añade composición visual. También puedes dejarlo para después.";
}

function stepTone(step: CreateStep) {
  if (step === 1) return "Base";
  return "Opcional";
}

function saveButtonLabel(step: CreateStep, objectsCount: number) {
  if (step === 3) {
    return objectsCount > 0 ? "Guardar recuerdo" : "Guardar recuerdo sin lienzo";
  }
  return "Guardar recuerdo";
}

function isIsoDate(value: string | null | undefined) {
  if (typeof value !== "string") return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

function toElementKind(value: string | null): ElementKind | null {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;
  return normalizeElementKind(raw);
}

function todayDateInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toMoodState(value: unknown): MoodState | null {
  if (value === "wilted" || value === "healthy" || value === "shiny") return value;
  return null;
}

function toCreateStep(value: unknown): CreateStep | null {
  if (value === 1 || value === 2 || value === 3) return value;
  return null;
}

function formatDraftTimestamp(value: string | null) {
  if (!value) return null;
  const asDate = new Date(value);
  if (Number.isNaN(asDate.getTime())) return null;
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(asDate);
}

function clearDraftStorage() {
  try {
    window.localStorage.removeItem(NEW_PAGE_DRAFT_KEY);
  } catch {
    // no-op
  }
}

function readDraftStorage(): NewPageDraft | null {
  try {
    const raw = window.localStorage.getItem(NEW_PAGE_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<NewPageDraft> | null;
    if (!parsed || parsed.version !== 1) return null;

    const element = toElementKind(typeof parsed.element === "string" ? parsed.element : null);
    const moodState = toMoodState(parsed.moodState);
    const step = toCreateStep(parsed.step);

    const parsedDate = typeof parsed.date === "string" ? parsed.date : null;

    if (!element || !moodState || !step) return null;
    if (!parsedDate || !isIsoDate(parsedDate)) return null;
    if (!Array.isArray(parsed.objects)) return null;

    return {
      version: 1,
      updatedAt:
        typeof parsed.updatedAt === "string" && parsed.updatedAt.trim()
          ? parsed.updatedAt
          : new Date().toISOString(),
      sourceSeedId:
        typeof parsed.sourceSeedId === "string" && parsed.sourceSeedId.trim()
          ? parsed.sourceSeedId.trim()
          : null,
      title: typeof parsed.title === "string" ? parsed.title : "",
      date: parsedDate,
      element,
      rating: typeof parsed.rating === "number" && Number.isFinite(parsed.rating) ? parsed.rating : 0,
      moodState,
      objects: parsed.objects as CanvasObject[],
      step,
    };
  } catch {
    return null;
  }
}

function NewPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const seedPrefill = useMemo<SeedPrefill>(() => {
    const seedIdRaw = searchParams.get("seedId") ?? searchParams.get("seed_id");
    const titleRaw = searchParams.get("title");
    const dateRaw = searchParams.get("date");
    const elementRaw = searchParams.get("element");

    const seedId = typeof seedIdRaw === "string" && seedIdRaw.trim() ? seedIdRaw.trim() : null;
    const title = typeof titleRaw === "string" && titleRaw.trim() ? titleRaw.trim() : null;
    const date = isIsoDate(dateRaw) ? String(dateRaw) : null;
    const element = toElementKind(elementRaw);

    return { seedId, title, date, element };
  }, [searchParams]);

  const [title, setTitle] = useState(seedPrefill.title ?? "");
  const [date, setDate] = useState(
    seedPrefill.date ?? todayDateInputValue(),
  );
  const [element, setElement] = useState<ElementKind>(seedPrefill.element ?? "earth");
  const [objects, setObjects] = useState<CanvasObject[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [moodState, setMoodState] = useState<MoodState>("healthy");
  const [activeGardenId, setActiveGardenId] = useState<string | null>(null);
  const [elementOptions, setElementOptions] = useState<CatalogItemConfig[]>(
    getFallbackCatalogItems("elements"),
  );
  const [moodOptions, setMoodOptions] = useState<CatalogItemConfig[]>(
    getFallbackCatalogItems("moods"),
  );
  const [step, setStep] = useState<CreateStep>(1);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>("idle");
  const [draftUpdatedAt, setDraftUpdatedAt] = useState<string | null>(null);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [openClearDraftModal, setOpenClearDraftModal] = useState(false);
  const [openLeaveModal, setOpenLeaveModal] = useState(false);
  const [seedLinkedLocation, setSeedLinkedLocation] = useState<SeedLinkedLocation | null>(null);
  const [seedLinkedPlanTypeId, setSeedLinkedPlanTypeId] = useState<string | null>(null);
  const prefillSignatureRef = useRef<string | null>(null);
  const autosaveTimeoutRef = useRef<number | null>(null);
  const canvasSectionRef = useRef<HTMLDivElement | null>(null);
  const availableElementCodes = useMemo(
    () =>
      new Set(
        elementOptions
          .filter((option) => option.enabled)
          .map((option) => normalizeElementKind(option.code)),
      ),
    [elementOptions],
  );

  useEffect(() => {
    let active = true;

    (async () => {
      const user = await getSessionUser();
      if (!user) return;
      const resolvedGardenId = await resolveActiveGardenIdForUser({
        userId: user.id,
        forceRefresh: true,
      }).catch(() => null);

      if (!active) return;
      setActiveGardenId(resolvedGardenId);
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const signature = [
      seedPrefill.seedId ?? "",
      seedPrefill.title ?? "",
      seedPrefill.date ?? "",
      seedPrefill.element ?? "",
    ].join("|");

    if (prefillSignatureRef.current === signature) return;
    prefillSignatureRef.current = signature;

    if (
      !seedPrefill.seedId &&
      !seedPrefill.title &&
      !seedPrefill.date &&
      !seedPrefill.element
    ) {
      return;
    }

    if (seedPrefill.title) setTitle(seedPrefill.title);
    if (seedPrefill.date) setDate(seedPrefill.date);
    if (seedPrefill.element) setElement(seedPrefill.element);
    setStep(1);
  }, [seedPrefill]);

  useEffect(() => {
    const stored = readDraftStorage();
    if (!stored) {
      setDraftHydrated(true);
      return;
    }

    const currentSeedId = seedPrefill.seedId;
    const storedSeedId = stored.sourceSeedId ?? null;
    if ((currentSeedId ?? null) !== storedSeedId) {
      setDraftHydrated(true);
      return;
    }

    setTitle(stored.title);
    setDate(stored.date);
    setElement(stored.element);
    setRating(stored.rating);
    setMoodState(stored.moodState);
    setObjects(stored.objects);
    setStep(stored.step);
    setDraftUpdatedAt(stored.updatedAt);
    setMsg("Borrador local recuperado.");
    setDraftHydrated(true);
  }, [seedPrefill.seedId]);

  useEffect(() => {
    if (!seedPrefill.seedId || !activeGardenId) {
      setSeedLinkedLocation(null);
      setSeedLinkedPlanTypeId(null);
      return;
    }

    let active = true;

    (async () => {
      const seedQuery = withGardenScope(
        supabase
          .from("seeds")
          .select("map_place_id,plan_type_id")
          .eq("id", seedPrefill.seedId),
        activeGardenId,
      );
      const { data: seedRow, error: seedError } = await seedQuery.maybeSingle();
      if (!active) return;

      if (seedError) {
        console.warn("[new/page] no se pudo leer el lugar asociado de la semilla:", seedError);
        setSeedLinkedLocation(null);
        setSeedLinkedPlanTypeId(null);
        return;
      }

      const mapPlaceId = String(
        (seedRow as { map_place_id?: string | null } | null)?.map_place_id ?? "",
      ).trim();
      const planTypeId = String(
        (seedRow as { plan_type_id?: string | null } | null)?.plan_type_id ?? "",
      ).trim();
      setSeedLinkedPlanTypeId(planTypeId || null);
      if (!mapPlaceId) {
        setSeedLinkedLocation(null);
        return;
      }

      const placeQuery = withGardenScope(
        supabase
          .from("map_places")
          .select("lat,lng,title,subtitle")
          .eq("id", mapPlaceId),
        activeGardenId,
      );
      const { data: placeRow, error: placeError } = await placeQuery.maybeSingle();
      if (!active) return;

      if (placeError) {
        console.warn("[new/page] no se pudo leer el map_place asociado:", placeError);
        setSeedLinkedLocation(null);
        return;
      }

      const lat = Number((placeRow as { lat?: number | null } | null)?.lat);
      const lng = Number((placeRow as { lng?: number | null } | null)?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        setSeedLinkedLocation(null);
        return;
      }

      const title = String((placeRow as { title?: string | null } | null)?.title ?? "").trim();
      const subtitle = String((placeRow as { subtitle?: string | null } | null)?.subtitle ?? "").trim();
      const label = subtitle ? `${title} - ${subtitle}` : title || "Lugar asociado";

      setSeedLinkedLocation({ lat, lng, label });
    })();

    return () => {
      active = false;
    };
  }, [activeGardenId, seedPrefill.seedId]);

  useEffect(() => {
    if (!draftHydrated) return;

    if (autosaveTimeoutRef.current) {
      window.clearTimeout(autosaveTimeoutRef.current);
    }

    setDraftStatus("saving");
    autosaveTimeoutRef.current = window.setTimeout(() => {
      const draft: NewPageDraft = {
        version: 1,
        updatedAt: new Date().toISOString(),
        sourceSeedId: seedPrefill.seedId ?? null,
        title,
        date: isIsoDate(date) ? date : todayDateInputValue(),
        element,
        rating,
        moodState,
        objects,
        step,
      };
      try {
        window.localStorage.setItem(NEW_PAGE_DRAFT_KEY, JSON.stringify(draft));
        setDraftUpdatedAt(draft.updatedAt);
        setDraftStatus("saved");
      } catch {
        setDraftStatus("error");
      }
    }, DRAFT_AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimeoutRef.current) {
        window.clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [draftHydrated, title, date, element, rating, moodState, objects, step, seedPrefill.seedId]);

  useEffect(() => {
    if (step !== 3) return;
    const timer = window.setTimeout(() => {
      canvasSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const user = await getSessionUser();
        if (!user) router.push(getProductSurfaceHref("login"));
      } catch (error) {
        if (!active) return;
        setMsg(toErrorMessage(error, "Error inesperado."));
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const cfg = await getManyCatalogItems(["elements", "moods"]);
        if (!active) return;
        setElementOptions(cfg.elements ?? getFallbackCatalogItems("elements"));
        setMoodOptions(cfg.moods ?? getFallbackCatalogItems("moods"));
      } catch {
        if (!active) return;
        setElementOptions(getFallbackCatalogItems("elements"));
        setMoodOptions(getFallbackCatalogItems("moods"));
        setMsg("Aviso: no se pudo cargar configuración visual. Se usan valores por defecto.");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  function isMoodCode(code: string): code is MoodState {
    return code === "wilted" || code === "healthy" || code === "shiny";
  }

  async function syncSeedFromWizard(
    seedId: string,
    pageId: string,
    userRole: string,
    gardenId: string | null,
  ) {
    const cfg = await getSeedCalendarConfig();
    const seedQuery = withGardenScope(
      supabase
        .from("seeds")
        .select("id,status,scheduled_date,created_at,bloomed_page_id")
        .eq("id", seedId),
      gardenId,
    );
    const { data: seedRow, error: seedError } = await seedQuery.maybeSingle();

    if (seedError) {
      throw new Error(`No se pudo leer la semilla origen (${seedError.message}).`);
    }
    if (!seedRow) return;

    const row = seedRow as {
      id: string;
      status: string | null;
      scheduled_date: string | null;
      created_at: string | null;
      bloomed_page_id: string | null;
    };
    if (row.bloomed_page_id) return;

    const fromStatus = String(row.status ?? "").trim();
    if (!fromStatus) return;

    const transition = resolveSeedTransition(cfg.flowRules, {
      fromStatus,
      toStatus: cfg.defaults.bloomedStatus,
      actionKey: "bloom",
    });
    if (!transition) return;

    const transitionError = evaluateSeedTransitionGuard(transition, {
      nowDate: todayIsoDate(),
      scheduledDate: row.scheduled_date,
      seedCreatedAt: row.created_at,
      userRole,
    });
    if (transitionError) {
      throw new Error(transitionError);
    }

    const payload: Record<string, unknown> = {
      status: cfg.defaults.bloomedStatus,
      bloomed_page_id: pageId,
    };
    if (transition.clearScheduledDate) {
      payload.scheduled_date = null;
    }

    const updateQuery = withGardenScope(
      supabase
        .from("seeds")
        .update(payload)
        .eq("id", seedId),
      gardenId,
    );
    const { error: updateError } = await updateQuery;
    if (updateError) {
      throw new Error(
        `No se pudo actualizar la semilla origen (${updateError.message}).`,
      );
    }
  }

  async function save() {
    if (saving) return;
    if (step1ValidationMessage) {
      setMsg(step1ValidationMessage);
      return;
    }

    setSaving(true);
    setMsg(null);

    try {
      const user = await getSessionUser();
      if (!user) return router.push(getProductSurfaceHref("login"));

      const profile = await getMyProfile(user.id);
      const activeGardenId = await resolveActiveGardenIdForUser({
        userId: profile.id,
        forceRefresh: true,
      }).catch(() => null);
      const sourceSeedId = seedPrefill.seedId;

      const { data, error } = await supabase
        .from("pages")
        .insert(
          withGardenIdOnInsert(
            {
              title: normalizedTitle || null,
              date,
              element,
              plan_type_id: seedLinkedPlanTypeId,
              canvas_objects: objects,
              created_by: profile.id,
              rating: rating === 0 ? null : rating,
              mood_state: moodState,
              planned_from_seed_id: sourceSeedId,
              location_lat: seedLinkedLocation?.lat ?? null,
              location_lng: seedLinkedLocation?.lng ?? null,
              location_label: seedLinkedLocation?.label ?? null,
            },
            activeGardenId,
          ),
        )
        .select("id")
        .single();

      if (error) throw error;

      const pageId = String((data as { id?: string } | null)?.id ?? "").trim();
      if (!pageId) throw new Error("No se pudo recuperar la página creada.");

      if (sourceSeedId) {
        try {
          await syncSeedFromWizard(sourceSeedId, pageId, profile.role, activeGardenId);
        } catch (syncError) {
          console.warn("[new/page] semilla no sincronizada tras guardar:", syncError);
        }
      }

      await syncProgressionUnlocks(activeGardenId).catch(() => null);

      clearDraftStorage();
      setDraftStatus("idle");
      setDraftUpdatedAt(null);
      router.push(getPageDetailHref(pageId));
    } catch (error) {
      setMsg(toErrorMessage(error, "Error guardando."));
    } finally {
      setSaving(false);
    }
  }

  function resetFormToSeedPrefill() {
    setTitle(seedPrefill.title ?? "");
    setDate(seedPrefill.date ?? todayDateInputValue());
    setElement(seedPrefill.element ?? "earth");
    setRating(0);
    setMoodState("healthy");
    setObjects([]);
    setStep(1);
  }

  function clearDraftAndReset() {
    clearDraftStorage();
    setDraftStatus("idle");
    setDraftUpdatedAt(null);
    resetFormToSeedPrefill();
    setMsg("Borrador local limpiado.");
    setOpenClearDraftModal(false);
  }

  function goPrevStep() {
    setMsg(null);
    setStep((prev) => (prev > 1 ? ((prev - 1) as CreateStep) : prev));
  }

  function goBackHome() {
    if (saving) return;
    if (hasDraftContent) {
      setOpenLeaveModal(true);
      return;
    }
    router.push(getProductSurfaceHref("home"));
  }

  function goToStep(targetStep: CreateStep) {
    if (targetStep <= step) {
      setMsg(null);
      setStep(targetStep);
      return;
    }

    if (step === 1 && !canAdvanceFromStep1) {
      setMsg(step1ValidationMessage ?? "Completa fecha y elemento para continuar.");
      return;
    }

    setMsg(null);
    setStep(targetStep);
  }

  const step1ValidationMessage = useMemo(() => {
    if (!isIsoDate(date)) return "Selecciona una fecha valida para continuar.";
    const normalizedElement = toElementKind(element);
    if (!normalizedElement || !availableElementCodes.has(normalizedElement)) {
      return "Selecciona un elemento válido para continuar.";
    }
    return null;
  }, [availableElementCodes, date, element]);
  const canAdvanceFromStep1 = step1ValidationMessage === null;
  const canSavePage = canAdvanceFromStep1 && !saving;
  const nextStep = step < 3 ? ((step + 1) as CreateStep) : null;
  const normalizedTitle = title.trim();
  const saveHelperText = useMemo(() => {
    if (step === 1) {
      return "Con fecha y elemento ya puedes guardar. El resto puede esperar.";
    }
    if (step === 2) {
      return "El tono es opcional. Guarda cuando la base del recuerdo ya este bien.";
    }
    return "El lienzo también es opcional. Si no lo haces ahora, podras completarlo después.";
  }, [step]);
  const emptyTitleHint =
    step === 1 && !normalizedTitle
      ? "Puedes guardarla sin título y completarla luego desde la página."
      : null;

  const hasDraftContent =
    normalizedTitle.length > 0 ||
    objects.length > 0 ||
    rating > 0 ||
    step > 1 ||
    date !== (seedPrefill.date ?? todayDateInputValue()) ||
    element !== (seedPrefill.element ?? "earth") ||
    moodState !== "healthy";
  const draftTimestampLabel = formatDraftTimestamp(draftUpdatedAt);

  return (
    <div className="lv-page p-4 text-slate-900 sm:p-6">
      <div className="lv-shell max-w-3xl space-y-4">
        <div className="lv-card p-5">
          <h1 className="text-2xl font-semibold">{NEW_PAGE_SURFACE.label}</h1>
          <p className="mt-1 text-sm text-[#5b6758]">
            {NEW_PAGE_SURFACE.summary}
          </p>
          {seedPrefill.seedId ? (
            <div className="lv-badge mt-3 border-[#d8dcb5] bg-[#fffbe7] text-[#6e6333]">
              Desde semilla: {seedPrefill.title?.trim() || "semilla enlazada"}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {CREATE_STEPS.map((itemStep) => {
              const active = step === itemStep;
              const completed = itemStep < step;
              return (
                <button
                  key={itemStep}
                  type="button"
                  onClick={() => goToStep(itemStep)}
                  disabled={itemStep > 1 && !canAdvanceFromStep1}
                  className={`lv-btn text-sm transition ${
                    active
                      ? "lv-btn-primary"
                      : completed
                        ? "lv-btn-secondary border-[#cfdcc8] bg-[#f7fbf4]"
                        : "lv-btn-secondary"
                  }`}
                >
                  {stepLabel(itemStep)}
                </button>
              );
            })}
          </div>
          <div className="lv-state-panel lv-tone-info mt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>{stepDescription(step)}</span>
              <span className="lv-badge bg-white/80 text-[11px]">{stepTone(step)}</span>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {draftStatus === "saving" ? (
              <span>Guardando borrador local...</span>
            ) : draftStatus === "saved" ? (
              <span>
                Borrador local actualizado{draftTimestampLabel ? ` (${draftTimestampLabel})` : ""}.
              </span>
            ) : draftStatus === "error" ? (
              <span className="text-[#8a2d2d]">
                No se pudo guardar el borrador local en este dispositivo.
              </span>
            ) : (
              <span>Borrador local inactivo.</span>
            )}
            {hasDraftContent ? (
              <button
                type="button"
                onClick={() => setOpenClearDraftModal(true)}
                className="lv-btn lv-btn-ghost min-h-0 rounded-full px-2.5 py-1 text-[11px]"
              >
                Limpiar borrador
              </button>
            ) : null}
          </div>

          {step === 1 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                <input
                  className="lv-input"
                  placeholder="Título (opcional)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <input
                  className="lv-input"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
                <select
                  className="lv-select"
                  value={element}
                  onChange={(e) => setElement(e.target.value as ElementKind)}
                >
                  {elementOptions.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {getCatalogLabelWithEmoji(opt)}
                    </option>
                  ))}
                </select>
              </div>
              {step1ValidationMessage ? (
                <StatusNotice
                  message={step1ValidationMessage}
                  tone="warning"
                  className="mt-3"
                />
              ) : null}
              {emptyTitleHint ? (
                <StatusNotice message={emptyTitleHint} className="mt-3" />
              ) : null}
              {seedLinkedLocation ? (
                <div className="lv-card-soft mt-3 flex flex-wrap items-center justify-between gap-3 border border-[#d7e6cd] bg-[#f7fbf2] px-4 py-3 text-sm text-[#43513d]">
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-[#70816a]">
                      Lugar heredado
                    </div>
                    <div className="mt-1 font-medium">{seedLinkedLocation.label}</div>
                  </div>
                  <div className="lv-badge border-[#c4d6b8] bg-white/80 text-[#576452]">
                    Se guardara en la pagina
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          {step === 2 ? (
            <div className="mt-3 space-y-3">
              <div className="lv-card-soft border border-dashed border-[#d7e6cd] bg-[#f7fbf2] p-3 text-sm text-[#43513d]">
                Este paso es opcional. Si ya tienes clara la captura, puedes guardar ahora y volver
                a editar cuando quieras.
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="lv-card-soft p-3">
                  <div className="mb-2 text-sm font-medium">Valoracion</div>
                  <StarRating value={rating} onChange={setRating} />
                </div>

                <div className="lv-card-soft p-3">
                  <div className="mb-2 text-sm font-medium">Estado de la flor</div>
                  <div className="flex flex-wrap gap-2">
                    {moodOptions.filter((opt) => isMoodCode(opt.code)).map((opt) => {
                      const code = opt.code as MoodState;
                      const active = moodState === code;
                      const tone =
                        code === "wilted"
                          ? "bg-[#ffe8e8]"
                          : code === "healthy"
                            ? "bg-[#f0fff4]"
                            : "bg-[#fff7e6]";
                      return (
                        <button
                          key={opt.code}
                          type="button"
                          onClick={() => setMoodState(code)}
                          className={`lv-btn ${active ? tone : "lv-btn-secondary"}`}
                        >
                          {getCatalogLabelWithEmoji(opt)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="lv-card-soft space-y-3 p-3">
              <div className="rounded-[20px] border border-dashed border-[#d7e6cd] bg-[#f7fbf2] px-3 py-3 text-sm text-[#43513d]">
                No hace falta terminar el lienzo para que esta pagina tenga sentido. Guarda cuando
                notes que la base del recuerdo ya esta bien.
              </div>
              <div className="text-sm font-medium">Resumen de captura</div>
              <div className="mt-2 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                <div className="lv-card-soft px-3 py-2">
                  <span className="opacity-70">Titulo:</span> {normalizedTitle || "Sin título"}
                </div>
                <div className="lv-card-soft px-3 py-2">
                  <span className="opacity-70">Fecha:</span> {date}
                </div>
                <div className="lv-card-soft px-3 py-2">
                  <span className="opacity-70">Elemento:</span>{" "}
                  {elementOptions.find((opt) => opt.code === element)?.label ?? element}
                </div>
                <div className="lv-card-soft px-3 py-2">
                  <span className="opacity-70">Objetos en lienzo:</span> {objects.length}
                </div>
                {seedLinkedLocation ? (
                  <div className="lv-card-soft px-3 py-2 sm:col-span-2">
                    <span className="opacity-70">Lugar heredado:</span> {seedLinkedLocation.label}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={goBackHome}
              className="lv-btn lv-btn-secondary w-full sm:w-auto"
            >
              Volver
            </button>

            {step > 1 ? (
              <button
                type="button"
                onClick={goPrevStep}
                className="lv-btn lv-btn-secondary w-full sm:w-auto"
              >
                Atras
              </button>
            ) : null}

            {nextStep ? (
              <button
                type="button"
                onClick={() => goToStep(nextStep)}
                disabled={step === 1 && !canAdvanceFromStep1}
                className="lv-btn lv-btn-secondary w-full disabled:opacity-50 sm:w-auto"
              >
                Siguiente: {stepLabel(nextStep).toLowerCase()}
              </button>
            ) : null}
            <button
              onClick={save}
              disabled={!canSavePage}
              className="lv-btn lv-btn-primary w-full disabled:opacity-50 sm:w-auto"
            >
              {saving ? "Guardando..." : saveButtonLabel(step, objects.length)}
            </button>
          </div>
          <div className="mt-2 text-xs text-slate-500">{saveHelperText}</div>

          {msg ? <StatusNotice message={msg} className="mt-3" /> : null}
        </div>

        {step === 3 ? (
          <div ref={canvasSectionRef} className="space-y-2">
            <div className="lv-state-panel lv-tone-info text-xs">
              Consejo movil: si anades contenido en el lienzo, guarda cuando la base del recuerdo
              ya este lista.
            </div>
            <CanvasEditor
              activeGardenId={activeGardenId}
              value={objects}
              onChange={setObjects}
            />
          </div>
        ) : null}

        <ConfirmModal
          open={openClearDraftModal}
          title="Limpiar borrador local"
          description="Se vaciará el estado de esta nueva página y se restaurarán los valores iniciales."
          confirmLabel="Limpiar"
          cancelLabel="Cancelar"
          tone="danger"
          onConfirm={clearDraftAndReset}
          onCancel={() => setOpenClearDraftModal(false)}
        />
        <ConfirmModal
          open={openLeaveModal}
          title="Salir de Nueva Página"
          description="Tu borrador local ya esta guardado. Puedes salir ahora y retomarlo luego."
          confirmLabel="Salir"
          cancelLabel="Seguir editando"
          onConfirm={() => {
            setOpenLeaveModal(false);
            router.push(getProductSurfaceHref("home"));
          }}
          onCancel={() => setOpenLeaveModal(false)}
        />
      </div>
    </div>
  );
}

export default function NewPage() {
  return (
    <Suspense fallback={<PageLoadingState message="Cargando nueva página..." />}>
      <NewPageContent />
    </Suspense>
  );
}
