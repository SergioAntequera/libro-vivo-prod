import { NextRequest, NextResponse } from "next/server";
import { confirmPublicReleaseCeremonyName } from "@/lib/releaseGate";

export const dynamic = "force-dynamic";

function normalizeErrorMessage(error: unknown) {
  const message = String(
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? (error as { message?: unknown }).message
        : error ?? "",
  ).trim();

  return message || "No se pudo guardar la confirmacion.";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
    const state = await confirmPublicReleaseCeremonyName(String(body?.name ?? ""));

    return NextResponse.json(state);
  } catch (error) {
    return NextResponse.json(
      {
        error: normalizeErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
