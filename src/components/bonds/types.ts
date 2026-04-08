import type { BondType } from "@/lib/bonds";

export type BondsMe = {
  id: string;
  name: string;
  inviteCode: string | null;
  activeGardenId: string | null;
};

export type BondGardenParticipant = {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  isCurrentUser: boolean;
};

export type BondGardenSummary = {
  id: string;
  title: string;
  theme: string | null;
  status: string;
  bondType: string | null;
  createdAt: string | null;
  memberRole: string;
  joinedAt: string | null;
  participants: BondGardenParticipant[];
};

export type BondInvitation = {
  id: string;
  bondType: string;
  status: string;
  expiresAt: string | null;
  createdAt: string | null;
  acceptedAt: string | null;
  gardenTitle: string | null;
  invitedEmail: string | null;
  invitedUserId: string | null;
  invitedByUserId: string | null;
};

export type InvitationAction = "reject" | "cancel";

export type PendingInvitationAction = {
  invitationId: string;
  action: InvitationAction;
} | null;

export type InvitableBondType = Exclude<BondType, "personal">;
