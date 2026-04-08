"use client";

import { useEffect, useState } from "react";
import { isSchemaNotReadyError, withGardenScope } from "@/lib/gardens";
import { supabase } from "@/lib/supabase";

type UsePageGardenMembersParams = {
  activeGardenId: string | null;
  enabled?: boolean;
};

export function usePageGardenMembers({
  activeGardenId,
  enabled = true,
}: UsePageGardenMembersParams) {
  const [activeGardenMemberCount, setActiveGardenMemberCount] = useState(1);
  const [memberNamesById, setMemberNamesById] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;

    void (async () => {
      if (!enabled || !activeGardenId) {
        if (active) {
          setActiveGardenMemberCount(1);
          setMemberNamesById({});
        }
        return;
      }

      const { data: memberRows, error: memberError } = await withGardenScope(
        supabase
          .from("garden_members")
          .select("user_id")
          .is("left_at", null),
        activeGardenId,
      );

      if (!active) return;
      if (memberError) {
        if (!isSchemaNotReadyError(memberError)) {
          console.warn("[page/detail] no se pudieron cargar garden_members:", memberError);
        }
        return;
      }

      const userIds = (((memberRows as Array<{ user_id?: string | null }> | null) ?? [])
        .map((row) => String(row.user_id ?? "").trim())
        .filter(Boolean));
      setActiveGardenMemberCount(Math.max(userIds.length, 1));

      if (!userIds.length) {
        setMemberNamesById({});
        return;
      }

      const { data: profileRows, error: profileError } = await supabase
        .from("profiles")
        .select("id,name")
        .in("id", userIds);

      if (!active) return;
      if (profileError) {
        console.warn("[page/detail] no se pudieron cargar perfiles del jardin:", profileError);
        return;
      }

      const nextNameMap = (
        (profileRows as Array<{ id?: string | null; name?: string | null }> | null) ?? []
      ).reduce<Record<string, string>>((acc, row) => {
        const nextId = String(row.id ?? "").trim();
        if (!nextId) return acc;
        acc[nextId] = String(row.name ?? "").trim() || "Persona del jardin";
        return acc;
      }, {});

      setMemberNamesById(nextNameMap);
    })();

    return () => {
      active = false;
    };
  }, [activeGardenId, enabled]);

  return {
    activeGardenMemberCount,
    memberNamesById,
  };
}
