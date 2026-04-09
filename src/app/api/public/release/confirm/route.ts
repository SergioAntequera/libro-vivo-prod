import { NextRequest, NextResponse } from "next/server";
import {
  confirmPublicReleaseCeremonySide,
  type ReleaseCeremonySide,
} from "@/lib/releaseGate";

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

function isValidSide(value: unknown): value is ReleaseCeremonySide {
  return value === "left" || value === "right";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { side?: unknown; name?: unknown }
      | null;

    if (!isValidSide(body?.side)) {
      return NextResponse.json(
        { error: "Hace falta indicar a quien corresponde este gesto." },
        { status: 400 },
      );
    }

    const state = await confirmPublicReleaseCeremonySide({
      side: body.side,
      name: String(body?.name ?? ""),
    });

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
