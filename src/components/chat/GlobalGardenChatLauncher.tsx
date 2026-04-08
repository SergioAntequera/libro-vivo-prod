"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { GardenChatSurface } from "./GardenChatSurface";

function shouldHideChatLauncher(pathname: string, immersiveMode: string | null) {
  if (!pathname) return false;
  if (pathname === "/login") return true;
  if (pathname === "/chat") return true;
  if (pathname.startsWith("/admin")) return true;
  if (pathname === "/home" && immersiveMode) return true;
  return false;
}

export function GlobalGardenChatLauncher() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const immersiveMode = searchParams?.get("immersive") ?? null;
  const hidden = useMemo(
    () => shouldHideChatLauncher(pathname ?? "", immersiveMode),
    [immersiveMode, pathname],
  );

  if (hidden) return null;
  return <GardenChatSurface mode="launcher" />;
}
