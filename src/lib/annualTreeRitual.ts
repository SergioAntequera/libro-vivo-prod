/**
 * Annual tree ritual: the culminating symbolic/physical act of planting a tree
 * for the year. Integrates with the activity feed, year page popup, and map
 * (as a `ritual_tree` place kind).
 */

export type AnnualTreeRitualStatus = "pending" | "planted" | "confirmed";
export type AnnualTreeCheckInStatus =
  | "growing"
  | "stable"
  | "delicate"
  | "lost"
  | "dead"
  | "replanted";

export type AnnualTreeRitualRow = {
  id: string;
  garden_id: string;
  year: number;
  status: AnnualTreeRitualStatus;
  planted_at: string | null;
  planted_by: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_label: string | null;
  map_place_id: string | null;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
};

export type AnnualTreeCheckInRow = {
  id: string;
  ritual_id: string;
  garden_id: string;
  milestone_year: number;
  observed_at: string;
  status: AnnualTreeCheckInStatus;
  location_lat: number | null;
  location_lng: number | null;
  location_label: string | null;
  notes: string | null;
  photo_url: string | null;
  created_by: string | null;
  created_at: string;
};

export function ritualStatusLabel(status: AnnualTreeRitualStatus): string {
  if (status === "pending") return "Pendiente de plantar";
  if (status === "planted") return "Plantado";
  if (status === "confirmed") return "Confirmado con foto";
  return status;
}

export function annualTreeCheckInStatusLabel(status: AnnualTreeCheckInStatus): string {
  if (status === "growing") return "Creciendo";
  if (status === "stable") return "Estable";
  if (status === "delicate") return "Delicado";
  if (status === "lost") return "Perdido";
  if (status === "dead") return "Muerto";
  if (status === "replanted") return "Replantado";
  return status;
}

// Preview mode lets us review the ritual UX without waiting for real year-end eligibility.
export const RITUAL_PREVIEW_MODE = false;

export function isRitualEligible(year: number, treeStage: number): boolean {
  const currentYear = new Date().getFullYear();
  if (RITUAL_PREVIEW_MODE) {
    return year === currentYear || year === currentYear - 1;
  }
  return treeStage >= 50 && (year === currentYear || year === currentYear - 1);
}

export function ritualActivityMessage(year: number, status: AnnualTreeRitualStatus): string {
  if (status === "pending") {
    return `El \u00e1rbol de ${year} est\u00e1 listo para ser plantado. Es el momento de llevar esta historia al mundo real.`;
  }
  if (status === "planted") {
    return `Hab\u00e9is plantado el \u00e1rbol de ${year}. Un gesto que conecta lo digital con la tierra.`;
  }
  if (status === "confirmed") {
    return `El \u00e1rbol de ${year} est\u00e1 confirmado con foto. Un recuerdo que echar\u00e1 ra\u00edces de verdad.`;
  }
  return "";
}

export function normalizeRitualRow(
  raw: Partial<AnnualTreeRitualRow> & Record<string, unknown>,
  fallbackId: string,
): AnnualTreeRitualRow {
  return {
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id : fallbackId,
    garden_id: typeof raw.garden_id === "string" ? raw.garden_id : "",
    year: typeof raw.year === "number" ? raw.year : new Date().getFullYear(),
    status:
      raw.status === "pending" || raw.status === "planted" || raw.status === "confirmed"
        ? raw.status
        : "pending",
    planted_at: typeof raw.planted_at === "string" ? raw.planted_at : null,
    planted_by: typeof raw.planted_by === "string" ? raw.planted_by : null,
    location_lat:
      typeof raw.location_lat === "number" && Number.isFinite(raw.location_lat)
        ? raw.location_lat
        : null,
    location_lng:
      typeof raw.location_lng === "number" && Number.isFinite(raw.location_lng)
        ? raw.location_lng
        : null,
    location_label: typeof raw.location_label === "string" ? raw.location_label : null,
    map_place_id: typeof raw.map_place_id === "string" ? raw.map_place_id : null,
    notes: typeof raw.notes === "string" ? raw.notes : null,
    photo_url: typeof raw.photo_url === "string" ? raw.photo_url : null,
    created_at: typeof raw.created_at === "string" ? raw.created_at : new Date().toISOString(),
  };
}

export function normalizeAnnualTreeCheckInRow(
  raw: Partial<AnnualTreeCheckInRow> & Record<string, unknown>,
  fallbackId: string,
): AnnualTreeCheckInRow {
  return {
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id : fallbackId,
    ritual_id: typeof raw.ritual_id === "string" ? raw.ritual_id : "",
    garden_id: typeof raw.garden_id === "string" ? raw.garden_id : "",
    milestone_year: typeof raw.milestone_year === "number" ? raw.milestone_year : 1,
    observed_at: typeof raw.observed_at === "string" ? raw.observed_at : new Date().toISOString(),
    status:
      raw.status === "growing" ||
      raw.status === "stable" ||
      raw.status === "delicate" ||
      raw.status === "lost" ||
      raw.status === "dead" ||
      raw.status === "replanted"
        ? raw.status
        : "growing",
    location_lat:
      typeof raw.location_lat === "number" && Number.isFinite(raw.location_lat)
        ? raw.location_lat
        : null,
    location_lng:
      typeof raw.location_lng === "number" && Number.isFinite(raw.location_lng)
        ? raw.location_lng
        : null,
    location_label: typeof raw.location_label === "string" ? raw.location_label : null,
    notes: typeof raw.notes === "string" ? raw.notes : null,
    photo_url: typeof raw.photo_url === "string" ? raw.photo_url : null,
    created_by: typeof raw.created_by === "string" ? raw.created_by : null,
    created_at: typeof raw.created_at === "string" ? raw.created_at : new Date().toISOString(),
  };
}
