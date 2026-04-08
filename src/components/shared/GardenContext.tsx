"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { getSessionUser, getMyProfile } from "@/lib/auth";
import {
  resolveActiveGardenIdForUser,
  listGardenMembershipsForUser,
  setActiveGardenIdForUser,
  clearActiveGardenCache,
  type GardenMembership,
} from "@/lib/gardens";
import type { ProfileRow } from "@/lib/roles";

/* ------------------------------------------------------------------ */
/*  Context value                                                      */
/* ------------------------------------------------------------------ */

type GardenContextValue = {
  /** Currently authenticated user ID, null if loading or not logged in */
  userId: string | null;
  /** User profile row */
  profile: ProfileRow | null;
  /** Active garden ID for current user */
  activeGardenId: string | null;
  /** All garden memberships for current user */
  memberships: GardenMembership[];
  /** Whether initial load is in progress */
  loading: boolean;
  /** Switch active garden */
  switchGarden: (gardenId: string) => Promise<void>;
  /** Force reload garden data */
  reload: () => void;
};

const GardenCtx = createContext<GardenContextValue>({
  userId: null,
  profile: null,
  activeGardenId: null,
  memberships: [],
  loading: true,
  switchGarden: async () => {},
  reload: () => {},
});

/* ------------------------------------------------------------------ */
/*  Consumer hook                                                      */
/* ------------------------------------------------------------------ */

export function useGardenContext() {
  return useContext(GardenCtx);
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

type GardenProviderProps = {
  children: ReactNode;
  /** Called when session resolution fails or user is not authenticated */
  onRequireLogin?: () => void;
};

export function GardenProvider({ children, onRequireLogin }: GardenProviderProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [activeGardenId, setActiveGardenId] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<GardenMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  /* ---- bootstrap ---- */

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);

        const user = await getSessionUser();
        if (!user) {
          if (!cancelled) {
            setLoading(false);
            onRequireLogin?.();
          }
          return;
        }

        const profileRow = await getMyProfile(user.id);
        const gardenId = await resolveActiveGardenIdForUser({
          userId: user.id,
          forceRefresh: true,
        }).catch(() => null);

        const membershipList = await listGardenMembershipsForUser(user.id).catch(
          () => [] as GardenMembership[],
        );

        if (cancelled) return;

        setUserId(user.id);
        setProfile(profileRow);
        setActiveGardenId(gardenId);
        setMemberships(membershipList);
        setLoading(false);
      } catch {
        if (cancelled) return;
        setLoading(false);
        onRequireLogin?.();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tick, onRequireLogin]);

  /* ---- switch garden ---- */

  const switchGarden = useCallback(
    async (gardenId: string) => {
      if (!userId) return;
      const ok = await setActiveGardenIdForUser({ userId, gardenId });
      if (ok) {
        clearActiveGardenCache(userId);
        setActiveGardenId(gardenId);
      }
    },
    [userId],
  );

  /* ---- reload ---- */

  const reload = useCallback(() => {
    setTick((prev) => prev + 1);
  }, []);

  /* ---- render ---- */

  const value: GardenContextValue = {
    userId,
    profile,
    activeGardenId,
    memberships,
    loading,
    switchGarden,
    reload,
  };

  return <GardenCtx.Provider value={value}>{children}</GardenCtx.Provider>;
}
