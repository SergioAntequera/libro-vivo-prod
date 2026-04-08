import { redirect } from "next/navigation";
import { getProductSurfaceHref } from "@/lib/productSurfaces";

export default function Page() {
  redirect(getProductSurfaceHref("login"));
}
