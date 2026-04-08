import { redirect } from "next/navigation";
import { getHomePathSummaryHref } from "@/lib/productSurfaces";

export default function TimelinePage() {
  redirect(getHomePathSummaryHref());
}
