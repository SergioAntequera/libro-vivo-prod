import type { HomeTrailRuntimeConfig } from "@/lib/homeTrailCatalog";
import type { MapPointItem } from "@/lib/homeMapTypes";
import type { MapPlaceRecord, MapRouteRecord, MapZoneRecord } from "@/lib/mapDomainTypes";
import type { GardenYearTreeState } from "@/lib/annualTreeState";
import type { PageVisualState } from "@/lib/pageVisualState";
import type { PlanFlowerComposerConfig } from "@/lib/planTypeFlowerComposer";
import type {
  ProgressionTreeRank,
  ProgressionTreeRarity,
} from "@/lib/progressionTreeVisuals";

export type HomeProfile = {
  id: string;
  name: string;
  last_name: string | null;
  pronoun: string | null;
  role: "gardener_a" | "gardener_b" | "superadmin";
  avatar_url: string | null;
};

export type HomeSettings = {
  id: number;
  welcome_text: string;
  garden_name?: string | null;
  narrator_tone: string;
  season_mode: "auto" | "manual";
};

export type SeedStatusRow = {
  id: string;
  title: string;
  element: string | null;
  status: string;
  scheduled_date: string | null;
  bloomed_page_id: string | null;
  created_at: string;
};

export type HomePageRow = {
  id: string;
  element: string | null;
  title: string | null;
  date: string | null;
  rating: number | null;
  plan_type_id: string | null;
  cover_photo_url: string | null;
  thumbnail_url: string | null;
  canvas_objects: unknown;
  mood_state: string | null;
  location_lat?: number | string | null;
  location_lng?: number | string | null;
  location_label: string | null;
  is_favorite: boolean | null;
  planned_from_seed_id: string | null;
};

export type HomePagePlanVisual = {
  category: string | null;
  flowerFamily: string | null;
  flowerAssetPath: string | null;
  flowerBuilderConfig: PlanFlowerComposerConfig | null;
  suggestedElement: string | null;
};

export type UnlockRow = {
  id: string | null;
  rule_id: string;
  created_at: string | null;
  claimed_at: string | null;
};

export type RuleRow = {
  id: string;
  title: string;
  tier: "bronze" | "silver" | "gold" | "diamond";
  default_reward_id: string | null;
  preferred_region_id?: string | null;
  importance?: "paso" | "importante" | "mayor" | "anual" | null;
  rank?: ProgressionTreeRank | null;
  rarity?: ProgressionTreeRarity | null;
  leaf_variant?: number | null;
  accent_color?: string | null;
};

export type BloomPagePreview = {
  id: string;
  title: string;
  date: string;
  element: string | null;
  rating: number | null;
  coverPhotoUrl: string | null;
  thumbnailUrl: string | null;
  snippet: string | null;
  location: string | null;
  mood: string | null;
  isFavorite: boolean;
  hasPhoto: boolean;
  hasText: boolean;
  hasMetadata: boolean;
};

export type HomeBootstrapData = {
  profile: HomeProfile | null;
  activeGardenId: string | null;
  settings: HomeSettings | null;
  loading: boolean;
  hasGarden: boolean;
  fetchWarning: string | null;
  bloomedStatusCode: string;
  seedRows: SeedStatusRow[];
  unlocks: UnlockRow[];
  rulesById: Record<string, RuleRow>;
  pageRows: HomePageRow[];
  pageElementById: Record<string, string>;
  pagePlanVisualById: Record<string, HomePagePlanVisual>;
  pageVisualStateById: Record<string, PageVisualState>;
  bloomPagePreviewById: Record<string, BloomPagePreview>;
  mapMemories: MapPointItem[];
  mapPlaces: MapPlaceRecord[];
  mapRoutes: MapRouteRecord[];
  mapZones: MapZoneRecord[];
  flowerIconByElement: Record<string, string>;
  treeIconByTier: Record<string, string>;
  defaultFlowerIcon: string;
  defaultTreeIcon: string;
  sceneTokens: import("@/lib/homeSceneDefaults").HomeSceneTokens;
  homeTrailConfig: HomeTrailRuntimeConfig;
  annualTreeStates: GardenYearTreeState[];
};
