export type ProductSurfaceId =
  | "login"
  | "home"
  | "plans"
  | "chat"
  | "activity"
  | "new_page"
  | "page_detail"
  | "timeline"
  | "forest"
  | "year_book"
  | "achievements"
  | "bonds"
  | "capsules"
  | "admin";

export type ProductSurfaceKind = "entry" | "core" | "support" | "operational";
export type ProductDeviceFocus = "mobile-first" | "balanced" | "desktop-first";
export type ProductShellVisibility = "primary" | "secondary" | "contextual" | "hidden";

export type ProductSurfaceDefinition = {
  id: ProductSurfaceId;
  label: string;
  routePattern: string;
  href: string | null;
  kind: ProductSurfaceKind;
  deviceFocus: ProductDeviceFocus;
  shellVisibility: ProductShellVisibility;
  primaryQuestion: string;
  summary: string;
  canonicalReadModel: string;
  primaryActions: string[];
  owns: string[];
  mustNotOwn: string[];
};

function decodeEscapedUnicode(value: string) {
  return value.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) =>
    String.fromCharCode(Number.parseInt(hex, 16)),
  );
}

function normalizeSurfaceText(surface: ProductSurfaceDefinition): ProductSurfaceDefinition {
  return {
    ...surface,
    label: decodeEscapedUnicode(surface.label),
    primaryQuestion: decodeEscapedUnicode(surface.primaryQuestion),
    summary: decodeEscapedUnicode(surface.summary),
    canonicalReadModel: decodeEscapedUnicode(surface.canonicalReadModel),
    primaryActions: surface.primaryActions.map(decodeEscapedUnicode),
    owns: surface.owns.map(decodeEscapedUnicode),
    mustNotOwn: surface.mustNotOwn.map(decodeEscapedUnicode),
  };
}

const PRODUCT_SURFACE_LIST: readonly ProductSurfaceDefinition[] = [
  {
    id: "login",
    label: "Acceso",
    routePattern: "/login",
    href: "/login",
    kind: "entry",
    deviceFocus: "balanced",
    shellVisibility: "hidden",
    primaryQuestion: "C\u00f3mo entra la persona a su jard\u00edn privado.",
    summary: "Puerta de entrada a la experiencia privada.",
    canonicalReadModel: "AuthEntryReadModel",
    primaryActions: ["Entrar", "Crear cuenta", "Recuperar acceso"],
    owns: ["acceso", "bootstrap de perfil", "recuperaci\u00f3n de sesi\u00f3n"],
    mustNotOwn: ["contenido del jard\u00edn", "navegaci\u00f3n narrativa"],
  },
  {
    id: "home",
    label: "Home",
    routePattern: "/home",
    href: "/home",
    kind: "core",
    deviceFocus: "mobile-first",
    shellVisibility: "primary",
    primaryQuestion: "Qu\u00e9 importa hoy en vuestra historia compartida.",
    summary: "Entrada principal para escribir, plantar o recordar.",
    canonicalReadModel: "HomeReadModel",
    primaryActions: ["Escribir hoy", "Plantar plan", "Abrir recuerdo destacado"],
    owns: ["estado diario", "acciones principales", "vista viva del a\u00f1o actual"],
    mustNotOwn: ["exploraci\u00f3n hist\u00f3rica profunda", "lectura editorial anual", "gesti\u00f3n de hitos"],
  },
  {
    id: "plans",
    label: "Planes",
    routePattern: "/plans",
    href: "/plans",
    kind: "core",
    deviceFocus: "mobile-first",
    shellVisibility: "primary",
    primaryQuestion: "Qu\u00e9 puede pasar despu\u00e9s.",
    summary: "Centro \u00fanico: semilla -> agenda -> riego compartido -> flor.",
    canonicalReadModel: "PlansReadModel",
    primaryActions: ["Plantar semilla", "Programar fecha", "Regar cuando toca"],
    owns: ["futuro", "agenda", "riego compartido", "conversi\u00f3n seed -> page"],
    mustNotOwn: ["lectura del pasado", "cap\u00edtulos anuales", "anal\u00edtica del bosque"],
  },
  {
    id: "chat",
    label: "Chat",
    routePattern: "/chat",
    href: "/chat",
    kind: "support",
    deviceFocus: "mobile-first",
    shellVisibility: "secondary",
    primaryQuestion: "Qu\u00e9 necesit\u00e1is deciros ahora sin salir del jard\u00edn.",
    summary: "Conversaci\u00f3n ligera y contextual del jard\u00edn, con presencia, lectura y se\u00f1ales ef\u00edmeras.",
    canonicalReadModel: "GardenChatReadModel",
    primaryActions: ["Abrir chat", "Escribir", "Ver lectura"],
    owns: ["mensajer\u00eda contextual", "presence", "typing", "cursores de lectura"],
    mustNotOwn: ["flores", "c\u00e1psulas", "actividad derivada"],
  },
  {
    id: "activity",
    label: "Actividad",
    routePattern: "/activity",
    href: "/activity",
    kind: "support",
    deviceFocus: "balanced",
    shellVisibility: "secondary",
    primaryQuestion: "Qu\u00e9 pide atenci\u00f3n o trae novedades hoy en vuestro jard\u00edn.",
    summary: "Bandeja guiada derivada del estado real: regar, completar, aceptar y revisar.",
    canonicalReadModel: "ActivityFeedReadModel",
    primaryActions: ["Regar", "Completar flor", "Aceptar invitaci\u00f3n", "Revisar hito"],
    owns: ["bandeja guiada", "pendientes narrativos", "novedades \u00fatiles"],
    mustNotOwn: ["fuente de verdad paralela", "edici\u00f3n profunda", "dashboard decorativo"],
  },
  {
    id: "new_page",
    label: "Nueva p\u00e1gina",
    routePattern: "/page/new",
    href: "/page/new",
    kind: "core",
    deviceFocus: "mobile-first",
    shellVisibility: "primary",
    primaryQuestion: "C\u00f3mo capturar un recuerdo r\u00e1pido y guardarlo sin fricci\u00f3n.",
    summary: "Captura m\u00f3vil del recuerdo vivido con herencia desde semilla cuando aplique.",
    canonicalReadModel: "NewPageDraftModel",
    primaryActions: ["Capturar", "Guardar", "Enriquecer despu\u00e9s"],
    owns: ["captura r\u00e1pida", "prefill desde seed", "borrador local"],
    mustNotOwn: ["edici\u00f3n profunda prolongada", "lectura del recuerdo", "interpretaci\u00f3n anual"],
  },
  {
    id: "page_detail",
    label: "P\u00e1gina",
    routePattern: "/page/[id]",
    href: null,
    kind: "core",
    deviceFocus: "balanced",
    shellVisibility: "hidden",
    primaryQuestion: "Qu\u00e9 signific\u00f3 este recuerdo.",
    summary: "Lectura y edici\u00f3n profunda de una memoria concreta.",
    canonicalReadModel: "PageDetailReadModel",
    primaryActions: ["Leer", "Editar", "Escribir mirada personal"],
    owns: ["lectura del recuerdo", "reflexiones", "contexto de una p\u00e1gina"],
    mustNotOwn: ["captura r\u00e1pida", "timeline global", "historia anual completa"],
  },
  {
    id: "timeline",
    label: "Cronolog\u00eda",
    routePattern: "/timeline",
    href: "/timeline",
    kind: "support",
    deviceFocus: "balanced",
    shellVisibility: "contextual",
    primaryQuestion: "Qu\u00e9 pas\u00f3 y cu\u00e1ndo.",
    summary: "Ruta heredada que redirige al sendero para no duplicar la lectura del pasado.",
    canonicalReadModel: "TimelineLegacyRedirectModel",
    primaryActions: ["Abrir sendero"],
    owns: ["compatibilidad de rutas heredadas"],
    mustNotOwn: ["notas editoriales", "narrativa anual", "progreso del bosque"],
  },
  {
    id: "forest",
    label: "Bosque",
    routePattern: "/forest",
    href: "/forest",
    kind: "support",
    deviceFocus: "desktop-first",
    shellVisibility: "primary",
    primaryQuestion: "Qu\u00e9 patr\u00f3n describe vuestra historia.",
    summary: "Lectura anual por patrones, no por detalle.",
    canonicalReadModel: "ForestReadModel",
    primaryActions: ["Explorar a\u00f1os", "Leer patr\u00f3n", "Abrir libro anual"],
    owns: ["patr\u00f3n anual", "progresi\u00f3n agregada", "navegaci\u00f3n por a\u00f1os"],
    mustNotOwn: ["edici\u00f3n de p\u00e1ginas", "cronolog\u00eda factual global", "setup de invitaciones"],
  },
  {
    id: "year_book",
    label: "Libro anual",
    routePattern: "/year/[year]",
    href: null,
    kind: "support",
    deviceFocus: "desktop-first",
    shellVisibility: "contextual",
    primaryQuestion: "C\u00f3mo contar un a\u00f1o como cap\u00edtulo.",
    summary: "Cap\u00edtulo editorial del a\u00f1o visible.",
    canonicalReadModel: "YearBookReadModel",
    primaryActions: ["Leer a\u00f1o", "Editar memoria anual", "Exportar PDF"],
    owns: ["relato anual", "portada y nota del a\u00f1o", "export anual"],
    mustNotOwn: ["b\u00fasqueda global", "agenda futura", "progreso operativo"],
  },
  {
    id: "achievements",
    label: "Hitos",
    routePattern: "/achievements",
    href: "/achievements",
    kind: "support",
    deviceFocus: "balanced",
    shellVisibility: "contextual",
    primaryQuestion: "Qu\u00e9 hitos ya forman parte del recorrido.",
    summary: "Lectura secundaria del progreso ya desbloqueado, pensada para dialogar con bosque y a\u00f1o.",
    canonicalReadModel: "MilestonesReadModel",
    primaryActions: ["Revisar hitos", "Abrir bosque", "Abrir a\u00f1o relacionado"],
    owns: ["lectura secundaria de hitos", "memoria del progreso desbloqueado"],
    mustNotOwn: ["navegaci\u00f3n principal", "narrativa central del producto", "lectura principal del bosque"],
  },
  {
    id: "bonds",
    label: "Jardines y v\u00ednculos",
    routePattern: "/bonds",
    href: "/bonds",
    kind: "support",
    deviceFocus: "balanced",
    shellVisibility: "secondary",
    primaryQuestion: "Qui\u00e9n comparte este espacio y qu\u00e9 jard\u00edn est\u00e1 activo.",
    summary: "Setup privado de invitaciones, jardines y espacio compartido.",
    canonicalReadModel: "BondsAndGardensReadModel",
    primaryActions: ["Invitar", "Aceptar", "Cambiar jard\u00edn activo"],
    owns: ["invitaciones", "relaci\u00f3n privada", "selector de jard\u00edn"],
    mustNotOwn: ["n\u00facleo narrativo diario", "lectura de recuerdos", "edici\u00f3n editorial"],
  },
  {
    id: "admin",
    label: "Panel admin",
    routePattern: "/admin",
    href: "/admin",
    kind: "operational",
    deviceFocus: "desktop-first",
    shellVisibility: "hidden",
    primaryQuestion: "C\u00f3mo mantener el producto sin tocar tablas a ciegas.",
    summary: "Panel operativo derivado de la verdad del producto.",
    canonicalReadModel: "AdminOperationalReadModels",
    primaryActions: ["Configurar", "Validar", "Mantener"],
    owns: ["operaci\u00f3n interna", "sistemas derivados del producto"],
    mustNotOwn: ["sem\u00e1ntica del producto visible", "verdades paralelas"],
  },
  {
    id: "capsules",
    label: "C\u00e1psulas del tiempo",
    routePattern: "/capsules",
    href: "/capsules",
    kind: "core",
    deviceFocus: "balanced",
    shellVisibility: "secondary",
    primaryQuestion: "Qu\u00e9 recuerdos y promesas quer\u00e9is sellar para el futuro.",
    summary: "C\u00e1psulas selladas que se abren despu\u00e9s de un periodo de tiempo definido.",
    canonicalReadModel: "TimeCapsuleReadModel",
    primaryActions: ["Crear c\u00e1psula", "Abrir c\u00e1psula lista", "Ver abiertas"],
    owns: ["c\u00e1psulas del tiempo", "ventanas temporales", "bloques de contenido sellados"],
    mustNotOwn: ["p\u00e1ginas normales", "semillas", "actividad gen\u00e9rica"],
  },
] as const;

const PRODUCT_SURFACE_MAP = Object.fromEntries(
  PRODUCT_SURFACE_LIST.map((surface) => [surface.id, surface]),
) as Record<ProductSurfaceId, ProductSurfaceDefinition>;

export type StaticProductSurfaceId = Extract<
  ProductSurfaceId,
  | "login"
  | "home"
  | "plans"
  | "chat"
  | "activity"
  | "new_page"
  | "timeline"
  | "forest"
  | "achievements"
  | "bonds"
  | "capsules"
  | "admin"
>;

export type HomeImmersiveMode = "hill" | "map" | "path";

export const MOBILE_PRIMARY_SURFACE_IDS = ["home", "plans", "new_page"] as const;
export const DESKTOP_PRIMARY_SURFACE_IDS = ["home", "plans", "forest"] as const;
export const PROFILE_MENU_SURFACE_IDS = ["chat", "activity", "bonds", "achievements", "admin"] as const;

export function getProductSurface(id: ProductSurfaceId) {
  return normalizeSurfaceText(PRODUCT_SURFACE_MAP[id]);
}

export function getProductSurfaces() {
  return PRODUCT_SURFACE_LIST.map((surface) => normalizeSurfaceText(surface));
}

export function getProductSurfaceHref(id: StaticProductSurfaceId) {
  const href = PRODUCT_SURFACE_MAP[id].href;
  if (!href) {
    throw new Error(`La superficie ${id} no tiene ruta est\u00e1tica.`);
  }
  return href;
}

export function getYearBookHref(year: number) {
  return `/year/${year}`;
}

export function getPageDetailHref(pageId: string) {
  return `/page/${pageId}`;
}

export function getPlansSeedHref(seedId: string) {
  const params = new URLSearchParams();
  const normalizedSeedId = String(seedId ?? "").trim();
  if (normalizedSeedId) params.set("seed", normalizedSeedId);
  const query = params.toString();
  return query ? `${getProductSurfaceHref("plans")}?${query}` : getProductSurfaceHref("plans");
}

export function getCapsuleDetailHref(capsuleId: string) {
  const params = new URLSearchParams();
  const normalizedCapsuleId = String(capsuleId ?? "").trim();
  if (normalizedCapsuleId) params.set("capsule", normalizedCapsuleId);
  const query = params.toString();
  return query ? `${getProductSurfaceHref("capsules")}?${query}` : getProductSurfaceHref("capsules");
}

export function getHomeImmersiveHref(mode: HomeImmersiveMode) {
  return `/home?immersive=${mode}`;
}

export function getHomePathSummaryHref() {
  return getHomeImmersiveHref("path");
}

export function getNewPageHref(searchParams?: URLSearchParams | string) {
  const basePath = getProductSurfaceHref("new_page");
  if (!searchParams) return basePath;
  const query =
    typeof searchParams === "string"
      ? searchParams.replace(/^\?/, "").trim()
      : searchParams.toString().trim();
  return query ? `${basePath}?${query}` : basePath;
}

export function getMobilePrimarySurfaces() {
  return MOBILE_PRIMARY_SURFACE_IDS.map((id) => PRODUCT_SURFACE_MAP[id]);
}

export function getDesktopPrimarySurfaces() {
  return DESKTOP_PRIMARY_SURFACE_IDS.map((id) => PRODUCT_SURFACE_MAP[id]);
}

export function getProfileMenuSurfaces() {
  return PROFILE_MENU_SURFACE_IDS.map((id) => PRODUCT_SURFACE_MAP[id]);
}
