import { redirect } from "next/navigation";

export default function CalendarPage() {
  redirect("/plans?focus=all");
}
