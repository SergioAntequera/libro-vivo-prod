import { bondTypeLabel, describeInvitationOutcome } from "@/lib/bonds";
import type { BondInvitation } from "./types";

export function memberRoleLabel(value: string) {
  if (value === "owner") return "Creador";
  if (value === "admin") return "Admin";
  if (value === "member") return "Miembro";
  return value || "Miembro";
}

export function invitationStatusLabel(value: string) {
  if (value === "pending") return "Pendiente";
  if (value === "accepted") return "Aceptada";
  if (value === "rejected") return "Rechazada";
  if (value === "revoked") return "Cancelada";
  if (value === "expired") return "Expirada";
  return value || "Desconocido";
}

export function invitationStatusPillClass(value: string) {
  if (value === "accepted") return "lv-tone-success";
  if (value === "rejected" || value === "revoked") return "lv-tone-error";
  if (value === "expired") return "bg-[var(--lv-bg-soft)] text-[var(--lv-text-muted)]";
  return "lv-tone-info";
}

export function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-ES");
}

export function parseDateValue(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isRecentInvitationUpdate(value: string | null, maxAgeDays: number) {
  const parsed = parseDateValue(value);
  if (!parsed) return false;
  return Date.now() - parsed.getTime() <= maxAgeDays * 24 * 60 * 60 * 1000;
}

export function invitationUpdateDate(invitation: BondInvitation) {
  if (invitation.status === "accepted") return invitation.acceptedAt ?? invitation.createdAt;
  return invitation.createdAt;
}

export function invitationHistoryMessage(invitation: BondInvitation, isOutgoing: boolean) {
  if (invitation.status === "accepted") {
    return isOutgoing
      ? "La otra persona la acepto y el nuevo jardin compartido ya existe."
      : "Aceptaste la invitacion y ya formas parte del nuevo jardin.";
  }
  if (invitation.status === "rejected") {
    return isOutgoing
      ? "La otra persona decidio no aceptarla por ahora."
      : "Decidiste no aceptar esta invitacion.";
  }
  if (invitation.status === "revoked") {
    return isOutgoing
      ? "La cancelaste antes de que se aceptara."
      : "La invitacion fue cancelada antes de completarse.";
  }
  if (invitation.status === "expired") {
    return "La invitacion caduco sin llegar a crear un jardin.";
  }
  return "Movimiento cerrado.";
}

export function invitationOutcomeFor(invitation: BondInvitation, currentUserId: string | null) {
  return describeInvitationOutcome({
    bondType: invitation.bondType,
    status: invitation.status,
    isOutgoing: invitation.invitedByUserId === currentUserId,
  });
}

export function acceptanceImpactText(input: {
  bondType: string;
  hasAnyGarden: boolean;
  activeGardenTitle: string | null;
}) {
  const gardenLabel = bondTypeLabel(input.bondType).toLowerCase();
  const targetGarden = `jardin de ${gardenLabel}`;

  if (!input.hasAnyGarden) {
    return `Al aceptar se crea tu primer ${targetGarden}.`;
  }

  if (input.activeGardenTitle) {
    return `Al aceptar se crea un ${targetGarden} separado y se selecciona como activo. No mezcla ni borra "${input.activeGardenTitle}".`;
  }

  return `Al aceptar se crea un ${targetGarden} separado y se selecciona como activo. No mezcla ni borra tus otros jardines.`;
}

export function outgoingInvitationImpactText(input: {
  bondType: string;
  activeGardenTitle: string | null;
}) {
  const gardenLabel = bondTypeLabel(input.bondType).toLowerCase();
  const targetGarden = `jardin de ${gardenLabel}`;

  if (input.activeGardenTitle) {
    return `Si la aceptan, se crea un ${targetGarden} separado. Enviarla no toca tu jardin activo actual: "${input.activeGardenTitle}".`;
  }

  return `Si la aceptan, se crea un ${targetGarden} separado. Enviarla no toca ningun jardin existente.`;
}
