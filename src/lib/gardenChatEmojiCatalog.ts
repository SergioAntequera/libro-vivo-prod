"use client";

export type GardenChatEmojiCategoryId =
  | "recent"
  | "smileys"
  | "gestures"
  | "hearts"
  | "nature"
  | "activities"
  | "food"
  | "travel"
  | "objects";

export type GardenChatEmojiEntry = {
  emoji: string;
  label: string;
  keywords: string[];
};

export type GardenChatEmojiCategory = {
  id: Exclude<GardenChatEmojiCategoryId, "recent">;
  label: string;
  icon: string;
  emojis: GardenChatEmojiEntry[];
};

export const GARDEN_CHAT_EMOJI_STORAGE_KEY = "lv.garden-chat.recent-emojis";
export const GARDEN_CHAT_EMOJI_RECENT_LIMIT = 24;

function createEntry(
  emoji: string,
  label: string,
  keywords: string[],
): GardenChatEmojiEntry {
  return { emoji, label, keywords };
}

export const GARDEN_CHAT_EMOJI_CATEGORIES: GardenChatEmojiCategory[] = [
  {
    id: "smileys",
    label: "Caras",
    icon: "😀",
    emojis: [
      createEntry("😀", "Sonrisa", ["feliz", "alegria", "smile"]),
      createEntry("😁", "Sonrisa grande", ["feliz", "risa"]),
      createEntry("😂", "Risa con lagrimas", ["risa", "gracioso", "jaja"]),
      createEntry("🙂", "Sonrisa suave", ["bien", "calma"]),
      createEntry("😊", "Sonrisa timida", ["ternura", "gracias"]),
      createEntry("😍", "Enamorada", ["amor", "ojos"]),
      createEntry("🥰", "Carita con corazones", ["amor", "ternura"]),
      createEntry("😘", "Beso", ["beso", "amor"]),
      createEntry("😌", "Alivio", ["descanso", "paz"]),
      createEntry("🤗", "Abrazo", ["abrazo", "carino"]),
      createEntry("🤭", "Uy", ["sorpresa", "risita"]),
      createEntry("🤔", "Pensando", ["pensar", "duda"]),
      createEntry("🥹", "Emocionada", ["lagrima", "emocion"]),
      createEntry("😭", "Llorando", ["triste", "lagrimas"]),
      createEntry("😴", "Dormida", ["sueno", "cansada"]),
      createEntry("🙃", "Del reves", ["juego", "ironico"]),
      createEntry("😎", "Guay", ["cool", "sol"]),
      createEntry("🤯", "Volada", ["impacto", "mente"]),
      createEntry("🥳", "Fiesta", ["celebracion", "cumple"]),
      createEntry("😇", "Angel", ["paz", "inocente"]),
    ],
  },
  {
    id: "gestures",
    label: "Gestos",
    icon: "👍",
    emojis: [
      createEntry("👍", "Pulgar arriba", ["ok", "bien", "si"]),
      createEntry("👎", "Pulgar abajo", ["no", "mal"]),
      createEntry("👏", "Aplausos", ["bravo", "aplaudir"]),
      createEntry("🙌", "Manos arriba", ["celebrar", "bien"]),
      createEntry("🫶", "Manos corazon", ["amor", "carino"]),
      createEntry("🤝", "Acuerdo", ["trato", "juntas"]),
      createEntry("🙏", "Gracias", ["por favor", "gracias"]),
      createEntry("💪", "Fuerza", ["animo", "poder"]),
      createEntry("✌️", "Victoria", ["peace", "dos"]),
      createEntry("🤟", "Te quiero", ["amor", "mano"]),
      createEntry("👌", "Perfecto", ["ok", "bien"]),
      createEntry("👀", "Mirando", ["ver", "atenta"]),
      createEntry("👉", "Apuntar", ["mira", "alli"]),
      createEntry("👈", "Apuntar izquierda", ["mira", "aqui"]),
      createEntry("🫂", "Abrazo grande", ["abrazo", "cuidar"]),
      createEntry("🤞", "Dedos cruzados", ["suerte", "ojala"]),
      createEntry("✍️", "Escribiendo", ["texto", "nota"]),
      createEntry("🫰", "Corazon dedos", ["amor", "mini"]),
    ],
  },
  {
    id: "hearts",
    label: "Corazones",
    icon: "💚",
    emojis: [
      createEntry("❤️", "Corazon rojo", ["amor", "corazon"]),
      createEntry("🧡", "Corazon naranja", ["carino", "corazon"]),
      createEntry("💛", "Corazon amarillo", ["luz", "corazon"]),
      createEntry("💚", "Corazon verde", ["jardin", "corazon"]),
      createEntry("🩵", "Corazon celeste", ["calma", "corazon"]),
      createEntry("💙", "Corazon azul", ["sereno", "corazon"]),
      createEntry("💜", "Corazon violeta", ["corazon", "sueno"]),
      createEntry("🩷", "Corazon rosa", ["dulce", "corazon"]),
      createEntry("🤍", "Corazon blanco", ["paz", "corazon"]),
      createEntry("🖤", "Corazon negro", ["intenso", "corazon"]),
      createEntry("🤎", "Corazon marron", ["tierra", "corazon"]),
      createEntry("❤️‍🔥", "Corazon en fuego", ["pasion", "amor"]),
      createEntry("❤️‍🩹", "Corazon curando", ["cuidar", "sanar"]),
      createEntry("💞", "Corazones girando", ["amor", "juntas"]),
      createEntry("💕", "Dos corazones", ["pareja", "amor"]),
      createEntry("💓", "Corazon latiendo", ["latido", "amor"]),
      createEntry("💗", "Corazon creciendo", ["amor", "ilusion"]),
      createEntry("💘", "Corazon flecha", ["enamorada", "cupido"]),
    ],
  },
  {
    id: "nature",
    label: "Naturaleza",
    icon: "🌿",
    emojis: [
      createEntry("🌷", "Tulipan", ["flor", "primavera"]),
      createEntry("🌹", "Rosa", ["flor", "amor"]),
      createEntry("🌻", "Girasol", ["flor", "sol"]),
      createEntry("🌸", "Flor de cerezo", ["flor", "suave"]),
      createEntry("🪻", "Lavanda", ["flor", "calma"]),
      createEntry("🌺", "Hibisco", ["flor", "color"]),
      createEntry("🌿", "Hoja", ["jardin", "verde"]),
      createEntry("🍀", "Trebol", ["suerte", "verde"]),
      createEntry("🪴", "Planta", ["casa", "cuidar"]),
      createEntry("🌱", "Brote", ["crecer", "nuevo"]),
      createEntry("🌳", "Arbol", ["naturaleza", "raiz"]),
      createEntry("🌙", "Luna", ["noche", "calma"]),
      createEntry("☀️", "Sol", ["dia", "luz"]),
      createEntry("⭐", "Estrella", ["brillo", "noche"]),
      createEntry("✨", "Brillos", ["magia", "destello"]),
      createEntry("🔥", "Fuego", ["energia", "calor"]),
      createEntry("🌈", "Arcoiris", ["color", "esperanza"]),
      createEntry("🌊", "Ola", ["mar", "agua"]),
    ],
  },
  {
    id: "activities",
    label: "Vida",
    icon: "🎉",
    emojis: [
      createEntry("🎉", "Celebracion", ["fiesta", "feliz"]),
      createEntry("🎊", "Confeti", ["celebrar", "fiesta"]),
      createEntry("🎈", "Globo", ["cumple", "fiesta"]),
      createEntry("🎁", "Regalo", ["detalle", "sorpresa"]),
      createEntry("🕯️", "Vela", ["ritual", "luz"]),
      createEntry("📖", "Libro", ["leer", "historia"]),
      createEntry("🧘", "Meditacion", ["calma", "respirar"]),
      createEntry("🎵", "Musica", ["cancion", "sonido"]),
      createEntry("🎶", "Notas musicales", ["musica", "ritmo"]),
      createEntry("🧩", "Puzzle", ["juego", "pieza"]),
      createEntry("🎨", "Pintura", ["arte", "lienzo"]),
      createEntry("🪡", "Costura", ["detalle", "tejer"]),
      createEntry("💃", "Bailar", ["danza", "fiesta"]),
      createEntry("🕺", "Baile", ["danza", "fiesta"]),
      createEntry("🎬", "Escena", ["video", "cine"]),
      createEntry("📸", "Foto", ["imagen", "recuerdo"]),
      createEntry("🎯", "Objetivo", ["meta", "plan"]),
      createEntry("🗓️", "Calendario", ["plan", "fecha"]),
    ],
  },
  {
    id: "food",
    label: "Comida",
    icon: "🍓",
    emojis: [
      createEntry("☕", "Cafe", ["cafe", "desayuno"]),
      createEntry("🍵", "Te", ["te", "calma"]),
      createEntry("🍓", "Fresa", ["fruta", "dulce"]),
      createEntry("🍒", "Cerezas", ["fruta", "dulce"]),
      createEntry("🍫", "Chocolate", ["dulce", "antojo"]),
      createEntry("🍪", "Galleta", ["dulce", "merienda"]),
      createEntry("🧁", "Cupcake", ["postre", "dulce"]),
      createEntry("🍰", "Tarta", ["postre", "cumple"]),
      createEntry("🍕", "Pizza", ["cena", "comida"]),
      createEntry("🥐", "Croissant", ["desayuno", "pan"]),
      createEntry("🥞", "Tortitas", ["desayuno", "dulce"]),
      createEntry("🍝", "Pasta", ["cena", "italiana"]),
      createEntry("🍣", "Sushi", ["cena", "comida"]),
      createEntry("🍷", "Vino", ["copa", "brindis"]),
      createEntry("🥂", "Brindis", ["celebrar", "copas"]),
      createEntry("🍦", "Helado", ["postre", "verano"]),
    ],
  },
  {
    id: "travel",
    label: "Lugares",
    icon: "🌍",
    emojis: [
      createEntry("🏡", "Casa", ["hogar", "casa"]),
      createEntry("🏠", "Casa sencilla", ["hogar", "casa"]),
      createEntry("🌍", "Mundo", ["viaje", "planeta"]),
      createEntry("🗺️", "Mapa", ["viaje", "ruta"]),
      createEntry("✈️", "Avion", ["viaje", "escapada"]),
      createEntry("🚗", "Coche", ["carretera", "ruta"]),
      createEntry("🚲", "Bici", ["paseo", "ruta"]),
      createEntry("🏖️", "Playa", ["mar", "verano"]),
      createEntry("⛰️", "Montana", ["naturaleza", "subida"]),
      createEntry("🏕️", "Acampada", ["noche", "naturaleza"]),
      createEntry("🌆", "Ciudad", ["urbano", "atardecer"]),
      createEntry("🌃", "Noche urbana", ["ciudad", "noche"]),
      createEntry("🎡", "Noria", ["plan", "feria"]),
      createEntry("🚪", "Puerta", ["llegar", "salir"]),
      createEntry("🛋️", "Sofa", ["descanso", "casa"]),
      createEntry("🛏️", "Cama", ["descanso", "noche"]),
    ],
  },
  {
    id: "objects",
    label: "Objetos",
    icon: "💌",
    emojis: [
      createEntry("💌", "Carta", ["mensaje", "amor"]),
      createEntry("💬", "Dialogo", ["chat", "hablar"]),
      createEntry("📎", "Clip", ["adjunto", "archivo"]),
      createEntry("📍", "Ubicacion", ["sitio", "mapa"]),
      createEntry("🔒", "Candado", ["privado", "seguro"]),
      createEntry("🔑", "Llave", ["acceso", "abrir"]),
      createEntry("🕰️", "Reloj clasico", ["tiempo", "capsula"]),
      createEntry("⏳", "Reloj arena", ["espera", "tiempo"]),
      createEntry("📷", "Camara", ["foto", "imagen"]),
      createEntry("🎙️", "Microfono", ["audio", "voz"]),
      createEntry("🎧", "Auriculares", ["audio", "musica"]),
      createEntry("📱", "Movil", ["llamar", "mensaje"]),
      createEntry("💡", "Idea", ["pensar", "luz"]),
      createEntry("🧸", "Peluche", ["tierno", "cuidado"]),
      createEntry("🪞", "Espejo", ["mirar", "reflejo"]),
      createEntry("🛎️", "Campana", ["aviso", "notificacion"]),
    ],
  },
];

const GARDEN_CHAT_EMOJI_ENTRY_MAP = new Map<string, GardenChatEmojiEntry>();

for (const category of GARDEN_CHAT_EMOJI_CATEGORIES) {
  for (const entry of category.emojis) {
    GARDEN_CHAT_EMOJI_ENTRY_MAP.set(entry.emoji, entry);
  }
}

export function normalizeRecentGardenChatEmojis(value: unknown) {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const items: string[] = [];
  for (const entry of value) {
    const emoji = typeof entry === "string" ? entry.trim() : "";
    if (!emoji || seen.has(emoji) || !GARDEN_CHAT_EMOJI_ENTRY_MAP.has(emoji)) continue;
    seen.add(emoji);
    items.push(emoji);
    if (items.length >= GARDEN_CHAT_EMOJI_RECENT_LIMIT) break;
  }
  return items;
}

export function resolveGardenChatEmojiEntry(emoji: string) {
  return GARDEN_CHAT_EMOJI_ENTRY_MAP.get(emoji) ?? null;
}

export function searchGardenChatEmojiEntries(query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const out: GardenChatEmojiEntry[] = [];
  for (const category of GARDEN_CHAT_EMOJI_CATEGORIES) {
    for (const entry of category.emojis) {
      const haystack = `${entry.label} ${entry.keywords.join(" ")}`.toLowerCase();
      if (haystack.includes(needle)) out.push(entry);
    }
  }
  return out;
}
