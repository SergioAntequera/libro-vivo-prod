import { NextResponse } from "next/server";
import { requireSuperadminRoute } from "@/lib/serverRouteAuth";
import { getGoogleDriveHealthReport } from "@/lib/googleDriveServer";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireSuperadminRoute(req);
  if (!auth.ok) return auth.response;

  try {
    const report = await getGoogleDriveHealthReport();
    return NextResponse.json(report, {
      status: report.reachable && report.rootFolderAccessible ? 200 : 503,
    });
  } catch (error) {
    return NextResponse.json(
      {
        provider: "gdrive",
        configured: true,
        reachable: false,
        reconnectRequired: false,
        rootFolderAccessible: false,
        rootFolderId: null,
        rootFolderName: null,
        message: error instanceof Error ? error.message : "No se pudo validar Google Drive.",
      },
      { status: 500 },
    );
  }
}
