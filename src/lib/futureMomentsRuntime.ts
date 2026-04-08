import {
  capsuleStatusLabel,
  isCapsuleReady,
  type TimeCapsuleRow,
} from "@/lib/timeCapsuleModel";
import {
  getLatestPendingAnnualTreeReminderYear,
  isAnnualCapsulePromptSeason,
} from "@/lib/futureMomentsConfig";
import {
  isRitualEligible,
  ritualStatusLabel,
  type AnnualTreeCheckInRow,
  type AnnualTreeRitualRow,
} from "@/lib/annualTreeRitual";

export type HomeRitualAction =
  | {
      kind: "planting";
      year: number;
      ritual: AnnualTreeRitualRow | null;
      title: string;
      description: string;
      statusLabel: string;
      locationLabel: string | null;
      actionLabel: string;
    }
  | {
      kind: "anniversary";
      year: number;
      ritual: AnnualTreeRitualRow;
      milestoneYear: number;
      existingCheckIn: AnnualTreeCheckInRow | null;
      title: string;
      description: string;
      statusLabel: string;
      locationLabel: string | null;
      actionLabel: string;
    };

export type HomeCapsuleAction =
  | {
      kind: "create_annual";
      title: string;
      description: string;
      statusLabel: string;
      actionLabel: string;
    }
  | {
      kind: "open_ready";
      title: string;
      description: string;
      statusLabel: string;
      actionLabel: string;
    };

function getTargetReminderDate(plantedAt: string, milestoneYear: number) {
  const targetDate = new Date(plantedAt);
  targetDate.setFullYear(targetDate.getFullYear() + milestoneYear);
  return targetDate;
}

function getCapsuleYear(capsule: Pick<TimeCapsuleRow, "sealed_at">) {
  const date = new Date(capsule.sealed_at);
  return Number.isNaN(date.getTime()) ? null : date.getUTCFullYear();
}

export function getHomeRitualAction(input: {
  promptYear: number;
  promptTreeStage: number;
  rituals: AnnualTreeRitualRow[];
  checkIns: AnnualTreeCheckInRow[];
  now?: Date;
}) {
  const promptRitual = input.rituals.find((ritual) => ritual.year === input.promptYear) ?? null;
  const promptEligible = isRitualEligible(input.promptYear, input.promptTreeStage);

  if (promptRitual?.status === "pending" || (!promptRitual && promptEligible)) {
    return {
      kind: "planting",
      year: input.promptYear,
      ritual: promptRitual,
      title: promptRitual ? `Arbol de ${input.promptYear} pendiente` : `Arbol de ${input.promptYear} listo`,
      description: promptRitual
        ? "El año ya se ha cerrado y este gesto todavia esta pendiente de salir al mundo real."
        : "El año ya se ha cerrado. Es el momento de dejar constancia del arbol en el mundo real.",
      statusLabel: promptRitual ? ritualStatusLabel(promptRitual.status) : "Listo para plantar",
      locationLabel: promptRitual?.location_label ?? null,
      actionLabel: promptRitual ? "Completar ritual" : "Plantar arbol",
    } satisfies HomeRitualAction;
  }

  const now = input.now ?? new Date();
  const anniversaryCandidate = input.rituals
    .filter((ritual) => ritual.status !== "pending" && Boolean(ritual.planted_at))
    .map((ritual) => {
      const ritualCheckIns = input.checkIns.filter((checkIn) => checkIn.ritual_id === ritual.id);
      const pendingMilestoneYear = getLatestPendingAnnualTreeReminderYear({
        plantedAt: ritual.planted_at,
        completedYears: ritualCheckIns.map((checkIn) => checkIn.milestone_year),
        now,
      });

      if (!pendingMilestoneYear || !ritual.planted_at) return null;

      return {
        ritual,
        milestoneYear: pendingMilestoneYear,
        existingCheckIn:
          ritualCheckIns.find((checkIn) => checkIn.milestone_year === pendingMilestoneYear) ?? null,
        targetDate: getTargetReminderDate(ritual.planted_at, pendingMilestoneYear),
      };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => candidate != null)
    .sort((left, right) => {
      const dateDiff = right.targetDate.getTime() - left.targetDate.getTime();
      if (dateDiff !== 0) return dateDiff;
      return right.ritual.year - left.ritual.year;
    })[0];

  if (!anniversaryCandidate) return null;

  return {
    kind: "anniversary",
    year: anniversaryCandidate.ritual.year,
    ritual: anniversaryCandidate.ritual,
    milestoneYear: anniversaryCandidate.milestoneYear,
    existingCheckIn: anniversaryCandidate.existingCheckIn,
    title: `${anniversaryCandidate.milestoneYear} años desde vuestro arbol de ${anniversaryCandidate.ritual.year}`,
    description:
      "Toca mirar como sigue, dejar una nota nueva y guardar una prueba de como ha cambiado con el tiempo.",
    statusLabel: `Recordatorio ${anniversaryCandidate.milestoneYear} años`,
    locationLabel:
      anniversaryCandidate.existingCheckIn?.location_label ??
      anniversaryCandidate.ritual.location_label ??
      null,
    actionLabel: "Actualizar seguimiento",
  } satisfies HomeRitualAction;
}

export function getHomeCapsuleAction(input: {
  capsules: TimeCapsuleRow[];
  currentYear: number;
  capsulePromptStartMonth?: number;
  now?: Date;
}) {
  const readyCapsules = input.capsules.filter(
    (capsule) => capsule.status === "ready" || isCapsuleReady(capsule),
  );

  if (readyCapsules.length > 0) {
    const firstReadyCapsule = [...readyCapsules].sort((left, right) =>
      left.opens_at.localeCompare(right.opens_at),
    )[0];
    return {
      kind: "open_ready",
      title:
        readyCapsules.length === 1
          ? `"${firstReadyCapsule.title}" ya puede abrirse`
          : `Teneis ${readyCapsules.length} capsulas listas para abrir`,
      description:
        "El tiempo ya ha hecho su parte. Ahora toca descubrir que guardasteis para este momento.",
      statusLabel:
        readyCapsules.length === 1
          ? capsuleStatusLabel(firstReadyCapsule.status === "sealed" ? "ready" : firstReadyCapsule.status)
          : "Listas para abrir",
      actionLabel: "Abrir capsulas",
    } satisfies HomeCapsuleAction;
  }

  const hasCurrentYearCapsule = input.capsules.some(
    (capsule) => getCapsuleYear(capsule) === input.currentYear,
  );

  if (
    !hasCurrentYearCapsule &&
    isAnnualCapsulePromptSeason(
      input.now ?? new Date(),
      input.capsulePromptStartMonth,
    )
  ) {
    return {
      kind: "create_annual",
      title: `Capsula anual ${input.currentYear}`,
      description:
        "Todavia no habeis sellado la capsula de este año. Guardad una promesa, una foto o una pequena pieza del presente antes de cerrar el capitulo.",
      statusLabel: "Pendiente de sellar",
      actionLabel: "Crear capsula anual",
    } satisfies HomeCapsuleAction;
  }

  return null;
}
