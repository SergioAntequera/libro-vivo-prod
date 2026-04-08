import {
  extractProgressionStickerSources,
  listClaimedProgressionRewards,
} from "@/lib/progressionRewardsRuntime";

export async function getUnlockedStickers(gardenId?: string | null): Promise<string[]> {
  const canonical = await listClaimedProgressionRewards({
    gardenId,
    kinds: ["sticker_pack"],
  }).catch(() => []);
  return extractProgressionStickerSources(canonical);
}
