import { NextResponse } from "next/server";
import { getCatalogItems } from "@/lib/appConfig";
import { requireSuperadminRoute } from "@/lib/serverRouteAuth";
import {
  buildTrailSlotsExport,
  resolveTrailGeometry,
} from "@/lib/homeTrailGeometry";
import { resolveHomeTrailConfigFromSceneCatalog } from "@/lib/homeTrailCatalog";
import { HOME_VISIBLE_TRAIL_PATH_CONFIG } from "@/lib/homeTrailPathConfig";

export async function GET(req: Request) {
  const auth = await requireSuperadminRoute(req);
  if (!auth.ok) return auth.response;

  const sceneCatalog = await getCatalogItems("home_scene_theme");
  const persistedConfig = resolveHomeTrailConfigFromSceneCatalog(sceneCatalog);
  const geometry = resolveTrailGeometry(persistedConfig);

  return NextResponse.json({
    source: HOME_VISIBLE_TRAIL_PATH_CONFIG.sourceLabel,
    sourceAsset: persistedConfig.sourceAsset,
    viewBox: {
      width: geometry.canvasWidth,
      height: geometry.canvasHeight,
    },
    pathD: geometry.pathD,
    points: buildTrailSlotsExport(365, geometry.segments),
  });
}
