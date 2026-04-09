import { redirect } from "next/navigation";
import { getPublicReleaseGateState } from "@/lib/releaseGate";
import { ReleaseCeremonyClient } from "./release-ceremony-client";

export const dynamic = "force-dynamic";

export default async function ReleasePage() {
  const gate = await getPublicReleaseGateState();

  if (gate.unlocked) {
    redirect("/login?released=1");
  }

  return <ReleaseCeremonyClient />;
}
