"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getSessionAccessToken } from "@/lib/auth";
import { isSchemaNotReadyError } from "@/lib/gardens";

type ProfileLookupRow = {
  id: string;
  name: string | null;
  pronoun: string | null;
};

type CompanionEntry = {
  name: string;
  pronoun: string;
};

type GardenApiParticipantRow = {
  id?: string | null;
  name?: string | null;
};

type GardensApiPayload = {
  gardens?: Array<{
    id?: string | null;
    participants?: GardenApiParticipantRow[] | null;
  }> | null;
};

function compactPersonName(value: string) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "";
  return normalized.split(/\s+/)[0] || normalized;
}

function normalizePronounLabel(value: string | null | undefined) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (normalized === "ella") return "ella";
  if (normalized === "el") return "el";
  if (normalized === "elle") return "elle";
  return "";
}

function mapApiCompanions(input: {
  payload: GardensApiPayload | null;
  targetGardenId: string;
  currentProfileId: string;
}) {
  const garden = (input.payload?.gardens ?? []).find(
    (item) => String(item?.id ?? "").trim() === input.targetGardenId,
  );
  return (garden?.participants ?? [])
    .map((participant) => ({
      id: String(participant?.id ?? "").trim(),
      name: compactPersonName(participant?.name ?? ""),
    }))
    .filter((participant) => participant.id && participant.id !== input.currentProfileId)
    .map((participant) => ({
      name: participant.name,
      pronoun: "",
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "es"));
}

export function useGardenCompanionLabel(
  gardenId: string | null | undefined,
  myProfileId: string | null | undefined,
) {
  const [companions, setCompanions] = useState<CompanionEntry[]>([]);
  const targetGardenId = String(gardenId ?? "").trim();
  const currentProfileId = String(myProfileId ?? "").trim();
  const canResolveCompanions = Boolean(targetGardenId && currentProfileId);

  useEffect(() => {
    if (!canResolveCompanions) return;

    let cancelled = false;

    void (async () => {
      const accessToken = await getSessionAccessToken().catch(() => null);
      if (accessToken) {
        try {
          const response = await fetch("/api/gardens", {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            credentials: "same-origin",
          });
          if (response.ok) {
            const payload = (await response.json().catch(() => null)) as GardensApiPayload | null;
            const apiCompanions = mapApiCompanions({
              payload,
              targetGardenId,
              currentProfileId,
            });
            if (apiCompanions.length) {
              if (!cancelled) setCompanions(apiCompanions);
              return;
            }
          }
        } catch {
          // Fallback to the direct RLS-safe query below.
        }
      }

      const memberRes = await supabase
        .from("garden_members")
        .select("user_id")
        .eq("garden_id", targetGardenId)
        .is("left_at", null);

      if (memberRes.error) {
        if (!cancelled && !isSchemaNotReadyError(memberRes.error)) {
          setCompanions([]);
        }
        return;
      }

      const ids = ((memberRes.data as Array<{ user_id?: string }> | null) ?? [])
        .map((row) => String(row.user_id ?? "").trim())
        .filter((value) => value && value !== currentProfileId);

      if (!ids.length) {
        if (!cancelled) setCompanions([]);
        return;
      }

      const profileRes = await supabase
        .from("profiles")
        .select("id,name,pronoun")
        .in("id", ids);

      if (profileRes.error) {
        if (!cancelled && !isSchemaNotReadyError(profileRes.error)) {
          setCompanions([]);
        }
        return;
      }

      const nextCompanions = ((profileRes.data as ProfileLookupRow[] | null) ?? [])
        .map((row) => ({
          name: compactPersonName(row.name ?? ""),
          pronoun: normalizePronounLabel(row.pronoun),
        }))
        .sort((left, right) => left.name.localeCompare(right.name, "es"));

      if (!cancelled) {
        setCompanions(nextCompanions);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canResolveCompanions, currentProfileId, targetGardenId]);
  const visibleCompanions = canResolveCompanions ? companions : [];

  const companionNames = useMemo(
    () => visibleCompanions.map((entry) => entry.name).filter(Boolean),
    [visibleCompanions],
  );

  const companionLabel = useMemo(() => {
    if (!companionNames.length) return "la otra persona";
    if (companionNames.length === 1) return companionNames[0];
    return `${companionNames.length} personas`;
  }, [companionNames]);

  const companionReference = useMemo(() => {
    if (visibleCompanions.length !== 1) return "la otra persona";
    return visibleCompanions[0].name || visibleCompanions[0].pronoun || "la otra persona";
  }, [visibleCompanions]);

  return {
    companions: visibleCompanions,
    companionNames,
    companionLabel,
    companionReference,
  };
}
