"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { writeAuthAccessTokenCookie } from "@/lib/authSessionCookie";

export default function AuthSessionBridge() {
  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      writeAuthAccessTokenCookie(data.session?.access_token ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      writeAuthAccessTokenCookie(session?.access_token ?? null);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return null;
}
