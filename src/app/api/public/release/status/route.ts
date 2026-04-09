import { NextResponse } from "next/server";
import { getPublicReleaseCeremonyState } from "@/lib/releaseGate";

export const dynamic = "force-dynamic";

function normalizeErrorMessage(error: unknown) {
  const message = String(
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? (error as { message?: unknown }).message
        : error ?? "",
  ).trim();

  return message || "No se pudo leer el estado de la ceremonia.";
}

export async function GET() {
  try {
    const state = await getPublicReleaseCeremonyState();
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
