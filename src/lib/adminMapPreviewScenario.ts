import { mapPlaceRecordToPoint } from "@/lib/homeMapEntities";
import type { MapPointItem } from "@/lib/homeMapTypes";
import type { MapPlaceRecord, MapRouteRecord, MapZoneRecord } from "@/lib/mapDomainTypes";
import type { MapRuntimeConfig } from "@/lib/mapCatalogConfig";

export type AdminMapPreviewScenarioId = "empty" | "pins" | "journey";

export type AdminMapPreviewScenario = {
  id: AdminMapPreviewScenarioId;
  label: string;
  description: string;
  points: MapPointItem[];
  places: MapPlaceRecord[];
  routes: MapRouteRecord[];
  zones: MapZoneRecord[];
  focus: { lat: number; lng: number; zoom: number };
};

const DEMO_GARDEN_ID = "__global_demo__";
const DEMO_USER_ID = "__superadmin_demo__";
const DEMO_DATE = "2026-03-20T12:00:00.000Z";
const DEMO_CENTER = { lat: 40.4168, lng: -3.7038 };

function polarPoint(index: number, total: number, radius = 0.016) {
  const angle = (-Math.PI / 2) + (index / Math.max(total, 1)) * Math.PI * 2;
  return {
    lat: DEMO_CENTER.lat + Math.sin(angle) * radius,
    lng: DEMO_CENTER.lng + Math.cos(angle) * radius,
  };
}

function buildDemoPlace(input: {
  id: string;
  title: string;
  subtitle: string;
  notes: string;
  kind: string;
  state: string;
  lat: number;
  lng: number;
  colorToken?: string | null;
  iconCode?: string | null;
  tags?: string[];
}) {
  return {
    id: input.id,
    gardenId: DEMO_GARDEN_ID,
    kind: input.kind,
    state: input.state,
    title: input.title,
    subtitle: input.subtitle,
    notes: input.notes,
    addressLabel: input.subtitle,
    lat: input.lat,
    lng: input.lng,
    rating: 4,
    iconCode: input.iconCode ?? null,
    colorToken: input.colorToken ?? null,
    tags: input.tags ?? [],
    metadata: { demo: true },
    links: {
      pageId: null,
      seedId: null,
    },
    createdByUserId: DEMO_USER_ID,
    updatedByUserId: DEMO_USER_ID,
    createdAt: DEMO_DATE,
    updatedAt: DEMO_DATE,
    archivedAt: null,
  } satisfies MapPlaceRecord;
}

function buildDemoRoute(input: {
  id: string;
  title: string;
  subtitle: string;
  notes: string;
  colorToken?: string | null;
  coordinates: Array<[number, number]>;
}) {
  const origin = input.coordinates[0] ?? [DEMO_CENTER.lng, DEMO_CENTER.lat];
  const destination = input.coordinates[input.coordinates.length - 1] ?? origin;
  return {
    id: input.id,
    gardenId: DEMO_GARDEN_ID,
    kind: "custom",
    status: "saved",
    travelMode: "walking",
    title: input.title,
    subtitle: input.subtitle,
    notes: input.notes,
    originLabel: "Inicio demo",
    originLat: origin[1],
    originLng: origin[0],
    destinationLabel: "Destino demo",
    destinationLat: destination[1],
    destinationLng: destination[0],
    waypoints: [],
    geometry: {
      type: "LineString",
      coordinates: input.coordinates,
    },
    distanceMeters: 1180,
    durationSeconds: 920,
    iconCode: null,
    colorToken: input.colorToken ?? "#2f5f44",
    tags: ["demo"],
    metadata: { demo: true },
    links: {
      pageId: null,
      seedId: null,
    },
    createdByUserId: DEMO_USER_ID,
    updatedByUserId: DEMO_USER_ID,
    createdAt: DEMO_DATE,
    updatedAt: DEMO_DATE,
    archivedAt: null,
  } satisfies MapRouteRecord;
}

function buildDemoZone(input: {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  colorToken?: string | null;
  center: { lat: number; lng: number };
  ring: Array<[number, number]>;
}) {
  return {
    id: input.id,
    gardenId: DEMO_GARDEN_ID,
    kind: "symbolic",
    status: "active",
    title: input.title,
    subtitle: input.subtitle,
    description: input.description,
    geojson: {
      type: "Polygon",
      coordinates: [input.ring],
    },
    centroidLat: input.center.lat,
    centroidLng: input.center.lng,
    iconCode: null,
    colorToken: input.colorToken ?? "#8b5cf6",
    tags: ["demo"],
    metadata: { demo: true },
    links: {
      pageId: null,
      seedId: null,
    },
    createdByUserId: DEMO_USER_ID,
    updatedByUserId: DEMO_USER_ID,
    createdAt: DEMO_DATE,
    updatedAt: DEMO_DATE,
    archivedAt: null,
  } satisfies MapZoneRecord;
}

function buildPinsScenario(config: MapRuntimeConfig) {
  const visibleStates = config.placeStates.filter((item) => item.code !== "archived");
  const placeKinds = config.placeKinds.slice(0, 7);
  const places = placeKinds.map((kind, index) => {
    const point = polarPoint(index, Math.max(placeKinds.length, 1), 0.017);
    const state = visibleStates[index % Math.max(visibleStates.length, 1)]?.code ?? "saved";
    return buildDemoPlace({
      id: `demo-kind-${kind.code}`,
      title: kind.label,
      subtitle: `Vista global · ${state}`,
      notes: "Pin demo del sistema para validar semantica visual global.",
      kind: kind.code,
      state,
      lat: point.lat,
      lng: point.lng,
      colorToken: kind.color,
      tags: ["demo", `kind:${kind.code}`],
    });
  });

  return {
    places,
    routes: [] as MapRouteRecord[],
    zones: [] as MapZoneRecord[],
    focus: { ...DEMO_CENTER, zoom: 13 },
  };
}

function buildJourneyScenario(config: MapRuntimeConfig) {
  const restaurantKind = config.placeKinds.find((item) => item.code === "restaurant") ?? config.placeKinds[0];
  const viewpointKind = config.placeKinds.find((item) => item.code === "viewpoint") ?? config.placeKinds[1] ?? config.placeKinds[0];
  const customKind = config.placeKinds.find((item) => item.code === "custom") ?? config.placeKinds[2] ?? config.placeKinds[0];

  const places = [
    buildDemoPlace({
      id: "demo-journey-origin",
      title: restaurantKind?.label ?? "Restaurante",
      subtitle: "Comienzo de la experiencia",
      notes: "Aquí revisas cómo se ve un pin de comida en un recorrido completo.",
      kind: restaurantKind?.code ?? "spot",
      state: "favorite",
      lat: 40.4176,
      lng: -3.7092,
      colorToken: restaurantKind?.color,
      tags: ["demo", "favorite"],
    }),
    buildDemoPlace({
      id: "demo-journey-mid",
      title: viewpointKind?.label ?? "Mirador",
      subtitle: "Parada intermedia",
      notes: "Este punto sirve para validar el equilibrio entre tipo, color y popup.",
      kind: viewpointKind?.code ?? "spot",
      state: "visited",
      lat: 40.4216,
      lng: -3.7035,
      colorToken: viewpointKind?.color,
      tags: ["demo", "visited"],
    }),
    buildDemoPlace({
      id: "demo-journey-destination",
      title: customKind?.label ?? "Especial",
      subtitle: "Final pendiente o simbólico",
      notes: "Un final de trayecto para comprobar estados, zonas y narrativa visual.",
      kind: customKind?.code ?? "spot",
      state: "wishlist",
      lat: 40.4251,
      lng: -3.6972,
      colorToken: customKind?.color,
      tags: ["demo", "wishlist"],
    }),
  ];

  const route = buildDemoRoute({
    id: "demo-route-1",
    title: "Ruta demo del sistema",
    subtitle: "Recorrido corto para validar trazado y color",
    notes: "Ruta de ejemplo para comprobar como dialogan pins, popup, ruta y zona.",
    coordinates: [
      [-3.7092, 40.4176],
      [-3.7068, 40.4192],
      [-3.7035, 40.4216],
      [-3.7008, 40.4234],
      [-3.6972, 40.4251],
    ],
    colorToken: "#2f5f44",
  });

  const zone = buildDemoZone({
    id: "demo-zone-1",
    title: "Zona simbólica demo",
    subtitle: "Area editorial",
    description: "Zona de ejemplo para validar color, opacidad y lectura espacial global.",
    center: { lat: 40.421, lng: -3.7015 },
    colorToken: "#8b5cf6",
    ring: [
      [-3.7057, 40.4192],
      [-3.6994, 40.4194],
      [-3.6976, 40.4235],
      [-3.7027, 40.4257],
      [-3.7057, 40.4192],
    ],
  });

  return {
    places,
    routes: [route],
    zones: [zone],
    focus: { lat: 40.4211, lng: -3.7027, zoom: 13 },
  };
}

export function buildAdminMapPreviewScenario(
  scenarioId: AdminMapPreviewScenarioId,
  config: MapRuntimeConfig,
  extraPlaces: MapPlaceRecord[] = [],
): AdminMapPreviewScenario {
  if (scenarioId === "empty") {
    const places = [...extraPlaces];
    return {
      id: "empty",
      label: "Lienzo vacío",
      description: "Canvas limpio para añadir pines demo y probar el sistema sin ruido.",
      places,
      points: places.map((place) => mapPlaceRecordToPoint(place)),
      routes: [],
      zones: [],
      focus: { ...DEMO_CENTER, zoom: 12 },
    };
  }

  if (scenarioId === "journey") {
    const scenario = buildJourneyScenario(config);
    const places = [...scenario.places, ...extraPlaces];
    return {
      id: "journey",
      label: "Recorrido editorial",
      description: "Ejemplo completo con pins, ruta y zona para validar el mapa como sistema vivo.",
      places,
      points: places.map((place) => mapPlaceRecordToPoint(place)),
      routes: scenario.routes,
      zones: scenario.zones,
      focus: scenario.focus,
    };
  }

  const scenario = buildPinsScenario(config);
  const places = [...scenario.places, ...extraPlaces];
  return {
    id: "pins",
    label: "Pins y estados",
    description: "Un pin por tipo para revisar glifo, asset, color y acento de estado.",
    places,
    points: places.map((place) => mapPlaceRecordToPoint(place)),
    routes: [],
    zones: [],
    focus: scenario.focus,
  };
}
