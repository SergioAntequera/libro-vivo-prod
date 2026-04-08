import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { isSchemaNotReadyError, withGardenIdOnInsert } from "@/lib/gardens";
import { FALLBACK_PLAN_TYPE_PRESETS } from "@/lib/planTypeCatalog";
import { resolveFlowerFamilyFromPlanType } from "@/lib/productDomainContracts";
import {
  PLAN_FLOWER_BUILDER_TEMPLATE,
  PLAN_SEED_BUILDER_TEMPLATE,
} from "@/lib/planVisuals";

type SupabaseLikeClient = Pick<SupabaseClient, "from">;

type EnsureGardenPlanTypesParams = {
  gardenId: string | null;
  profileId: string;
  client?: SupabaseLikeClient;
};

function getClient(client?: SupabaseLikeClient) {
  return client ?? supabase;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    const message = String((error as { message?: unknown }).message ?? "").trim();
    if (message) return message;
  }
  return fallback;
}

export async function ensureGardenPlanTypes({
  gardenId,
  profileId,
  client,
}: EnsureGardenPlanTypesParams) {
  if (!gardenId || !profileId) return;

  const rows = FALLBACK_PLAN_TYPE_PRESETS.map((item) =>
    withGardenIdOnInsert(
      {
        code: item.code,
        label: item.label,
        category: item.category,
        description: item.description,
        flower_family: resolveFlowerFamilyFromPlanType({
          code: item.code,
          suggestedElement: item.suggestedElement,
        }),
        suggested_element: item.suggestedElement,
        icon_emoji: item.iconEmoji,
        flower_asset_path: PLAN_FLOWER_BUILDER_TEMPLATE,
        seed_asset_path: PLAN_SEED_BUILDER_TEMPLATE,
        flower_builder_config: {},
        is_custom: false,
        sort_order: item.sortOrder,
        created_by_user_id: profileId,
      },
      gardenId,
    ),
  );

  const { error } = await getClient(client)
    .from("garden_plan_types")
    .upsert(rows, { onConflict: "garden_id,code", ignoreDuplicates: true });

  if (error && !isSchemaNotReadyError(error)) {
    throw new Error(
      getErrorMessage(error, "No se pudo preparar la biblioteca de tipos de plan."),
    );
  }
}
