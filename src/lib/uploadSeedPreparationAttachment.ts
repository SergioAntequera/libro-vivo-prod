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

  return await new Promise<UploadedSeedPreparationAttachment>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/plans/preparation/upload", true);
    xhr.responseType = "text";
    xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);

    xhr.onerror = () => {
      reject(
        new Error(
          "Fallo de red al subir el documento. Recarga la app y, si sigue igual, cierra la PWA y vuelve a abrirla.",
        ),
      );
    };

    xhr.onabort = () => {
      reject(new Error("La subida del documento se cancelo antes de terminar."));
    };

    xhr.onload = () => {
      const payload = ((): { error?: string } | UploadedSeedPreparationAttachment | null => {
        try {
          return JSON.parse(xhr.responseText || "{}") as
            | { error?: string }
            | UploadedSeedPreparationAttachment;
        } catch {
          return null;
        }
      })();

      if (xhr.status < 200 || xhr.status >= 300) {
        reject(
          new Error(
            (payload && typeof payload === "object" && payload !== null && "error" in payload
              ? String(payload.error ?? "").trim()
              : "") || "No se pudo subir el documento de preparacion.",
          ),
        );
        return;
      }

      if (!payload || typeof payload !== "object" || !("url" in payload)) {
        reject(new Error("La subida termino, pero el servidor no devolvio un adjunto valido."));
        return;
      }

      resolve(payload as UploadedSeedPreparationAttachment);
    };

    xhr.send(form);
  });
}
