import type { Instrumentation } from "next";

import { reportServerEvent } from "@/lib/serverTelemetry";

export function register() {
  reportServerEvent({
    event: "server.runtime.started",
    data: {
      runtime: process.env.NEXT_RUNTIME ?? "unknown",
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
      release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || "local",
    },
  });
}

export const onRequestError: Instrumentation.onRequestError = async (error, _request, context) => {
  const normalizedError = error instanceof Error ? error : new Error("Unknown server request error");
  const digest =
    error && typeof error === "object" && "digest" in error
      ? String((error as { digest?: unknown }).digest ?? "") || null
      : null;
  reportServerEvent({
    event: "server.request.unhandled_error",
    level: "error",
    data: {
      error: normalizedError,
      digest,
      routerKind: context.routerKind,
      routePath: context.routePath,
      routeType: context.routeType,
      renderSource: context.renderSource,
      revalidateReason: context.revalidateReason ?? null,
    },
  });
};
