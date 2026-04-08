export const APP_ROLES = ["superadmin", "gardener_a", "gardener_b"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export type RoleCapability =
  | "access_admin"
  | "manage_roles"
  | "manage_config"
  | "create_memory"
  | "edit_memory"
  | "share_memory"
  | "export_pdf";

export type ProfileRow = {
  id: string;
  name: string | null;
  last_name: string | null;
  pronoun: string | null;
  role: AppRole;
  avatar_url: string | null;
};

const ROLE_LABELS: Record<AppRole, string> = {
  superadmin: "Guardian del Jardín",
  gardener_a: "Jardinero",
  gardener_b: "Jardinera",
};

const ROLE_CAPABILITIES: Record<AppRole, readonly RoleCapability[]> = {
  superadmin: [
    "access_admin",
    "manage_roles",
    "manage_config",
    "create_memory",
    "edit_memory",
    "share_memory",
    "export_pdf",
  ],
  gardener_a: [
    "create_memory",
    "edit_memory",
    "share_memory",
    "export_pdf",
  ],
  gardener_b: [
    "create_memory",
    "edit_memory",
    "share_memory",
    "export_pdf",
  ],
};

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && APP_ROLES.includes(value as AppRole);
}

export function roleLabel(role: AppRole | string | null | undefined) {
  if (!isAppRole(role)) return "Invitado";
  return ROLE_LABELS[role];
}

export function isSuperadminRole(role: AppRole | string | null | undefined) {
  return role === "superadmin";
}

export function hasRole(
  role: AppRole | string | null | undefined,
  allowedRoles: readonly AppRole[],
) {
  return isAppRole(role) && allowedRoles.includes(role);
}

export function canRole(
  role: AppRole | string | null | undefined,
  capability: RoleCapability,
) {
  if (!isAppRole(role)) return false;
  return ROLE_CAPABILITIES[role].includes(capability);
}
