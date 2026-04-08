"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSessionAccessToken, getSessionUser } from "@/lib/auth";
import {
  BOND_TYPES,
  describeInvitationRecipient,
  describePrivateInvitationPlan,
  getDerivedGardenTitleForBondType,
  normalizeInviteCode,
} from "@/lib/bonds";
import { clearActiveGardenCache } from "@/lib/gardens";
import { getProductSurfaceHref } from "@/lib/productSurfaces";
import { toErrorMessage } from "@/lib/errorMessage";
import {
  isRecentInvitationUpdate,
  invitationUpdateDate,
} from "./bondsPresentation";
import type {
  BondGardenSummary,
  BondInvitation,
  BondsMe,
  InvitationAction,
  InvitableBondType,
} from "./types";

type MePayload = {
  me: BondsMe;
};

type GardensPayload = {
  activeGardenId: string | null;
  gardens: BondGardenSummary[];
};

type SearchPayload = {
  profile: {
    id: string;
    name: string;
    avatarUrl: string | null;
    inviteCode: string;
  } | null;
};

type InvitationsPayload = {
  invitations: BondInvitation[];
};

type CreateInvitationPayload = {
  invitation: {
    invitationId: string;
    bondType: string;
    status: string;
    gardenTitle: string | null;
    invitedUserId: string | null;
    invitedEmail: string | null;
    expiresAt: string | null;
    targetProfile: {
      id: string;
      name: string;
      avatarUrl: string | null;
      inviteCode: string | null;
    } | null;
  };
};

type AcceptInvitationPayload = {
  accepted: {
    invitationId: string;
    bondId: string;
    gardenId: string;
    bondType: string;
    gardenTitle: string | null;
  };
};

type CreatePersonalPayload = {
  personalGarden: {
    bondId: string;
    gardenId: string;
    title: string;
  };
};

type UpdateInvitationPayload = {
  ok: boolean;
  status: string;
};

type SetActiveGardenPayload = {
  ok: boolean;
  activeGardenId: string | null;
};

type DeleteGardenPayload = {
  ok: boolean;
  deletedGardenId: string;
  deletedGardenTitle: string | null;
  deletedBondId: string | null;
  activeGardenId: string | null;
};

type ArchiveGardenPayload = {
  ok: boolean;
  archivedGardenId: string;
  archivedGardenTitle: string | null;
  activeGardenId: string | null;
};

const INVITABLE_BOND_TYPES = BOND_TYPES.filter(
  (type) => type !== "personal",
) as InvitableBondType[];

function normalizeBondsDbMessage(rawMessage: string) {
  const message = rawMessage.trim();
  const text = message.toLowerCase();

  if (text.includes("bond_id") && text.includes("ambiguous")) {
    return "Falta aplicar SQL de hotfix de ambiguedad de bond_id: 2026-03-11_private_bond_invitation_functions_hotfix_ambiguous_refs.sql";
  }
  if (text.includes("digest(") && text.includes("does not exist")) {
    return "Falta aplicar SQL de hotfix pgcrypto/search_path: 2026-03-11_private_bond_invitation_functions_hotfix_pgcrypto_search_path.sql";
  }
  if (text.includes("expires_at") && text.includes("ambiguous")) {
    return "Falta aplicar la version actualizada del hotfix pgcrypto/search_path: 2026-03-11_private_bond_invitation_functions_hotfix_pgcrypto_search_path.sql";
  }
  return message;
}

function toBondsUserMessage(error: unknown, fallback: string) {
  return normalizeBondsDbMessage(toErrorMessage(error, fallback));
}

async function callAuthedApi<T>(
  token: string,
  input: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(input, {
    ...init,
    headers,
    credentials: "same-origin",
  });

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await res.json() : null;

  if (!res.ok) {
    const message =
      payload && typeof payload.error === "string"
        ? payload.error
        : `Error HTTP ${res.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export function useBondsPageController() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOnboarding = searchParams.get("onboarding") === "1";

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [me, setMe] = useState<BondsMe | null>(null);
  const [invitations, setInvitations] = useState<BondInvitation[]>([]);
  const [gardens, setGardens] = useState<BondGardenSummary[]>([]);

  const [recipientInput, setRecipientInputState] = useState("");
  const [invitationGardenTitle, setInvitationGardenTitleState] = useState("");
  const [invitationGardenTitleTouched, setInvitationGardenTitleTouched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchPayload["profile"] | null>(null);

  const [bondType, setBondType] = useState<InvitableBondType>("pareja");
  const [sendingInvite, setSendingInvite] = useState(false);

  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [updatingInvitationId, setUpdatingInvitationId] = useState<string | null>(null);
  const [switchingGardenId, setSwitchingGardenId] = useState<string | null>(null);
  const [deletingGardenId, setDeletingGardenId] = useState<string | null>(null);

  const [personalGardenTitle, setPersonalGardenTitle] = useState("");
  const [creatingPersonalGarden, setCreatingPersonalGarden] = useState(false);

  const [acceptedBanner, setAcceptedBanner] = useState<{
    gardenTitle: string;
    bondType: string;
  } | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const codeCopiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setRecipientInput = useCallback((value: string) => {
    const next = normalizeInviteCode(value);
    setRecipientInputState(next);
    setSearchResult(null);
    setInvitationGardenTitleState("");
    setInvitationGardenTitleTouched(false);
  }, []);

  const setInvitationGardenTitle = useCallback((value: string) => {
    setInvitationGardenTitleTouched(true);
    setInvitationGardenTitleState(value);
  }, []);

  const goHome = useCallback(() => {
    router.push(getProductSurfaceHref("home"));
  }, [router]);

  const withToken = useCallback(
    async <T,>(fn: (token: string) => Promise<T>) => {
      const token = await getSessionAccessToken();
      if (!token) {
        router.push("/login");
        throw new Error("Sesion expirada. Vuelve a iniciar sesion.");
      }
      return fn(token);
    },
    [router],
  );

  const refreshInvitations = useCallback(
    () =>
      withToken(async (token) => {
        const payload = await callAuthedApi<InvitationsPayload>(
          token,
          "/api/bonds/invitations",
        );
        setInvitations(payload.invitations ?? []);
        return payload;
      }),
    [withToken],
  );

  const refreshGardens = useCallback(
    () =>
      withToken(async (token) => {
        const payload = await callAuthedApi<GardensPayload>(token, "/api/gardens");
        setGardens(payload.gardens ?? []);
        setMe((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            activeGardenId: payload.activeGardenId ?? null,
          };
        });
        return payload;
      }),
    [withToken],
  );

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const user = await getSessionUser();
        if (!user) {
          router.push("/login");
          return;
        }

        const token = await getSessionAccessToken();
        if (!token) {
          router.push("/login");
          return;
        }

        const [mePayload, invitationsPayload, gardensPayload] = await Promise.all([
          callAuthedApi<MePayload>(token, "/api/bonds/me"),
          callAuthedApi<InvitationsPayload>(token, "/api/bonds/invitations"),
          callAuthedApi<GardensPayload>(token, "/api/gardens"),
        ]);

        if (!active) return;
        setMe({
          ...mePayload.me,
          activeGardenId:
            gardensPayload.activeGardenId ?? mePayload.me.activeGardenId ?? null,
        });
        setInvitations(invitationsPayload.invitations ?? []);
        setGardens(gardensPayload.gardens ?? []);
      } catch (error) {
        if (!active) return;
        setMsg(toBondsUserMessage(error, "No se pudo cargar la pantalla de vinculos."));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    return () => {
      if (codeCopiedTimer.current) clearTimeout(codeCopiedTimer.current);
    };
  }, []);

  const incomingPending = useMemo(() => {
    if (!me?.id) return [] as BondInvitation[];
    return invitations.filter(
      (inv) => inv.status === "pending" && inv.invitedByUserId !== me.id,
    );
  }, [invitations, me?.id]);

  const outgoingPending = useMemo(() => {
    if (!me?.id) return [] as BondInvitation[];
    return invitations.filter(
      (inv) => inv.status === "pending" && inv.invitedByUserId === me.id,
    );
  }, [invitations, me?.id]);

  const historyInvitations = useMemo(
    () => invitations.filter((inv) => inv.status !== "pending"),
    [invitations],
  );

  const recentOutgoingUpdates = useMemo(() => {
    if (!me?.id) return [] as BondInvitation[];
    return historyInvitations.filter((invitation) => {
      if (invitation.invitedByUserId !== me.id) return false;
      if (
        invitation.status !== "accepted" &&
        invitation.status !== "rejected" &&
        invitation.status !== "expired"
      ) {
        return false;
      }
      return isRecentInvitationUpdate(invitationUpdateDate(invitation), 45);
    });
  }, [historyInvitations, me?.id]);

  const activeGarden = useMemo(
    () => gardens.find((garden) => garden.id === me?.activeGardenId) ?? null,
    [gardens, me?.activeGardenId],
  );

  const hasAnyGarden = gardens.length > 0;
  const hasActiveCoupleGarden = useMemo(
    () =>
      gardens.some(
        (garden) => garden.status === "active" && garden.bondType === "pareja",
      ),
    [gardens],
  );

  const invitationPlan = useMemo(
    () =>
      describePrivateInvitationPlan({
        bondType,
        hasAnyGarden,
        activeGardenTitle: activeGarden?.title ?? null,
      }),
    [activeGarden?.title, bondType, hasAnyGarden],
  );
  const suggestedInvitationGardenTitle = useMemo(() => {
    const recipientName = String(searchResult?.name ?? "").trim();
    if (!recipientName) return getDerivedGardenTitleForBondType(bondType);
    if (bondType === "amistad") return `Amistad con ${recipientName}`;
    if (bondType === "familia") return `Familia con ${recipientName}`;
    return `Jardin con ${recipientName}`;
  }, [bondType, searchResult?.name]);

  useEffect(() => {
    if (!searchResult) {
      if (!invitationGardenTitleTouched) setInvitationGardenTitleState("");
      return;
    }
    if (!invitationGardenTitleTouched) {
      setInvitationGardenTitleState(suggestedInvitationGardenTitle);
    }
  }, [invitationGardenTitleTouched, searchResult, suggestedInvitationGardenTitle]);

  const processingLabel = useMemo(() => {
    if (searching) return "Buscando codigo...";
    if (sendingInvite) return "Enviando invitacion...";
    if (creatingPersonalGarden) return "Creando jardin personal...";
    if (acceptingId) return "Aceptando invitacion...";
    if (updatingInvitationId) return "Actualizando invitacion...";
    if (switchingGardenId) return "Cambiando jardin activo...";
    if (deletingGardenId) return "Actualizando jardin...";
    return null;
  }, [
    acceptingId,
    creatingPersonalGarden,
    deletingGardenId,
    searching,
    sendingInvite,
    switchingGardenId,
    updatingInvitationId,
  ]);

  const isFirstUse = useMemo(
    () =>
      gardens.length === 0 &&
      incomingPending.length === 0 &&
      outgoingPending.length === 0 &&
      historyInvitations.length === 0,
    [gardens.length, incomingPending.length, outgoingPending.length, historyInvitations.length],
  );
  const hasPendingCoupleInvitation = useMemo(
    () =>
      [...incomingPending, ...outgoingPending].some(
        (invitation) => invitation.bondType === "pareja",
      ),
    [incomingPending, outgoingPending],
  );
  const coupleLockReason = hasActiveCoupleGarden
    ? "Ya tienes un jardin de pareja activo. Para no duplicar una relacion de pareja, solo puedes crear jardines de amistad o familia."
    : hasPendingCoupleInvitation
      ? "Ya hay una invitacion de pareja pendiente. Cancelala o espera respuesta antes de crear otra."
      : null;
  const bondTypes = useMemo(
    () =>
      coupleLockReason
        ? INVITABLE_BOND_TYPES.filter((type) => type !== "pareja")
        : INVITABLE_BOND_TYPES,
    [coupleLockReason],
  );

  useEffect(() => {
    if (bondTypes.some((type) => type === bondType)) return;
    setBondType(bondTypes[0] ?? "amistad");
  }, [bondType, bondTypes]);

  const trimmedRecipientInput = recipientInput.trim();
  const normalizedRecipientCode = normalizeInviteCode(recipientInput);
  const hasRecipientInput = trimmedRecipientInput.length > 0;
  const isValidRecipientCode = /^[A-Z0-9]{8}$/.test(normalizedRecipientCode);
  const verifiedRecipientCode =
    searchResult && normalizeInviteCode(searchResult.inviteCode) === normalizedRecipientCode;

  const inviteValidationMessage = useMemo(() => {
    if (bondType === "pareja" && coupleLockReason) {
      return coupleLockReason;
    }
    if (!hasRecipientInput) {
      return "Introduce el codigo privado de 8 caracteres.";
    }
    if (!isValidRecipientCode) {
      return "El codigo debe tener 8 caracteres alfanumericos.";
    }
    if (
      me?.inviteCode &&
      isValidRecipientCode &&
      normalizedRecipientCode === me.inviteCode
    ) {
      return "No puedes invitarte a ti mismo con tu propio codigo.";
    }
    if (!verifiedRecipientCode) {
      return "Comprueba el codigo antes de enviar la invitacion.";
    }
    return null;
  }, [
    hasRecipientInput,
    coupleLockReason,
    bondType,
    isValidRecipientCode,
    me?.inviteCode,
    normalizedRecipientCode,
    verifiedRecipientCode,
  ]);

  const inviteRecipientLabel = useMemo(
    () =>
      describeInvitationRecipient({
        searchedProfileName:
          verifiedRecipientCode ? searchResult?.name ?? null : null,
        inviteCode: isValidRecipientCode ? normalizedRecipientCode : null,
      }),
    [isValidRecipientCode, normalizedRecipientCode, searchResult?.name, verifiedRecipientCode],
  );
  const trimmedInvitationGardenTitle = invitationGardenTitle.trim();
  const effectiveInvitationGardenTitle =
    trimmedInvitationGardenTitle || (verifiedRecipientCode ? suggestedInvitationGardenTitle : "");
  const gardenTitleValidationMessage = useMemo(() => {
    if (!verifiedRecipientCode) return null;
    if (!effectiveInvitationGardenTitle) return "Pon un nombre para el jardin.";
    if (effectiveInvitationGardenTitle.length > 80) {
      return "El nombre del jardin no puede superar 80 caracteres.";
    }
    return null;
  }, [effectiveInvitationGardenTitle, verifiedRecipientCode]);

  const canSendInvitation =
    !inviteValidationMessage &&
    !gardenTitleValidationMessage &&
    !sendingInvite &&
    bondTypes.length > 0;
  const canVerifyRecipientCode = isValidRecipientCode && !searching && !verifiedRecipientCode;

  useEffect(() => {
    if (!msg) return;
    const text = msg.toLowerCase();
    const isSticky =
      text.includes("error") ||
      text.includes("fallo") ||
      text.includes("falta") ||
      text.includes("no se pudo") ||
      text.includes("migracion") ||
      text.includes("inval");
    if (isSticky) return;
    const timer = window.setTimeout(() => setMsg(null), 4200);
    return () => window.clearTimeout(timer);
  }, [msg]);

  const searchByRecipientCode = useCallback(async () => {
    setMsg(null);
    if (!isValidRecipientCode) {
      setMsg("El codigo debe tener 8 caracteres alfanumericos.");
      return;
    }

    setSearching(true);
    try {
      const payload = await withToken((token) =>
        callAuthedApi<SearchPayload>(token, "/api/bonds/search", {
          method: "POST",
          body: JSON.stringify({ inviteCode: normalizedRecipientCode }),
        }),
      );
      if (payload.profile?.id === me?.id) {
        setSearchResult(null);
        setMsg("Ese codigo es el tuyo. Comparte otro codigo para invitar.");
        return;
      }
      setSearchResult(payload.profile ?? null);
      if (!payload.profile) setMsg("No se encontro ningun perfil con ese codigo.");
    } catch (error) {
      setMsg(toBondsUserMessage(error, "No se pudo buscar por codigo."));
      setSearchResult(null);
    } finally {
      setSearching(false);
    }
  }, [isValidRecipientCode, me?.id, normalizedRecipientCode, withToken]);

  const createInvitation = useCallback(async () => {
    setMsg(null);
    if (inviteValidationMessage) {
      setMsg(inviteValidationMessage);
      return;
    }

    setSendingInvite(true);
    try {
      const payload = await withToken((token) =>
        callAuthedApi<CreateInvitationPayload>(token, "/api/bonds/invitations", {
          method: "POST",
          body: JSON.stringify({
            bondType,
            targetInviteCode: isValidRecipientCode ? normalizedRecipientCode : null,
            targetEmail: null,
            gardenTitle: effectiveInvitationGardenTitle || null,
          }),
        }),
      );
      await refreshInvitations();
      const recipientLabel = describeInvitationRecipient({
        searchedProfileName: payload.invitation.targetProfile?.name ?? null,
        inviteCode: isValidRecipientCode ? normalizedRecipientCode : null,
        invitedUserId: payload.invitation.invitedUserId,
      });
      setMsg(
        `Invitacion enviada a ${recipientLabel}. Si la acepta, se creara "${effectiveInvitationGardenTitle}" separado del jardin activo.`,
      );
      setRecipientInputState("");
      setSearchResult(null);
      setInvitationGardenTitleState("");
      setInvitationGardenTitleTouched(false);
    } catch (error) {
      setMsg(toBondsUserMessage(error, "No se pudo crear la invitacion."));
    } finally {
      setSendingInvite(false);
    }
  }, [
    bondType,
    effectiveInvitationGardenTitle,
    inviteValidationMessage,
    isValidRecipientCode,
    normalizedRecipientCode,
    refreshInvitations,
    withToken,
  ]);

  const acceptInvitation = useCallback(
    async (invitationId: string) => {
      setMsg(null);
      setAcceptedBanner(null);
      setAcceptingId(invitationId);
      try {
        const payload = await withToken((token) =>
          callAuthedApi<AcceptInvitationPayload>(
            token,
            `/api/bonds/invitations/${invitationId}/accept`,
            { method: "POST" },
          ),
        );
        clearActiveGardenCache();
        await Promise.all([refreshInvitations(), refreshGardens()]);
        if (isOnboarding) {
          router.replace(getProductSurfaceHref("home"));
          return;
        }
        setAcceptedBanner({
          gardenTitle: payload.accepted.gardenTitle ?? "Jardin compartido",
          bondType: payload.accepted.bondType ?? "",
        });
      } catch (error) {
        setMsg(toBondsUserMessage(error, "No se pudo aceptar la invitacion."));
      } finally {
        setAcceptingId(null);
      }
    },
    [isOnboarding, refreshGardens, refreshInvitations, router, withToken],
  );

  const createPersonalGarden = useCallback(async () => {
    setMsg(null);
    setCreatingPersonalGarden(true);
    try {
      const payload = await withToken((token) =>
        callAuthedApi<CreatePersonalPayload>(token, "/api/bonds/personal", {
          method: "POST",
          body: JSON.stringify({ title: personalGardenTitle || null }),
        }),
      );
      clearActiveGardenCache();
      await refreshGardens();
      if (isOnboarding) {
        router.replace(getProductSurfaceHref("home"));
        return;
      }
      setMsg(`Jardin personal creado: ${payload.personalGarden.title}.`);
      setPersonalGardenTitle("");
    } catch (error) {
      setMsg(toBondsUserMessage(error, "No se pudo crear el jardin personal."));
    } finally {
      setCreatingPersonalGarden(false);
    }
  }, [isOnboarding, personalGardenTitle, refreshGardens, router, withToken]);

  const copyMyCode = useCallback(async () => {
    const code = me?.inviteCode ?? "";
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCodeCopied(true);
      if (codeCopiedTimer.current) clearTimeout(codeCopiedTimer.current);
      codeCopiedTimer.current = setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      setMsg("No se pudo copiar. Puedes copiarlo manualmente.");
    }
  }, [me?.inviteCode]);

  const updateInvitationStatus = useCallback(
    async (invitationId: string, action: InvitationAction) => {
      setMsg(null);
      setUpdatingInvitationId(invitationId);
      try {
        const payload = await withToken((token) =>
          callAuthedApi<UpdateInvitationPayload>(
            token,
            `/api/bonds/invitations/${invitationId}`,
            {
              method: "PATCH",
              body: JSON.stringify({ action }),
            },
          ),
        );
        await refreshInvitations();
        if (payload.status === "rejected") {
          setMsg("Invitacion rechazada.");
        } else if (payload.status === "revoked") {
          setMsg("Invitacion cancelada.");
        } else {
          setMsg("Invitacion actualizada.");
        }
      } catch (error) {
        setMsg(
          toBondsUserMessage(
            error,
            action === "reject"
              ? "No se pudo rechazar la invitacion."
              : "No se pudo cancelar la invitacion.",
          ),
        );
      } finally {
        setUpdatingInvitationId(null);
      }
    },
    [refreshInvitations, withToken],
  );

  const setActiveGarden = useCallback(
    async (gardenId: string) => {
      setMsg(null);
      setSwitchingGardenId(gardenId);
      try {
        const payload = await withToken((token) =>
          callAuthedApi<SetActiveGardenPayload>(token, "/api/gardens/active", {
            method: "PATCH",
            body: JSON.stringify({ gardenId }),
          }),
        );
        clearActiveGardenCache();
        setMe((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            activeGardenId: payload.activeGardenId ?? null,
          };
        });
        setMsg("Jardin activo actualizado.");
      } catch (error) {
        setMsg(toBondsUserMessage(error, "No se pudo cambiar el jardin activo."));
      } finally {
        setSwitchingGardenId(null);
      }
    },
    [withToken],
  );

  const deleteGarden = useCallback(
    async (gardenId: string) => {
      setMsg(null);
      setDeletingGardenId(gardenId);
      try {
        const payload = await withToken((token) =>
          callAuthedApi<DeleteGardenPayload>(token, `/api/gardens/${gardenId}`, {
            method: "DELETE",
          }),
        );
        clearActiveGardenCache();
        setMe((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            activeGardenId: payload.activeGardenId ?? null,
          };
        });
        await refreshGardens();
        setMsg(
          payload.activeGardenId && payload.activeGardenId !== gardenId
            ? "Jardin borrado. Hemos cambiado al siguiente disponible."
            : "Jardin borrado.",
        );
      } catch (error) {
        setMsg(toBondsUserMessage(error, "No se pudo borrar el jardin."));
      } finally {
        setDeletingGardenId(null);
      }
    },
    [refreshGardens, withToken],
  );

  const archiveGarden = useCallback(
    async (gardenId: string) => {
      setMsg(null);
      setDeletingGardenId(gardenId);
      try {
        const payload = await withToken((token) =>
          callAuthedApi<ArchiveGardenPayload>(token, `/api/gardens/${gardenId}`, {
            method: "PATCH",
            body: JSON.stringify({ action: "archive" }),
          }),
        );
        clearActiveGardenCache();
        setMe((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            activeGardenId: payload.activeGardenId ?? null,
          };
        });
        await refreshGardens();
        setMsg(
          payload.activeGardenId && payload.activeGardenId !== gardenId
            ? "Jardin compartido cerrado. La app ha cambiado al siguiente espacio disponible."
            : "Jardin compartido cerrado.",
        );
      } catch (error) {
        setMsg(toBondsUserMessage(error, "No se pudo cerrar el jardin compartido."));
      } finally {
        setDeletingGardenId(null);
      }
    },
    [refreshGardens, withToken],
  );

  return {
    loading,
    isOnboarding,
    msg,
    processingLabel,
    me,
    gardens,
    activeGarden,
    hasAnyGarden,
    incomingPending,
    outgoingPending,
    historyInvitations,
    recentOutgoingUpdates,
    isFirstUse,
    acceptedBanner,
    codeCopied,
    bondTypes,
    bondType,
    setBondType,
    hasActiveCoupleGarden,
    hasPendingCoupleInvitation,
    coupleLockReason,
    recipientInput,
    setRecipientInput,
    searching,
    searchResult,
    canVerifyRecipientCode,
    inviteValidationMessage,
    canSendInvitation,
    inviteRecipientLabel,
    invitationGardenTitle,
    setInvitationGardenTitle,
    suggestedInvitationGardenTitle,
    gardenTitleValidationMessage,
    invitationPlan,
    sendingInvite,
    acceptingId,
    updatingInvitationId,
    switchingGardenId,
    deletingGardenId,
    personalGardenTitle,
    setPersonalGardenTitle,
    creatingPersonalGarden,
    copyMyCode,
    searchByRecipientCode,
    createInvitation,
    acceptInvitation,
    createPersonalGarden,
    updateInvitationStatus,
    setActiveGarden,
    archiveGarden,
    deleteGarden,
    dismissAcceptedBanner: () => setAcceptedBanner(null),
    goHome,
  };
}

export type BondsPageController = ReturnType<typeof useBondsPageController>;
