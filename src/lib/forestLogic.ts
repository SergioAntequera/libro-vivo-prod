export type Season = "spring" | "summer" | "autumn" | "winter";

export function seasonFromDate(dateStr: string): Season {
  // dateStr: YYYY-MM-DD
  const month = new Date(dateStr + "T00:00:00").getMonth() + 1; // 1..12
  if ([3, 4, 5].includes(month)) return "spring";
  if ([6, 7, 8].includes(month)) return "summer";
  if ([9, 10, 11].includes(month)) return "autumn";
  return "winter";
}

export function seasonLabel(s: Season) {
  if (s === "spring") return "Primavera 🌷";
  if (s === "summer") return "Verano ☀️";
  if (s === "autumn") return "Otoño 🍂";
  return "Invierno ❄️";
}

export function elementFlower(element: string) {
  // Luego esto será una ilustración PNG/SVG según elemento
  switch (element) {
    case "fire":
      return "🌺"; // fuego
    case "water":
      return "🪷"; // agua
    case "air":
      return "🌼"; // aire
    case "earth":
      return "🌻"; // tierra
    case "aether":
      return "✨"; // éter
    default:
      return "🌸";
  }
}

export function moodIcon(mood: string) {
  if (mood === "wilted") return "🥀";
  if (mood === "shiny") return "✨";
  return "🌷";
}
