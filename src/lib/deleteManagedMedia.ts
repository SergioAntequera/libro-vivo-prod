import { supabase } from "@/lib/supabase";
import { isDriveProxyMediaUrl } from "@/lib/driveMediaUrl";
import { toErrorMessage } from "@/lib/errorMessage";

export async function deleteManagedMediaForPage(pageId: string, url: string) {
  const pageIdValue = String(pageId ?? "").trim();
  const urlValue = String(url ?? "").trim();
  if (!pageIdValue || !urlValue) return false;
  if (!isDriveProxyMediaUrl(urlValue)) return false;

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session?.access_token) {
    throw new Error("Sesión no valida. Inicia sesión de nuevo para borrar archivos.");
  }

  const response = await fetch("/api/media/delete", {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      pageId: pageIdValue,
      url: urlValue,
    }),
  });

  if (!response.ok) {
    let reason = `No se pudo borrar media gestionada (${response.status})`;
    try {
      const payload = (await response.json()) as Record<string, unknown>;
      reason = String(payload.error ?? payload.message ?? reason);
    } catch {
      const text = await response.text().catch(() => "");
      if (text) reason = text;
    }
    throw new Error(reason);
  }

  return true;
}

export async function deleteManagedMediaBatchForPage(
  pageId: string,
  urls: Array<string | null | undefined>,
) {
  const uniqueUrls = Array.from(
    new Set(
      urls
        .map((value) => String(value ?? "").trim())
        .filter(Boolean),
    ),
  );

  const failed: string[] = [];
  let deletedCount = 0;
  let skippedCount = 0;

  for (const url of uniqueUrls) {
    try {
      const deleted = await deleteManagedMediaForPage(pageId, url);
      if (deleted) deletedCount += 1;
      else skippedCount += 1;
    } catch (error) {
      failed.push(describeManagedMediaDeleteError(error));
    }
  }

  return {
    deletedCount,
    skippedCount,
    failed,
  };
}

export function describeManagedMediaDeleteError(error: unknown) {
  return toErrorMessage(error, "No se pudo borrar el archivo gestionado.");
}
