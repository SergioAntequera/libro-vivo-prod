"use client";

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { getMyProfile, getSessionUser } from "@/lib/auth";
import { resolveActiveGardenIdForUser } from "@/lib/gardens";
import { getProductSurfaceHref } from "@/lib/productSurfaces";
import { toErrorMessage } from "@/lib/errorMessage";

export type GardenChatBootstrapProfile = {
  id: string;
  name: string | null;
  avatar_url: string | null;
};

type UseGardenChatBootstrapParams = {
  mode: "page" | "launcher";
  reloadTick?: number;
};

type UseGardenChatBootstrapResult = {
  loading: boolean;
  msg: string | null;
  profile: GardenChatBootstrapProfile | null;
  activeGardenId: string | null;
  setActiveGardenId: Dispatch<SetStateAction<string | null>>;
  reload: () => void;
};

export function useGardenChatBootstrap({
  mode,
  reloadTick = 0,
}: UseGardenChatBootstrapParams): UseGardenChatBootstrapResult {
  const router = useRouter();
  const [loading, setLoading] = useState(mode === "page");
  const [msg, setMsg] = useState<string | null>(null);
  const [profile, setProfile] = useState<GardenChatBootstrapProfile | null>(null);
  const [activeGardenId, setActiveGardenId] = useState<string | null>(null);
  const [localReloadTick, setLocalReloadTick] = useState(0);

  const reload = useCallback(() => {
    setLocalReloadTick((current) => current + 1);
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        setLoading(true);
        setMsg(null);

        const user = await getSessionUser();
        if (!user) {
          if (mode === "page") {
            router.push(getProductSurfaceHref("login"));
          } else if (active) {
            setProfile(null);
            setActiveGardenId(null);
          }
          return;
        }

        const nextProfile = await getMyProfile(user.id);
        const nextGardenId = await resolveActiveGardenIdForUser({
          userId: user.id,
          forceRefresh: true,
        }).catch(() => null);

        if (!active) return;
        setProfile(nextProfile);
        setActiveGardenId(nextGardenId);
      } catch (error) {
        if (!active) return;
        setMsg(toErrorMessage(error, "No se pudo preparar la superficie de chat."));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [localReloadTick, mode, reloadTick, router]);

  return {
    loading,
    msg,
    profile,
    activeGardenId,
    setActiveGardenId,
    reload,
  };
}
