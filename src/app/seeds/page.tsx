import { redirect } from "next/navigation";

export default function SeedsPage() {
  redirect("/plans?focus=ideas");
}
