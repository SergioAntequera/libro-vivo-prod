import type { SeedPlaceOption, SeedRouteOption } from "@/lib/plansTypes";
import type {
  SeedPreparationAttachmentKind,
  SeedPreparationAttachmentLinkKind,
  SeedPreparationDestinationKind,
  SeedPreparationItineraryStatus,
  SeedPreparationPlacePlanningState,
  SeedPreparationPlacePriority,
  SeedPreparationReservationKind,
  SeedPreparationReservationStatus,
  SeedPreparationStayKind,
  SeedPreparationStop,
  SeedPreparationTransportKind,
} from "@/lib/seedPreparationTypes";

export type PreparationSelectOption<T extends string> = {
  value: T;
  label: string;
};

export const DESTINATION_KIND_OPTIONS: PreparationSelectOption<SeedPreparationDestinationKind>[] = [
  { value: "city", label: "Ciudad" },
  { value: "beach", label: "Playa" },
  { value: "mountain", label: "Montana" },
  { value: "international", label: "Otro pais" },
  { value: "road_trip", label: "Ruta por carretera" },
  { value: "other", label: "Otro" },
];

export const TRANSPORT_KIND_OPTIONS: PreparationSelectOption<SeedPreparationTransportKind>[] = [
  { value: "walking", label: "A pie" },
  { value: "car", label: "Coche" },
  { value: "train", label: "Tren" },
  { value: "plane", label: "Avion" },
  { value: "bus", label: "Bus" },
  { value: "boat", label: "Barco" },
  { value: "metro", label: "Metro" },
  { value: "mixed", label: "Mixto" },
  { value: "other", label: "Otro" },
];

export const STAY_KIND_OPTIONS: PreparationSelectOption<SeedPreparationStayKind>[] = [
  { value: "hotel", label: "Hotel" },
  { value: "hostel", label: "Hostal" },
  { value: "apartment", label: "Apartamento" },
  { value: "house", label: "Casa" },
  { value: "camping", label: "Camping" },
  { value: "other", label: "Otro" },
];

export const PLACE_PRIORITY_OPTIONS: PreparationSelectOption<SeedPreparationPlacePriority>[] = [
  { value: "must", label: "Imprescindible" },
  { value: "would_like", label: "Me gustaria" },
  { value: "if_time", label: "Si da tiempo" },
];

export const PLACE_STATE_OPTIONS: PreparationSelectOption<SeedPreparationPlacePlanningState>[] = [
  { value: "idea", label: "Idea" },
  { value: "booked", label: "Reservado" },
  { value: "visited", label: "Visitado" },
  { value: "skipped", label: "Descartado" },
];

export const ITINERARY_STATUS_OPTIONS: PreparationSelectOption<SeedPreparationItineraryStatus>[] = [
  { value: "planned", label: "Planeado" },
  { value: "confirmed", label: "Confirmado" },
  { value: "flexible", label: "Flexible" },
  { value: "done", label: "Hecho" },
  { value: "dropped", label: "Descartado" },
];

export const RESERVATION_KIND_OPTIONS: PreparationSelectOption<SeedPreparationReservationKind>[] = [
  { value: "ticket", label: "Entrada" },
  { value: "booking", label: "Reserva" },
  { value: "insurance", label: "Seguro" },
  { value: "restaurant", label: "Restaurante" },
  { value: "activity", label: "Actividad" },
  { value: "other", label: "Otro" },
];

export const RESERVATION_STATUS_OPTIONS: PreparationSelectOption<SeedPreparationReservationStatus>[] =
  [
    { value: "pending", label: "Pendiente" },
    { value: "confirmed", label: "Confirmada" },
    { value: "cancelled", label: "Cancelada" },
  ];

export const ATTACHMENT_KIND_OPTIONS: PreparationSelectOption<SeedPreparationAttachmentKind>[] = [
  { value: "passport", label: "Pasaporte" },
  { value: "dni", label: "DNI" },
  { value: "ticket", label: "Billete" },
  { value: "reservation", label: "Reserva" },
  { value: "insurance", label: "Seguro" },
  { value: "medical", label: "Medico" },
  { value: "other", label: "Otro" },
];

export const ATTACHMENT_LINK_KIND_OPTIONS: PreparationSelectOption<SeedPreparationAttachmentLinkKind>[] =
  [
    { value: "seed", label: "Resumen del viaje" },
    { value: "transport_leg", label: "Trayecto" },
    { value: "stay", label: "Alojamiento" },
    { value: "reservation", label: "Reserva" },
    { value: "generic_document", label: "Documento general" },
  ];

export function buildPlaceOptionLabel(place: SeedPlaceOption) {
  return place.subtitle?.trim() ? `${place.title} - ${place.subtitle}` : place.title;
}

export function buildRouteOptionLabel(route: SeedRouteOption) {
  return route.subtitle?.trim() ? `${route.title} - ${route.subtitle}` : route.title;
}

export function buildStopOptionLabel(stop: SeedPreparationStop, index: number) {
  const title = stop.title.trim();
  return title || `Etapa ${index + 1}`;
}

export function formatPreparationDateRange(
  startsOn: string | null | undefined,
  endsOn: string | null | undefined,
  dateMode: "single_day" | "date_range" | "flexible",
) {
  if (dateMode === "flexible") return "Fechas flexibles";
  const start = String(startsOn ?? "").trim();
  const end = String(endsOn ?? "").trim();
  if (dateMode === "single_day") return start || "Sin fecha todavia";
  if (start && end) return `${start} -> ${end}`;
  return start || end || "Sin rango todavia";
}

export function computeDateRangeDays(
  startsOn: string | null | undefined,
  endsOn: string | null | undefined,
  dateMode: "single_day" | "date_range" | "flexible",
) {
  if (dateMode === "flexible") return null;
  const start = String(startsOn ?? "").trim();
  if (!start) return null;
  if (dateMode === "single_day") return 1;
  const end = String(endsOn ?? "").trim();
  if (!end) return null;
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;
  const diff = Math.round((endDate.getTime() - startDate.getTime()) / 86400000);
  return diff >= 0 ? diff + 1 : null;
}
