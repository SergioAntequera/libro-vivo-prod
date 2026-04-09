import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getPublicReleaseGateState } from "@/lib/releaseGate";

export const dynamic = "force-dynamic";

export default async function LoginLayout({ children }: { children: ReactNode }) {
  const gate = await getPublicReleaseGateState();

  if (!gate.unlocked) {
    redirect("/release");
  }

  return children;
}
