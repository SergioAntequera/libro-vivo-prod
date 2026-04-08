import { supabase } from "@/lib/supabase";

export type CatalogItemConfig = {
  code: string;
  label: string;
  sortOrder: number;
  enabled: boolean;
  color: string | null;
  icon: string | null;
  metadata: Record<string, unknown>;
};

type CatalogFallbackMap = Record<string, CatalogItemConfig[]>;

const FALLBACK_CATALOGS: CatalogFallbackMap = {
  elements: [
    {
      code: "fire",
      label: "Fuego",
      sortOrder: 10,
      enabled: true,
      color: "#ffd8d0",
      icon: "fire",
      metadata: { emoji: "\uD83D\uDD25" },
    },
    {
      code: "water",
      label: "Agua",
      sortOrder: 20,
      enabled: true,
      color: "#d8ecff",
      icon: "water",
      metadata: { emoji: "\uD83D\uDCA7" },
    },
    {
      code: "air",
      label: "Aire",
      sortOrder: 30,
      enabled: true,
      color: "#e7f5ff",
      icon: "air",
      metadata: { emoji: "\uD83C\uDF2C" },
    },
    {
      code: "earth",
      label: "Tierra",
      sortOrder: 40,
      enabled: true,
      color: "#f6e7d1",
      icon: "earth",
      metadata: { emoji: "\uD83C\uDF31" },
    },
    {
      code: "aether",
      label: "Eter",
      sortOrder: 50,
      enabled: true,
      color: "#efe4ff",
      icon: "aether",
      metadata: { emoji: "\uD83C\uDF0C" },
    },
  ],
  moods: [
    {
      code: "wilted",
      label: "Mustia",
      sortOrder: 10,
      enabled: true,
      color: "#ffe8e8",
      icon: "wilted",
      metadata: { emoji: "\uD83E\uDD40" },
    },
    {
      code: "healthy",
      label: "Sana",
      sortOrder: 20,
      enabled: true,
      color: "#f0fff4",
      icon: "healthy",
      metadata: { emoji: "\uD83C\uDF37" },
    },
    {
      code: "shiny",
      label: "Brillante",
      sortOrder: 30,
      enabled: true,
      color: "#fff7e6",
      icon: "shiny",
      metadata: { emoji: "\u2728" },
    },
  ],
  mood_thresholds: [
    {
      code: "wilted",
      label: "Mustia",
      sortOrder: 10,
      enabled: true,
      color: "#ffe8e8",
      icon: "wilted",
      metadata: { min_score: 0, max_score: 34, anchor_score: 20 },
    },
    {
      code: "healthy",
      label: "Sana",
      sortOrder: 20,
      enabled: true,
      color: "#f0fff4",
      icon: "healthy",
      metadata: { min_score: 35, max_score: 74, anchor_score: 55 },
    },
    {
      code: "shiny",
      label: "Brillante",
      sortOrder: 30,
      enabled: true,
      color: "#fff7e6",
      icon: "shiny",
      metadata: { min_score: 75, max_score: 100, anchor_score: 85 },
    },
  ],
  care_actions: [
    {
      code: "water",
      label: "Regar",
      sortOrder: 10,
      enabled: true,
      color: "#eaf7ff",
      icon: "water",
      metadata: {
        emoji: "\uD83D\uDCA7",
        target_need: "water",
        effects: { water: 24, air: 4 },
        decay_all: 3,
        score_bonus: 6,
      },
    },
    {
      code: "fertilize",
      label: "Abonar",
      sortOrder: 20,
      enabled: true,
      color: "#f0fff4",
      icon: "fertilize",
      metadata: {
        emoji: "\uD83C\uDF3F",
        target_need: "soil",
        effects: { soil: 24, water: 4 },
        decay_all: 3,
        score_bonus: 6,
      },
    },
    {
      code: "light",
      label: "Dar luz",
      sortOrder: 30,
      enabled: true,
      color: "#fff7e6",
      icon: "light",
      metadata: {
        emoji: "\u2600\uFE0F",
        target_need: "light",
        effects: { light: 22, air: 6 },
        decay_all: 3,
        score_bonus: 6,
      },
    },
  ],
  care_needs: [
    {
      code: "water",
      label: "Agua",
      sortOrder: 10,
      enabled: true,
      color: "#eaf7ff",
      icon: "water",
      metadata: {
        hint: "Falta cercania y presencia.",
        emoji: "\uD83D\uDCA7",
      },
    },
    {
      code: "light",
      label: "Luz",
      sortOrder: 20,
      enabled: true,
      color: "#fff7e6",
      icon: "light",
      metadata: {
        hint: "Falta claridad y momentos bonitos.",
        emoji: "\u2600\uFE0F",
      },
    },
    {
      code: "soil",
      label: "Tierra",
      sortOrder: 30,
      enabled: true,
      color: "#f0fff4",
      icon: "soil",
      metadata: {
        hint: "Falta base: rutina y acuerdos pequenos.",
        emoji: "\uD83C\uDF3F",
      },
    },
    {
      code: "air",
      label: "Aire",
      sortOrder: 40,
      enabled: true,
      color: "#eef7ff",
      icon: "air",
      metadata: {
        hint: "Falta espacio para respirar y escucharse.",
        emoji: "\uD83C\uDF2C",
      },
    },
  ],
  care_texts: [
    {
      code: "title",
      label: "Cuidar la flor",
      sortOrder: 10,
      enabled: true,
      color: null,
      icon: null,
      metadata: {},
    },
    {
      code: "subtitle",
      label: "Rituales pequenos que suben la salud de la relación.",
      sortOrder: 20,
      enabled: true,
      color: null,
      icon: null,
      metadata: {},
    },
    {
      code: "pulse_title",
      label: "Pulso de hoy",
      sortOrder: 30,
      enabled: true,
      color: null,
      icon: null,
      metadata: {},
    },
    {
      code: "weakest_need_template",
      label: "Lo más flojo ahora es {needLabel} ({needValue}%). {needHint}",
      sortOrder: 40,
      enabled: true,
      color: null,
      icon: null,
      metadata: {},
    },
    {
      code: "streak_template",
      label: "Racha actual: {days} {dayWord}",
      sortOrder: 50,
      enabled: true,
      color: null,
      icon: null,
      metadata: {},
    },
    {
      code: "suggestion_prefix",
      label: "Sugerencia:",
      sortOrder: 60,
      enabled: true,
      color: null,
      icon: null,
      metadata: {},
    },
    {
      code: "history_title",
      label: "Historial de cuidado",
      sortOrder: 70,
      enabled: true,
      color: null,
      icon: null,
      metadata: {},
    },
    {
      code: "history_empty",
      label: "Aún no hay rituales aquí. Cuando uno cuide, quedará registrado.",
      sortOrder: 80,
      enabled: true,
      color: null,
      icon: null,
      metadata: {},
    },
    {
      code: "care_bar_title",
      label: "Barra de cuidado",
      sortOrder: 90,
      enabled: true,
      color: null,
      icon: null,
      metadata: {},
    },
    {
      code: "avg_needs_template",
      label: "Media necesidades: {avg}%",
      sortOrder: 100,
      enabled: true,
      color: null,
      icon: null,
      metadata: {},
    },
  ],
  seed_statuses: [
    {
      code: "planning_draft",
      label: "Preparando",
      sortOrder: 5,
      enabled: true,
      color: null,
      icon: "planning_draft",
      metadata: {},
    },
    {
      code: "seed",
      label: "Sin programar",
      sortOrder: 10,
      enabled: true,
      color: null,
      icon: "seed",
      metadata: {},
    },
    {
      code: "scheduled",
      label: "Programada",
      sortOrder: 20,
      enabled: true,
      color: null,
      icon: "scheduled",
      metadata: {},
    },
    {
      code: "bloomed",
      label: "Florecida",
      sortOrder: 30,
      enabled: true,
      color: null,
      icon: "bloomed",
      metadata: {},
    },
  ],
  seasons: [
    {
      code: "spring",
      label: "Primavera",
      sortOrder: 10,
      enabled: true,
      color: "#f6fff7",
      icon: "spring",
      metadata: { emoji: "\uD83C\uDF38" },
    },
    {
      code: "summer",
      label: "Verano",
      sortOrder: 20,
      enabled: true,
      color: "#fffbe8",
      icon: "summer",
      metadata: { emoji: "\u2600\uFE0F" },
    },
    {
      code: "autumn",
      label: "Otoño",
      sortOrder: 30,
      enabled: true,
      color: "#fff3ea",
      icon: "autumn",
      metadata: { emoji: "\uD83C\uDF42" },
    },
    {
      code: "winter",
      label: "Invierno",
      sortOrder: 40,
      enabled: true,
      color: "#eef7ff",
      icon: "winter",
      metadata: { emoji: "\u2744\uFE0F" },
    },
  ],
  tiers: [
    {
      code: "bronze",
      label: "Bronce",
      sortOrder: 10,
      enabled: true,
      color: "#f8dfcc",
      icon: "bronze",
      metadata: {},
    },
    {
      code: "silver",
      label: "Plata",
      sortOrder: 20,
      enabled: true,
      color: "#deecfb",
      icon: "silver",
      metadata: {},
    },
    {
      code: "gold",
      label: "Oro",
      sortOrder: 30,
      enabled: true,
      color: "#fff1c5",
      icon: "gold",
      metadata: {},
    },
    {
      code: "diamond",
      label: "Diamante",
      sortOrder: 40,
      enabled: true,
      color: "#eadfff",
      icon: "diamond",
      metadata: {},
    },
  ],
  achievement_kinds: [
    {
      code: "pages_completed",
      label: "Páginas completadas",
      sortOrder: 10,
      enabled: true,
      color: null,
      icon: "pages_completed",
      metadata: {},
    },
    {
      code: "seeds_bloomed",
      label: "Semillas florecidas",
      sortOrder: 20,
      enabled: true,
      color: null,
      icon: "seeds_bloomed",
      metadata: {},
    },
  ],
  reward_kinds: [
    {
      code: "gift",
      label: "Regalo",
      sortOrder: 10,
      enabled: true,
      color: null,
      icon: "gift",
      metadata: {},
    },
    {
      code: "message",
      label: "Mensaje",
      sortOrder: 20,
      enabled: true,
      color: null,
      icon: "message",
      metadata: {},
    },
    {
      code: "sticker_pack",
      label: "Pack de stickers",
      sortOrder: 30,
      enabled: true,
      color: null,
      icon: "sticker_pack",
      metadata: {},
    },
  ],
  map_place_kinds: [
    {
      code: "spot",
      label: "Sitio",
      sortOrder: 10,
      enabled: true,
      color: "#1f2937",
      icon: "\u{1F4CD}",
      metadata: {
        description: "Lugar general guardado dentro del mapa compartido.",
        glyph: "\u{1F4CD}",
      },
    },
    {
      code: "restaurant",
      label: "Restaurante",
      sortOrder: 20,
      enabled: true,
      color: "#2563eb",
      icon: "\u{1F37D}",
      metadata: {
        description: "Comida, cena o restaurante para repetir.",
        glyph: "\u{1F37D}",
      },
    },
    {
      code: "cafe",
      label: "Cafe",
      sortOrder: 30,
      enabled: true,
      color: "#7c3f00",
      icon: "\u2615",
      metadata: {
        description: "Cafe, brunch o parada ligera.",
        glyph: "\u2615",
      },
    },
    {
      code: "viewpoint",
      label: "Mirador",
      sortOrder: 40,
      enabled: true,
      color: "#0f766e",
      icon: "\u{1F5FB}",
      metadata: {
        description: "Vistas, paseos altos o lugares contemplativos.",
        glyph: "\u{1F5FB}",
      },
    },
    {
      code: "trip_place",
      label: "Escapada",
      sortOrder: 50,
      enabled: true,
      color: "#7c3aed",
      icon: "\u{1F9F3}",
      metadata: {
        description: "Lugar de viaje, hotel o punto importante de escapada.",
        glyph: "\u{1F9F3}",
      },
    },
    {
      code: "custom",
      label: "Especial",
      sortOrder: 60,
      enabled: true,
      color: "#475569",
      icon: "\u2726",
      metadata: {
        description: "Tipo especial o simbólico del mapa.",
        glyph: "\u2726",
      },
    },
  ],
  map_place_states: [
    {
      code: "saved",
      label: "Guardado",
      sortOrder: 10,
      enabled: true,
      color: "#64748b",
      icon: "\u{1F4CC}",
      metadata: {
        description: "Lugar guardado sin prioridad especial.",
      },
    },
    {
      code: "favorite",
      label: "Favorito",
      sortOrder: 20,
      enabled: true,
      color: "#c27a00",
      icon: "\u2665",
      metadata: {
        description: "Lugar importante para repetir o cuidar.",
      },
    },
    {
      code: "wishlist",
      label: "Por visitar",
      sortOrder: 30,
      enabled: true,
      color: "#2563eb",
      icon: "\u25F7",
      metadata: {
        description: "Lugar pendiente dentro del jardín compartido.",
      },
    },
    {
      code: "visited",
      label: "Visitado",
      sortOrder: 40,
      enabled: true,
      color: "#0f766e",
      icon: "\u2713",
      metadata: {
        description: "Lugar ya vivido y confirmado.",
      },
    },
    {
      code: "archived",
      label: "Archivado",
      sortOrder: 50,
      enabled: true,
      color: "#94a3b8",
      icon: "\u25CB",
      metadata: {
        description: "Lugar oculto o retirado de la lectura principal.",
      },
    },
  ],
  map_lenses: [
    {
      code: "explore",
      label: "Mapa",
      sortOrder: 10,
      enabled: true,
      color: "#d9efe3",
      icon: "\u{1F9ED}",
      metadata: {
        description: "Busca una dirección, revisa lugares guardados o entra en rutas.",
        group: "primary",
      },
    },
    {
      code: "saved",
      label: "Guardados",
      sortOrder: 20,
      enabled: true,
      color: "#eef6ea",
      icon: "\u{1F4CC}",
      metadata: {
        description: "Lugares que queréis repetir, cuidar o tener siempre a mano.",
        group: "primary",
      },
    },
    {
      code: "routes",
      label: "Rutas",
      sortOrder: 30,
      enabled: true,
      color: "#eef6ea",
      icon: "\u{1F97E}",
      metadata: {
        description: "Paseos y recorridos que forman parte de vuestra historia compartida.",
        group: "primary",
      },
    },
    {
      code: "favorites",
      label: "Favoritos",
      sortOrder: 40,
      enabled: true,
      color: "#fff4dc",
      icon: "\u{1F49B}",
      metadata: {
        description: "Guardados que queréis cuidar como sitios especialmente vuestros.",
        group: "secondary",
      },
    },
    {
      code: "restaurants",
      label: "Restaurantes",
      sortOrder: 50,
      enabled: true,
      color: "#eef6ff",
      icon: "\u{1F37D}",
      metadata: {
        description: "Guardados de comida, cafe y cenas que merece la pena repetir.",
        group: "secondary",
      },
    },
    {
      code: "lived",
      label: "Lugares vividos",
      sortOrder: 60,
      enabled: true,
      color: "#eef6ea",
      icon: "\u{1F33C}",
      metadata: {
        description: "Lugares ya vividos dentro de vuestra historia compartida.",
        group: "secondary",
      },
    },
    {
      code: "symbolic",
      label: "Zonas simbolicas",
      sortOrder: 70,
      enabled: true,
      color: "#f4efff",
      icon: "\u2728",
      metadata: {
        description: "Sitios y zonas con una carga emocional o simbólica clara.",
        group: "secondary",
      },
    },
  ],
  home_flower_species: [
    {
      code: "fire",
      label: "Flor de fuego",
      sortOrder: 10,
      enabled: true,
      color: "#ffd8d0",
      icon: "/illustrations/flowers/rose.svg",
      metadata: { element: "fire", asset_path: "/illustrations/flowers/rose.svg" },
    },
    {
      code: "water",
      label: "Flor de agua",
      sortOrder: 20,
      enabled: true,
      color: "#d8ecff",
      icon: "/illustrations/flowers/tulip.svg",
      metadata: { element: "water", asset_path: "/illustrations/flowers/tulip.svg" },
    },
    {
      code: "air",
      label: "Flor de aire",
      sortOrder: 30,
      enabled: true,
      color: "#e7f5ff",
      icon: "/illustrations/flowers/daisy.svg",
      metadata: { element: "air", asset_path: "/illustrations/flowers/daisy.svg" },
    },
    {
      code: "earth",
      label: "Flor de tierra",
      sortOrder: 40,
      enabled: true,
      color: "#f6e7d1",
      icon: "/illustrations/flowers/sunflower.svg",
      metadata: { element: "earth", asset_path: "/illustrations/flowers/sunflower.svg" },
    },
    {
      code: "aether",
      label: "Flor de eter",
      sortOrder: 50,
      enabled: true,
      color: "#efe4ff",
      icon: "/illustrations/flowers/rose.svg",
      metadata: { element: "aether", asset_path: "/illustrations/flowers/rose.svg" },
    },
    {
      code: "default",
      label: "Flor por defecto",
      sortOrder: 90,
      enabled: true,
      color: "#f4f4f4",
      icon: "/illustrations/flowers/daisy.svg",
      metadata: { element: "default", asset_path: "/illustrations/flowers/daisy.svg" },
    },
  ],
  home_tree_species: [
    {
      code: "bronze",
      label: "Árbol bronze",
      sortOrder: 10,
      enabled: true,
      color: "#f8dfcc",
      icon: "/stickers/sticker_tree_bronze.svg",
      metadata: { tier: "bronze", asset_path: "/stickers/sticker_tree_bronze.svg" },
    },
    {
      code: "silver",
      label: "Árbol silver",
      sortOrder: 20,
      enabled: true,
      color: "#deecfb",
      icon: "/stickers/sticker_tree_silver.svg",
      metadata: { tier: "silver", asset_path: "/stickers/sticker_tree_silver.svg" },
    },
    {
      code: "gold",
      label: "Árbol gold",
      sortOrder: 30,
      enabled: true,
      color: "#fff1c5",
      icon: "/stickers/sticker_tree_gold.svg",
      metadata: { tier: "gold", asset_path: "/stickers/sticker_tree_gold.svg" },
    },
    {
      code: "diamond",
      label: "Árbol diamond",
      sortOrder: 40,
      enabled: true,
      color: "#eadfff",
      icon: "/stickers/sticker_tree_diamond.svg",
      metadata: { tier: "diamond", asset_path: "/stickers/sticker_tree_diamond.svg" },
    },
    {
      code: "default",
      label: "Árbol por defecto",
      sortOrder: 90,
      enabled: true,
      color: "#f4f4f4",
      icon: "/stickers/sticker_tree_bronze.svg",
      metadata: { tier: "default", asset_path: "/stickers/sticker_tree_bronze.svg" },
    },
  ],
  home_scene_theme: [
    {
      code: "landscape_asset",
      label: "Fondo sendero (asset)",
      sortOrder: 5,
      enabled: true,
      color: null,
      icon: "/illustrations/packs/sunny-kids/landscape.svg",
      metadata: { value: "/illustrations/packs/sunny-kids/landscape.svg" },
    },
    {
      code: "sky_top",
      label: "Cielo arriba",
      sortOrder: 10,
      enabled: true,
      color: "#d8f2ff",
      icon: null,
      metadata: { value: "#d8f2ff" },
    },
    {
      code: "sky_mid",
      label: "Cielo medio",
      sortOrder: 20,
      enabled: true,
      color: "#d6f5c7",
      icon: null,
      metadata: { value: "#d6f5c7" },
    },
    {
      code: "sky_bottom",
      label: "Cielo base",
      sortOrder: 30,
      enabled: true,
      color: "#bfe59a",
      icon: null,
      metadata: { value: "#bfe59a" },
    },
    {
      code: "hill_left",
      label: "Colina izquierda",
      sortOrder: 40,
      enabled: true,
      color: "#86c95e",
      icon: null,
      metadata: { value: "#86c95e" },
    },
    {
      code: "hill_right",
      label: "Colina derecha",
      sortOrder: 50,
      enabled: true,
      color: "#70b64f",
      icon: null,
      metadata: { value: "#70b64f" },
    },
    {
      code: "meadow",
      label: "Pradera principal",
      sortOrder: 60,
      enabled: true,
      color: "#5ca23f",
      icon: null,
      metadata: { value: "#5ca23f" },
    },
    {
      code: "meadow_shadow",
      label: "Pradera sombra",
      sortOrder: 70,
      enabled: true,
      color: "#6ab04c",
      icon: null,
      metadata: { value: "#6ab04c" },
    },
    {
      code: "path_outer",
      label: "Camino borde",
      sortOrder: 80,
      enabled: true,
      color: "#e1c28a",
      icon: null,
      metadata: { value: "#e1c28a" },
    },
    {
      code: "path_inner",
      label: "Camino interior",
      sortOrder: 90,
      enabled: true,
      color: "#f7e6bc",
      icon: null,
      metadata: { value: "#f7e6bc" },
    },
    {
      code: "cloud_left_asset",
      label: "Nube izquierda",
      sortOrder: 100,
      enabled: true,
      color: null,
      icon: "/stickers/sticker_cloud.svg",
      metadata: { value: "/stickers/sticker_cloud.svg" },
    },
    {
      code: "cloud_right_asset",
      label: "Nube derecha",
      sortOrder: 110,
      enabled: true,
      color: null,
      icon: "/stickers/sticker_cloud.svg",
      metadata: { value: "/stickers/sticker_cloud.svg" },
    },
    {
      code: "deco_flower_left_asset",
      label: "Flor decorativa izquierda",
      sortOrder: 120,
      enabled: true,
      color: null,
      icon: "/illustrations/flowers/daisy.svg",
      metadata: { value: "/illustrations/flowers/daisy.svg" },
    },
    {
      code: "deco_flower_center_asset",
      label: "Flor decorativa centro",
      sortOrder: 130,
      enabled: true,
      color: null,
      icon: "/illustrations/flowers/rose.svg",
      metadata: { value: "/illustrations/flowers/rose.svg" },
    },
    {
      code: "deco_flower_right_asset",
      label: "Flor decorativa derecha",
      sortOrder: 140,
      enabled: true,
      color: null,
      icon: "/illustrations/flowers/tulip.svg",
      metadata: { value: "/illustrations/flowers/tulip.svg" },
    },
    {
      code: "seed_asset",
      label: "Semilla sendero",
      sortOrder: 145,
      enabled: true,
      color: null,
      icon: "/stickers/sticker_seed.svg",
      metadata: { value: "/stickers/sticker_seed.svg" },
    },
    {
      code: "event_seed_bg",
      label: "Fondo chip semilla",
      sortOrder: 150,
      enabled: true,
      color: "#fff6de",
      icon: null,
      metadata: { value: "#fff6de" },
    },
    {
      code: "event_flower_bg",
      label: "Fondo chip flor",
      sortOrder: 160,
      enabled: true,
      color: "#fff7fb",
      icon: null,
      metadata: { value: "#fff7fb" },
    },
    {
      code: "event_tree_bg",
      label: "Fondo chip árbol",
      sortOrder: 170,
      enabled: true,
      color: "#f3f9ff",
      icon: null,
      metadata: { value: "#f3f9ff" },
    },
  ],
  home_art_packs: [
    {
      code: "sunny_kids",
      label: "Sunny Kids",
      sortOrder: 10,
      enabled: true,
      color: "#d8f2ff",
      icon: "/illustrations/packs/sunny-kids/preview.svg",
      metadata: {
        description: "Pack infantil clasico con tonos pradera y flores suaves.",
        preview_asset: "/illustrations/packs/sunny-kids/preview.svg",
        scene: {
          landscape_asset: "/illustrations/packs/sunny-kids/landscape.svg",
          sky_top: "#d8f2ff",
          sky_mid: "#d6f5c7",
          sky_bottom: "#bfe59a",
          hill_left: "#86c95e",
          hill_right: "#70b64f",
          meadow: "#5ca23f",
          meadow_shadow: "#6ab04c",
          path_outer: "#e1c28a",
          path_inner: "#f7e6bc",
          cloud_left_asset: "/illustrations/packs/sunny-kids/cloud.svg",
          cloud_right_asset: "/illustrations/packs/sunny-kids/cloud.svg",
          deco_flower_left_asset: "/illustrations/packs/sunny-kids/flower_daisy.svg",
          deco_flower_center_asset: "/illustrations/packs/sunny-kids/flower_rose.svg",
          deco_flower_right_asset: "/illustrations/packs/sunny-kids/flower_tulip.svg",
          event_seed_bg: "#fff6de",
          event_flower_bg: "#fff7fb",
          event_tree_bg: "#f3f9ff",
          seed_asset: "/illustrations/packs/sunny-kids/seed.svg",
        },
        flowers: {
          fire: "/illustrations/packs/sunny-kids/flower_rose.svg",
          water: "/illustrations/packs/sunny-kids/flower_tulip.svg",
          air: "/illustrations/packs/sunny-kids/flower_daisy.svg",
          earth: "/illustrations/packs/sunny-kids/flower_sunflower.svg",
          aether: "/illustrations/packs/sunny-kids/flower_rose.svg",
          default: "/illustrations/packs/sunny-kids/flower_daisy.svg",
        },
        trees: {
          bronze: "/illustrations/packs/sunny-kids/tree_bronze.svg",
          silver: "/illustrations/packs/sunny-kids/tree_silver.svg",
          gold: "/illustrations/packs/sunny-kids/tree_gold.svg",
          diamond: "/illustrations/packs/sunny-kids/tree_diamond.svg",
          default: "/illustrations/packs/sunny-kids/tree_bronze.svg",
        },
      },
    },
    {
      code: "candy_garden",
      label: "Candy Garden",
      sortOrder: 20,
      enabled: true,
      color: "#ffe7fb",
      icon: "/illustrations/packs/candy-garden/preview.svg",
      metadata: {
        description: "Pack pastel con tonos dulces y acentos rosados.",
        preview_asset: "/illustrations/packs/candy-garden/preview.svg",
        scene: {
          landscape_asset: "/illustrations/packs/candy-garden/landscape.svg",
          sky_top: "#ffe7fb",
          sky_mid: "#e5f3ff",
          sky_bottom: "#c9f5d5",
          hill_left: "#9bd889",
          hill_right: "#86ca79",
          meadow: "#63ad4e",
          meadow_shadow: "#76bb62",
          path_outer: "#dcb486",
          path_inner: "#f3dfc2",
          cloud_left_asset: "/illustrations/packs/candy-garden/cloud.svg",
          cloud_right_asset: "/illustrations/packs/candy-garden/cloud.svg",
          deco_flower_left_asset: "/illustrations/packs/candy-garden/flower_daisy.svg",
          deco_flower_center_asset: "/illustrations/packs/candy-garden/flower_rose.svg",
          deco_flower_right_asset: "/illustrations/packs/candy-garden/flower_tulip.svg",
          event_seed_bg: "#fff1dc",
          event_flower_bg: "#fff0fa",
          event_tree_bg: "#eef6ff",
          seed_asset: "/illustrations/packs/candy-garden/seed.svg",
        },
        flowers: {
          fire: "/illustrations/packs/candy-garden/flower_rose.svg",
          water: "/illustrations/packs/candy-garden/flower_tulip.svg",
          air: "/illustrations/packs/candy-garden/flower_daisy.svg",
          earth: "/illustrations/packs/candy-garden/flower_sunflower.svg",
          aether: "/illustrations/packs/candy-garden/flower_tulip.svg",
          default: "/illustrations/packs/candy-garden/flower_daisy.svg",
        },
        trees: {
          bronze: "/illustrations/packs/candy-garden/tree_bronze.svg",
          silver: "/illustrations/packs/candy-garden/tree_silver.svg",
          gold: "/illustrations/packs/candy-garden/tree_gold.svg",
          diamond: "/illustrations/packs/candy-garden/tree_diamond.svg",
          default: "/illustrations/packs/candy-garden/tree_bronze.svg",
        },
      },
    },
  ],
};

type CatalogItemRow = {
  code: string | null;
  label: string | null;
  sort_order: number | null;
  enabled: boolean | null;
  color: string | null;
  icon: string | null;
  metadata: Record<string, unknown> | null;
};

function normalizeCatalogItem(row: CatalogItemRow): CatalogItemConfig | null {
  const code = String(row.code ?? "").trim();
  const label = String(row.label ?? "").trim();
  if (!code || !label) return null;
  return {
    code,
    label,
    sortOrder: Number.isFinite(row.sort_order) ? Number(row.sort_order) : 999,
    enabled: row.enabled !== false,
    color: row.color ?? null,
    icon: row.icon ?? null,
    metadata:
      row.metadata && typeof row.metadata === "object" ? row.metadata : {},
  };
}

export function getFallbackCatalogItems(
  catalogKey: string,
): CatalogItemConfig[] {
  return (FALLBACK_CATALOGS[catalogKey] ?? []).map((x) => ({ ...x }));
}

export function getCatalogLabelWithEmoji(item: CatalogItemConfig) {
  const emoji =
    typeof item.metadata?.emoji === "string"
      ? (item.metadata.emoji as string)
      : "";
  return emoji ? `${emoji} ${item.label}` : item.label;
}

export function formatTemplate(
  template: string,
  vars: Record<string, string | number>,
) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) {
      return String(vars[key]);
    }
    return `{${key}}`;
  });
}

export async function getCatalogItems(
  catalogKey: string,
): Promise<CatalogItemConfig[]> {
  const fallback = getFallbackCatalogItems(catalogKey);
  try {
    const { data, error } = await supabase
      .from("catalog_items")
      .select("code,label,sort_order,enabled,color,icon,metadata")
      .eq("catalog_key", catalogKey)
      .eq("enabled", true)
      .order("sort_order", { ascending: true })
      .order("code", { ascending: true });

    if (error) return fallback;

    const normalized = ((data as CatalogItemRow[] | null) ?? [])
      .map(normalizeCatalogItem)
      .filter(Boolean) as CatalogItemConfig[];

    if (!normalized.length) return fallback;
    return normalized;
  } catch {
    return fallback;
  }
}

export async function getManyCatalogItems(
  catalogKeys: string[],
): Promise<Record<string, CatalogItemConfig[]>> {
  const out: Record<string, CatalogItemConfig[]> = {};
  const unique = Array.from(new Set(catalogKeys.filter(Boolean)));
  if (!unique.length) return out;

  try {
    const { data, error } = await supabase
      .from("catalog_items")
      .select("catalog_key,code,label,sort_order,enabled,color,icon,metadata")
      .in("catalog_key", unique)
      .eq("enabled", true)
      .order("sort_order", { ascending: true })
      .order("code", { ascending: true });

    if (error) {
      for (const key of unique) {
        out[key] = getFallbackCatalogItems(key);
      }
      return out;
    }

    const grouped: Record<string, CatalogItemConfig[]> = {};
    for (const row of (data as (CatalogItemRow & { catalog_key: string })[] | null) ?? []) {
      const item = normalizeCatalogItem(row);
      if (!item) continue;
      const k = row.catalog_key;
      if (!grouped[k]) grouped[k] = [];
      grouped[k].push(item);
    }

    for (const key of unique) {
      const items = grouped[key];
      out[key] = items && items.length > 0 ? items : getFallbackCatalogItems(key);
    }
  } catch {
    for (const key of unique) {
      out[key] = getFallbackCatalogItems(key);
    }
  }
  return out;
}
