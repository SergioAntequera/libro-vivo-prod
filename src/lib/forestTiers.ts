export type Tier = "bronze" | "silver" | "gold" | "diamond";

export function tierLabel(t: Tier) {
  if (t === "bronze") return "Bronce";
  if (t === "silver") return "Plata";
  if (t === "gold") return "Oro";
  return "Diamante";
}

export function tierEmoji(t: Tier) {
  if (t === "bronze") return "[B]";
  if (t === "silver") return "[P]";
  if (t === "gold") return "[O]";
  return "[D]";
}
