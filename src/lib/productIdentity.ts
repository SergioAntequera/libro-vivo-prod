import { isAppRole, type AppRole } from "@/lib/roles";

export const PRODUCT_NAME = "Libro Vivo";
export const PRODUCT_TITLE_TEMPLATE = `%s | ${PRODUCT_NAME}`;
export const PRODUCT_DESCRIPTION =
  "Memoria privada de pareja para guardar recuerdos, plantar planes y leer el a\u00f1o como una historia compartida.";
export const PRODUCT_PRIVATE_GARDEN_LABEL = "Jard\u00edn privado";
export const PRODUCT_DEFAULT_HOME_WELCOME_TEXT = "Bienvenidos a vuestro jard\u00edn";
export const PRODUCT_DEFAULT_HOME_INTRO_TEXT =
  "Entra, mira c\u00f3mo va el a\u00f1o y decide si hoy quieres escribir, plantar o recordar.";
export const PRODUCT_HOME_WELCOME_PLACEHOLDER =
  "Ej: Bienvenidos a {{garden}}";

export const PRODUCT_DEFAULT_AVATAR_BY_ROLE: Record<AppRole, string> = {
  superadmin: "/avatars/avatar_member_a.svg",
  gardener_a: "/avatars/avatar_member_a.svg",
  gardener_b: "/avatars/avatar_member_b.svg",
};

export const PRODUCT_DEFAULT_AVATAR_BY_PRONOUN = {
  female: "/assets/character_female.png",
  male: "/assets/character_male.png",
} as const;

export type ProductAvatar = {
  src: string;
  alt: string;
};

export const PRODUCT_DEFAULT_GARDEN_COMPANION_AVATARS: readonly ProductAvatar[] = [
  {
    src: PRODUCT_DEFAULT_AVATAR_BY_PRONOUN.female,
    alt: "Compa\u00f1era del jard\u00edn",
  },
  {
    src: PRODUCT_DEFAULT_AVATAR_BY_PRONOUN.male,
    alt: "Compa\u00f1ero del jard\u00edn",
  },
] as const;

function normalizePronounAvatarKind(input: string | null | undefined) {
  const normalized = String(input ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (!normalized) return null;

  if (
    normalized === "ella" ||
    normalized === "she" ||
    normalized === "she/her" ||
    normalized === "mujer" ||
    normalized === "femenino" ||
    normalized === "female"
  ) {
    return "female";
  }

  if (
    normalized === "el" ||
    normalized === "he" ||
    normalized === "he/him" ||
    normalized === "hombre" ||
    normalized === "masculino" ||
    normalized === "male"
  ) {
    return "male";
  }

  return null;
}

export type HomeWelcomeVariables = {
  profileName?: string | null;
  gardenName?: string | null;
};

export function resolveHomeWelcomeText(
  input: string | null | undefined,
  variables?: HomeWelcomeVariables,
) {
  const profileName = String(variables?.profileName ?? "").trim();
  const gardenName = String(variables?.gardenName ?? "").trim();
  const template = String(input ?? "").trim();

  if (!template) {
    return gardenName
      ? `Bienvenidos a ${gardenName}`
      : PRODUCT_DEFAULT_HOME_WELCOME_TEXT;
  }

  return template.replace(
    /\{\{\s*(user|usuario|nombre)\s*\}\}|\{\{\s*(garden|jardin|jard\u00edn)\s*\}\}/gi,
    (match) => {
      const normalized = match
        .replace(/[{}]/g, "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      if (normalized === "user" || normalized === "usuario" || normalized === "nombre") {
        return profileName || "vosotros";
      }
      if (normalized === "garden" || normalized === "jardin") {
        return gardenName || PRODUCT_PRIVATE_GARDEN_LABEL.toLowerCase();
      }
      return match;
    },
  );
}

export function resolveProfileAvatarSrc(input: {
  avatarUrl?: string | null;
  pronoun?: string | null;
  role?: AppRole | string | null;
}) {
  const trimmedAvatarUrl = String(input.avatarUrl ?? "").trim();
  if (trimmedAvatarUrl) return trimmedAvatarUrl;

  const pronounAvatarKind = normalizePronounAvatarKind(input.pronoun);
  if (pronounAvatarKind) {
    return PRODUCT_DEFAULT_AVATAR_BY_PRONOUN[pronounAvatarKind];
  }

  if (isAppRole(input.role)) {
    return PRODUCT_DEFAULT_AVATAR_BY_ROLE[input.role];
  }

  return PRODUCT_DEFAULT_AVATAR_BY_ROLE.gardener_a;
}

export function getDefaultGardenCompanionAvatars() {
  return PRODUCT_DEFAULT_GARDEN_COMPANION_AVATARS.map((avatar) => ({ ...avatar }));
}
