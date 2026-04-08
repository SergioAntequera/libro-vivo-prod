"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { GardenChatMessageAttachmentRow } from "@/lib/gardenChatMedia";

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 12;

export function useGardenChatAttachmentUrls(
  attachments: GardenChatMessageAttachmentRow[],
) {
  const [resolvedById, setResolvedById] = useState<Record<string, string>>({});

  const privateAttachments = useMemo(
    () =>
      attachments.filter(
        (attachment) => attachment.storage_bucket === "garden-chat-media" && attachment.storage_path,
      ),
    [attachments],
  );
  const hasPrivateAttachments = privateAttachments.length > 0;

  useEffect(() => {
    if (!hasPrivateAttachments) return;

    let cancelled = false;

    (async () => {
      const results = await Promise.all(
        privateAttachments.map(async (attachment) => {
          const { data, error } = await supabase.storage
            .from(attachment.storage_bucket)
            .createSignedUrl(attachment.storage_path, SIGNED_URL_TTL_SECONDS);

          if (error || !data?.signedUrl) {
            return [attachment.id, ""] as const;
          }

          return [attachment.id, data.signedUrl] as const;
        }),
      );

      if (cancelled) return;
      setResolvedById(
        Object.fromEntries(results.filter((entry) => entry[1])),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [hasPrivateAttachments, privateAttachments]);

  return useMemo(() => {
    const merged: Record<string, string> = {};
    for (const attachment of attachments) {
      merged[attachment.id] =
        attachment.storage_bucket === "garden-chat-media"
          ? hasPrivateAttachments
            ? resolvedById[attachment.id] || ""
            : ""
          : attachment.storage_path;
    }
    return merged;
  }, [attachments, hasPrivateAttachments, resolvedById]);
}
