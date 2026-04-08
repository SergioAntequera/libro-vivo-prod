import type {
  MapPlaceKind,
  MapPlaceState,
  MapRouteKind,
  MapRouteStatus,
  MapRouteTravelMode,
  MapZoneKind,
  MapZoneStatus,
} from "@/lib/mapDomainTypes";
import type { FlowerFamily } from "@/lib/productDomainContracts";

export type MapPointSourceType = "memory" | "place";

export type MapPointItem = {
  id: string;
  sourceType: MapPointSourceType;
  sourceId: string;
  title: string;
  date: string;
  element: string | null;
  flowerFamily: FlowerFamily | null;
  planTypeLabel: string | null;
  rating: number | null;
  lat: number;
  lng: number;
  href: string | null;
  linkedPageId: string | null;
  linkedSeedId: string | null;
  locationLabel: string;
  photoUrl: string | null;
  snippet: string | null;
  isFavorite: boolean;
  placeKind: MapPlaceKind | null;
  placeState: MapPlaceState | null;
  iconCode: string | null;
  colorToken: string | null;
  addressLabel: string | null;
  notes: string | null;
  tags: string[];
};

export type MapHighlightedPlace = {
  label: string;
  subtitle: string;
  lat: number;
  lng: number;
  href: string | null;
  sourceType: "memory" | "place" | "geocode";
  placeId: string | null;
  placeKind: MapPlaceKind | null;
  placeState: MapPlaceState | null;
  isFavorite: boolean;
};

export type MapHighlightedRoute = {
  id: string;
  title: string;
  subtitle: string | null;
  notes: string | null;
  kind: MapRouteKind;
  status: MapRouteStatus;
  travelMode: MapRouteTravelMode;
  distanceMeters: number | null;
  durationSeconds: number | null;
  originLabel: string | null;
  destinationLabel: string | null;
  colorToken: string | null;
};

export type MapHighlightedZone = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  kind: MapZoneKind;
  status: MapZoneStatus;
  colorToken: string | null;
};
