export const BOND_TYPES = ["pareja", "amistad", "familia", "personal"] as const;

export type BondType = (typeof BOND_TYPES)[number];

type GardenParticipantLike = {
  name?: string | null;
  isCurrentUser?: boolean | null;
};

export function bondTypeLabel(value: BondType | string) {
  const next = String(value ?? "").trim().toLowerCase();
  if (next === "pareja") return "Pareja";
  if (next === "amistad") return "Amistad";
  if (next === "familia") return "Familia";
  if (next === "personal") return "Personal";
  return String(value ?? "").trim() || "Vinculo";
}

export function getDerivedGardenTitleForBondType(value: BondType | string) {
  const next = String(value ?? "").trim().toLowerCase();
  if (next === "pareja") return "Jardin de pareja";
  if (next === "amistad") return "Jardin de amistad";
  if (next === "familia") return "Jardin de familia";
  if (next === "personal") return "Jardin personal";
  return "Jardin compartido";
}

export function describePrivateInvitationPlan(input: {
  bondType: BondType | string;
  hasAnyGarden: boolean;
  activeGardenTitle?: string | null;
}) {
  const gardenTitle = getDerivedGardenTitleForBondType(input.bondType);
  const activeGardenTitle = String(input.activeGardenTitle ?? "").trim();

  return {
    gardenTitle,
    headline: `Al aceptar, se creara "${gardenTitle}".`,
    detail: input.hasAnyGarden
      ? activeGardenTitle
        ? `No sustituye ni modifica tu jardin activo actual (${activeGardenTitle}).`
        : "No sustituye ni modifica ningun jardin que ya tengas."
      : "Si aun no tienes jardin, esta invitacion puede crear vuestro primer jardin compartido.",
    impactLabel: input.hasAnyGarden
      ? activeGardenTitle
        ? `Tu jardin activo sigue siendo "${activeGardenTitle}".`
        : "No cambia ningun jardin activo existente."
      : "Sera vuestro primer jardin compartido si la otra persona acepta.",
  };
}

export function describeInvitationRecipient(input: {
  invitedEmail?: string | null;
  invitedUserId?: string | null;
  searchedProfileName?: string | null;
  inviteCode?: string | null;
}) {
  const searchedProfileName = String(input.searchedProfileName ?? "").trim();
  if (searchedProfileName) return searchedProfileName;

  const invitedEmail = String(input.invitedEmail ?? "").trim();
  if (invitedEmail) return invitedEmail;

  const inviteCode = normalizeInviteCode(input.inviteCode);
  if (inviteCode) return `Codigo ${inviteCode}`;

  const invitedUserId = String(input.invitedUserId ?? "").trim();
  if (invitedUserId) return "Perfil privado";

  return "Pendiente de indicar";
}

export function describeInvitationOutcome(input: {
  bondType: BondType | string;
  status: string;
  isOutgoing: boolean;
}) {
  const bondLabel = bondTypeLabel(input.bondType).toLowerCase();
  const gardenTitle = getDerivedGardenTitleForBondType(input.bondType);

  if (input.status === "accepted") {
    return {
      title: input.isOutgoing
        ? `Aceptaron tu invitacion de ${bondLabel}`
        : `Aceptaste la invitacion de ${bondLabel}`,
      detail: input.isOutgoing
        ? `Ya se ha creado "${gardenTitle}".`
        : `Ya formas parte de "${gardenTitle}".`,
      tone: "success" as const,
    };
  }

  if (input.status === "rejected") {
    return {
      title: input.isOutgoing
        ? `Rechazaron tu invitacion de ${bondLabel}`
        : `Rechazaste la invitacion de ${bondLabel}`,
      detail: input.isOutgoing
        ? "No se ha creado ningun jardin compartido. Si mas adelante sigue teniendo sentido, puedes enviar una nueva."
        : "No se ha creado ningun jardin compartido a partir de esta invitacion.",
      tone: "warning" as const,
    };
  }

  if (input.status === "expired") {
    return {
      title: `Expiro una invitacion de ${bondLabel}`,
      detail: "Caduco sin respuesta y no llego a crear ningun jardin compartido.",
      tone: "muted" as const,
    };
  }

  if (input.status === "revoked") {
    return {
      title: input.isOutgoing
        ? `Cancelaste la invitacion de ${bondLabel}`
        : `La invitacion de ${bondLabel} fue cancelada`,
      detail: "Quedo cerrada antes de ser aceptada.",
      tone: "muted" as const,
    };
  }

  return {
    title: `Actualizacion de invitacion de ${bondLabel}`,
    detail: "Hubo un cambio de estado en esta invitacion.",
    tone: "muted" as const,
  };
}

export function normalizeBondType(value: unknown): BondType | null {
  const next = String(value ?? "").trim().toLowerCase();
  if (next === "pareja") return "pareja";
  if (next === "amistad") return "amistad";
  if (next === "familia") return "familia";
  if (next === "personal") return "personal";
  return null;
}

export function normalizeInviteCode(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function isInviteCode(value: unknown) {
  const code = normalizeInviteCode(value);
  return /^[A-Z0-9]{8}$/.test(code);
}

export function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function isLikelyEmail(value: unknown) {
  const email = normalizeEmail(value);
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeParticipantName(value: string | null | undefined) {
  const next = String(value ?? "").trim();
  return next || "Perfil privado";
}

export function getOtherGardenParticipants<T extends GardenParticipantLike>(participants: T[] | null | undefined) {
  return ((participants ?? []) as T[]).filter((participant) => !participant.isCurrentUser);
}

export function describeGardenSharing(input: {
  bondType?: string | null;
  participants?: GardenParticipantLike[] | null;
}) {
  const bondType = normalizeBondType(input.bondType);
  if (bondType === "personal") return "Solo tu";

  const others = getOtherGardenParticipants(input.participants);
  if (!others.length) return "Pendiente de otra persona";
  if (others.length === 1) return `Compartido con ${normalizeParticipantName(others[0].name)}`;
  if (others.length === 2) {
    return `Compartido con ${normalizeParticipantName(others[0].name)} y ${normalizeParticipantName(
      others[1].name,
    )}`;
  }
  return `Compartido con ${normalizeParticipantName(others[0].name)} y ${others.length - 1} mas`;
}

export function describeGardenSwitcherContext(input: {
  bondType?: string | null;
  participants?: GardenParticipantLike[] | null;
}) {
  const bondType = normalizeBondType(input.bondType);
  if (bondType === "personal") return "solo tu";

  const others = getOtherGardenParticipants(input.participants);
  if (!others.length) return "pendiente";
  if (others.length === 1) return `con ${normalizeParticipantName(others[0].name)}`;
  return `con ${normalizeParticipantName(others[0].name)} y ${others.length - 1} mas`;
}
