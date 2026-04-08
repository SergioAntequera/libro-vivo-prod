import type { Tier } from "@/lib/forestTiers";
import type { PlanFlowerComposerConfig } from "@/lib/planTypeFlowerComposer";

export type ForestItem = {
  id: string;
  title: string | null;
  date: string;
  element: string;
  plan_type_id?: string | null;
  plan_type_label?: string | null;
  plan_category?: string | null;
  flower_family?: string | null;
  flower_asset_path?: string | null;
  flower_builder_config?: PlanFlowerComposerConfig | null;
  suggested_element?: string | null;
  rating: number | null;
  mood_state: "wilted" | "healthy" | "shiny";
  planned_from_seed_id: string | null;
  is_favorite?: boolean | null;
  cover_photo_url?: string | null;
  thumbnail_url?: string | null;
};

export type AchievementRule = {
  id: string;
  kind: "pages_completed" | "seeds_bloomed" | string;
  threshold: number;
  tier: Tier;
  title: string;
  description: string | null;
  default_reward_id: string | null;
};

export type UnlockEntry = {
  rule_id: string;
  created_at: string | null;
};
