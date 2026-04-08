import { supabase } from "@/lib/supabase";

export type UploadedSeedPreparationAttachment = {
  provider: string;
  fileId: string;
  fileName: string;
  folderId: string;
  url: string;
  mimeType: string;
};

export async function uploadSeedPreparationAttachment(input: {
  seedId: string;
  file: File;
}) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }
  if (!session?.access_token) {
    throw new Error("Sesion no valida. Inicia sesion de nuevo para adjuntar documentos.");
  }

  const form = new FormData();
  form.set("seedId", input.seedId);
  form.set("file", input.file);

  const response = await fetch("/api/plans/preparation/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    body: form,
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string }
    | UploadedSeedPreparationAttachment
    | null;

  if (!response.ok) {
    throw new Error(
      (payload && typeof payload === "object" && payload !== null && "error" in payload
        ? String(payload.error ?? "").trim()
        : "") || "No se pudo subir el documento de preparacion.",
    );
  }

  return payload as UploadedSeedPreparationAttachment;
}
