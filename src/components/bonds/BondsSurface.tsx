"use client";

import { useRef, useState, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import {
  bondTypeLabel,
  describeGardenSharing,
  describeInvitationRecipient,
  getDerivedGardenTitleForBondType,
} from "@/lib/bonds";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { StatusNotice } from "@/components/ui/StatusNotice";
import {
  acceptanceImpactText,
  formatDate,
  invitationHistoryMessage,
  invitationOutcomeFor,
  invitationStatusLabel,
  invitationStatusPillClass,
  invitationUpdateDate,
  memberRoleLabel,
  outgoingInvitationImpactText,
} from "./bondsPresentation";
import type { BondsPageController } from "./useBondsPageController";
import type {
  BondGardenSummary,
  BondInvitation,
  InvitableBondType,
  PendingInvitationAction,
} from "./types";

type BondsSurfaceProps = BondsPageController;
export type BondsView = "overview" | "create" | "invite" | "pending" | "manage";
type GardenActionKind = "archive" | "delete";
type PendingGardenAction = {
  garden: BondGardenSummary;
  action: GardenActionKind;
} | null;

export function BondsSurface(props: BondsSurfaceProps & { view?: BondsView }) {
  const inviteSectionRef = useRef<HTMLElement | null>(null);
  const personalGardenSectionRef = useRef<HTMLDivElement | null>(null);
  const [pendingInvitationAction, setPendingInvitationAction] =
    useState<PendingInvitationAction>(null);
  const [gardenPendingAction, setGardenPendingAction] =
    useState<PendingGardenAction>(null);

  if (props.loading) {
    return <PageLoadingState message="Cargando vinculos..." />;
  }

  const pendingCount = props.incomingPending.length + props.outgoingPending.length;
  const view = props.view ?? "overview";

  return (
    <div className="lv-page min-h-screen bg-[var(--lv-bg)] p-4 sm:p-6">
      <div className="lv-shell max-w-6xl space-y-5">
        <BondsHeaderSection
          view={view}
          activeGarden={props.activeGarden}
          processingLabel={props.processingLabel}
          isOnboarding={props.isOnboarding}
          acceptedBanner={props.acceptedBanner}
          onDismissAcceptedBanner={props.dismissAcceptedBanner}
          msg={props.msg}
          onBackHome={!props.isOnboarding ? props.goHome : null}
        />

        {view === "overview" && props.isFirstUse ? <FirstUsePanel /> : null}

        <BondsViewNav activeView={view} pendingCount={pendingCount} />

        {view === "overview" ? (
          <BondsOverviewSection
            activeGarden={props.activeGarden}
            pendingCount={pendingCount}
            hasActiveCoupleGarden={props.hasActiveCoupleGarden}
            coupleLockReason={props.coupleLockReason}
            gardenCount={props.gardens.length}
          />
        ) : null}

        {view === "create" ? (
          <CreateGardenSection
            sectionRef={personalGardenSectionRef}
            activeGarden={props.activeGarden}
            gardens={props.gardens}
            hasActiveCoupleGarden={props.hasActiveCoupleGarden}
            coupleLockReason={props.coupleLockReason}
            personalGardenTitle={props.personalGardenTitle}
            setPersonalGardenTitle={props.setPersonalGardenTitle}
            creatingPersonalGarden={props.creatingPersonalGarden}
            onCreatePersonalGarden={props.createPersonalGarden}
          />
        ) : null}

        {view === "pending" && pendingCount > 0 ? (
          <PendingActionsSection
            incomingPending={props.incomingPending}
            outgoingPending={props.outgoingPending}
            currentUserId={props.me?.id ?? null}
            hasAnyGarden={props.hasAnyGarden}
            activeGardenTitle={props.activeGarden?.title ?? null}
            acceptingId={props.acceptingId}
            updatingInvitationId={props.updatingInvitationId}
            onAccept={props.acceptInvitation}
            onReject={(invitationId) =>
              setPendingInvitationAction({ invitationId, action: "reject" })
            }
            onCancel={(invitationId) =>
              setPendingInvitationAction({ invitationId, action: "cancel" })
            }
          />
        ) : null}

        {view === "pending" && pendingCount === 0 ? <NoPendingSection /> : null}

        {view === "invite" ? (
          <InvitationComposerSection
            sectionRef={inviteSectionRef}
            meInviteCode={props.me?.inviteCode ?? null}
            codeCopied={props.codeCopied}
            onCopyCode={props.copyMyCode}
            bondTypes={props.bondTypes}
            bondType={props.bondType}
            setBondType={props.setBondType}
            recipientInput={props.recipientInput}
            setRecipientInput={props.setRecipientInput}
            searching={props.searching}
            searchResult={props.searchResult}
            canVerifyRecipientCode={props.canVerifyRecipientCode}
            onSearch={props.searchByRecipientCode}
            canSendInvitation={props.canSendInvitation}
            sendingInvite={props.sendingInvite}
            onCreateInvitation={props.createInvitation}
            inviteValidationMessage={props.inviteValidationMessage}
            invitationGardenTitle={props.invitationGardenTitle}
            setInvitationGardenTitle={props.setInvitationGardenTitle}
            gardenTitleValidationMessage={props.gardenTitleValidationMessage}
            invitationPlan={props.invitationPlan}
            activeGarden={props.activeGarden}
            coupleLockReason={props.coupleLockReason}
          />
        ) : null}

        {view === "manage" ? (
          <>
            <GardensSection
              sectionRef={personalGardenSectionRef}
              gardens={props.gardens}
              activeGardenId={props.me?.activeGardenId ?? null}
              switchingGardenId={props.switchingGardenId}
              deletingGardenId={props.deletingGardenId}
              onSetActiveGarden={props.setActiveGarden}
              onArchiveGarden={(garden) =>
                setGardenPendingAction({ garden, action: "archive" })
              }
              onDeleteGarden={(garden) =>
                setGardenPendingAction({ garden, action: "delete" })
              }
            />

            <RecentUpdatesSection
              invitations={props.recentOutgoingUpdates}
              currentUserId={props.me?.id ?? null}
            />

            <HistorySection
              invitations={props.historyInvitations}
              currentUserId={props.me?.id ?? null}
            />
          </>
        ) : null}
      </div>

      <ConfirmModal
        open={Boolean(pendingInvitationAction)}
        title={
          pendingInvitationAction?.action === "reject"
            ? "Rechazar invitacion"
            : "Cancelar invitacion enviada"
        }
        description={
          pendingInvitationAction?.action === "reject"
            ? "Esta invitacion pasara a rechazada y no creara jardin. Podras recibir otra nueva en el futuro."
            : "Esta invitacion pendiente se cancelara y dejara de ser valida."
        }
        confirmLabel={
          pendingInvitationAction?.action === "reject" ? "Si, rechazar" : "Si, cancelar"
        }
        tone="danger"
        busy={
          Boolean(props.updatingInvitationId) &&
          props.updatingInvitationId === pendingInvitationAction?.invitationId
        }
        onCancel={() => {
          if (props.updatingInvitationId) return;
          setPendingInvitationAction(null);
        }}
        onConfirm={() => {
          if (!pendingInvitationAction) return;
          const nextAction = pendingInvitationAction;
          void (async () => {
            await props.updateInvitationStatus(
              nextAction.invitationId,
              nextAction.action,
            );
            setPendingInvitationAction(null);
          })();
        }}
      />

      <ConfirmModal
        open={Boolean(gardenPendingAction)}
        title={
          gardenPendingAction?.action === "archive"
            ? "Cerrar jardin compartido"
            : "Borrar jardin personal"
        }
        description={
          gardenPendingAction
            ? buildGardenActionDescription(
                gardenPendingAction.garden,
                gardenPendingAction.action,
                gardenPendingAction.garden.id === (props.me?.activeGardenId ?? null),
              )
            : undefined
        }
        confirmLabel={
          gardenPendingAction?.action === "archive"
            ? "Si, cerrar jardin"
            : "Si, borrar jardin"
        }
        tone="danger"
        busy={
          Boolean(props.deletingGardenId) &&
          props.deletingGardenId === gardenPendingAction?.garden.id
        }
        onCancel={() => {
          if (props.deletingGardenId) return;
          setGardenPendingAction(null);
        }}
        onConfirm={() => {
          if (!gardenPendingAction) return;
          const target = gardenPendingAction;
          void (async () => {
            if (target.action === "archive") {
              await props.archiveGarden(target.garden.id);
            } else {
              await props.deleteGarden(target.garden.id);
            }
            setGardenPendingAction(null);
          })();
        }}
      />
    </div>
  );
}

function buildGardenActionDescription(
  garden: BondGardenSummary,
  action: GardenActionKind,
  isActive: boolean,
) {
  const activeWarning = isActive
    ? " Si era tu jardin activo, la app cambiara al siguiente disponible."
    : "";
  if (action === "archive") {
    return `"${garden.title}" dejara de estar activo para las personas que lo comparten. Su contenido se conserva como referencia y la otra persona vera un aviso cuando vuelva a entrar.${activeWarning}`;
  }
  return `"${garden.title}" se borrara con todo su contenido asociado. Solo afecta a tu espacio personal.${activeWarning} No se puede deshacer.`;
}

function BondsHeaderSection({
  view,
  activeGarden,
  processingLabel,
  isOnboarding,
  acceptedBanner,
  onDismissAcceptedBanner,
  msg,
  onBackHome,
}: {
  view: BondsView;
  activeGarden: BondGardenSummary | null;
  processingLabel: string | null;
  isOnboarding: boolean;
  acceptedBanner: { gardenTitle: string; bondType: string } | null;
  onDismissAcceptedBanner: () => void;
  msg: string | null;
  onBackHome: (() => void) | null;
}) {
  const titleByView: Record<BondsView, string> = {
    overview: "Tu jardin",
    create: "Crear jardin",
    invite: "Invitar",
    pending: "Invitaciones pendientes",
    manage: "Gestionar jardines",
  };
  const detailByView: Record<BondsView, string> = {
    overview: "Tu espacio actual y las acciones importantes.",
    create: "Crea un espacio personal o empieza el jardin de pareja con una invitacion.",
    invite: "Comprueba el codigo privado y envia la invitacion.",
    pending: "Acepta, rechaza o cancela invitaciones que siguen abiertas.",
    manage: "Cambia el jardin activo y revisa historial solo cuando lo necesites.",
  };

  return (
    <section className="lv-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl space-y-2">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--lv-text-muted)]">
            Jardin privado
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{titleByView[view]}</h1>
            <p className="mt-1 text-sm text-[var(--lv-text-muted)]">
              {detailByView[view]}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-end justify-end gap-2">
          {processingLabel ? (
            <div className="lv-badge bg-[var(--lv-info-soft)] text-[var(--lv-info)]">
              {processingLabel}
            </div>
          ) : null}
          {activeGarden ? (
            <div className="lv-badge bg-[var(--lv-primary-soft)] text-[var(--lv-primary-strong)]">
              Activo: {activeGarden.title}
            </div>
          ) : (
            <div className="lv-badge bg-[var(--lv-warning-soft)] text-[var(--lv-warning)]">
              Sin jardin activo
            </div>
          )}
          {activeGarden ? (
            <div className="lv-badge bg-white text-[var(--lv-text)]">
              {describeGardenSharing(activeGarden)}
            </div>
          ) : null}
          {onBackHome ? (
            <button type="button" className="lv-btn lv-btn-secondary" onClick={onBackHome}>
              Volver
            </button>
          ) : null}
        </div>
      </div>

      {isOnboarding ? (
        <div className="mt-4 rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-warning-soft)] p-4 text-sm text-[var(--lv-warning)]">
          Para empezar, acepta una invitacion o crea un jardin personal. Despues te llevamos al
          home.
        </div>
      ) : null}

      {acceptedBanner ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-success-soft)] p-4 text-sm text-[var(--lv-success)]">
          <div className="min-w-0 flex-1">
            <div className="font-semibold">Invitacion aceptada</div>
            <div>
              Ahora formas parte de &quot;{acceptedBanner.gardenTitle}&quot; (
              {bondTypeLabel(acceptedBanner.bondType)}). Este jardin queda separado del resto.
            </div>
          </div>
          <button
            type="button"
            className="lv-btn lv-btn-secondary"
            onClick={onDismissAcceptedBanner}
          >
            Cerrar
          </button>
        </div>
      ) : null}

      {msg ? <StatusNotice message={msg} className="mt-4" /> : null}
    </section>
  );
}

function FirstUsePanel() {
  return (
    <section className="rounded-[22px] border border-[var(--lv-border)] bg-[var(--lv-info-soft)] p-5 text-[var(--lv-info)]">
      <div className="text-xs font-semibold uppercase tracking-[0.18em]">Primer paso</div>
      <h2 className="mt-2 text-xl font-semibold">Crea tu primer jardin</h2>
      <p className="mt-1 text-sm leading-6">
        Puedes empezar con un jardin personal o invitar a tu pareja. La pantalla de crear te guia
        sin mezclarlo con historial ni gestion.
      </p>
      <Link href="/bonds/create" className="lv-btn lv-btn-primary mt-4">
        Crear jardin
      </Link>
    </section>
  );
}

function BondsViewNav({
  activeView,
  pendingCount,
}: {
  activeView: BondsView;
  pendingCount: number;
}) {
  const items: Array<{ href: string; label: string; view: BondsView; badge?: string }> = [
    { href: "/bonds", label: "Resumen", view: "overview" },
    { href: "/bonds/create", label: "Crear jardin", view: "create" },
    { href: "/bonds/invite", label: "Invitar", view: "invite" },
    {
      href: "/bonds/pending",
      label: "Pendientes",
      view: "pending",
      badge: pendingCount > 0 ? String(pendingCount) : undefined,
    },
    { href: "/bonds/manage", label: "Gestionar", view: "manage" },
  ];

  return (
    <nav
      aria-label="Navegacion de jardines"
      className="flex gap-2 overflow-x-auto rounded-[22px] border border-[var(--lv-border)] bg-white/95 p-2 shadow-[var(--lv-shadow-sm)]"
    >
      {items.map((item) => {
        const isActive = item.view === activeView;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`min-h-11 shrink-0 rounded-[16px] px-4 py-2 text-sm font-semibold transition ${
              isActive
                ? "border border-[color-mix(in_srgb,var(--lv-primary)_34%,white)] bg-[var(--lv-primary-soft)] text-[var(--lv-primary-strong)] shadow-sm"
                : "border border-transparent text-[var(--lv-text)] hover:border-[var(--lv-border)] hover:bg-[var(--lv-surface-soft)] hover:text-[var(--lv-primary-strong)]"
            }`}
          >
            {item.label}
            {item.badge ? (
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                  isActive
                    ? "bg-white/70 text-[var(--lv-primary-strong)]"
                    : "bg-[var(--lv-primary-soft)] text-[var(--lv-primary-strong)]"
                }`}
              >
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function BondsOverviewSection({
  activeGarden,
  pendingCount,
  hasActiveCoupleGarden,
  coupleLockReason,
  gardenCount,
}: {
  activeGarden: BondGardenSummary | null;
  pendingCount: number;
  hasActiveCoupleGarden: boolean;
  coupleLockReason: string | null;
  gardenCount: number;
}) {
  const primaryHref = pendingCount > 0 ? "/bonds/pending" : "/bonds/create";
  const primaryLabel = pendingCount > 0 ? "Revisar invitaciones" : "Crear jardin";

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="lv-card p-6 sm:p-7">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--lv-text-muted)]">
          Jardin activo
        </div>
        {activeGarden ? (
          <>
            <h2 className="mt-3 text-3xl font-semibold">{activeGarden.title}</h2>
            <p className="mt-2 text-base font-medium text-[var(--lv-primary-strong)]">
              {describeGardenSharing(activeGarden)}
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--lv-text-muted)]">
              Todo lo que hagas en home, chat, planes y paginas se guarda ahora en este jardin.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <GardenFactCard
                label="Tipo"
                value={activeGarden.bondType ? bondTypeLabel(activeGarden.bondType) : "Jardin"}
              />
              <GardenFactCard label="Tu rol" value={memberRoleLabel(activeGarden.memberRole)} />
              <GardenFactCard label="Compartido con" value={describeGardenSharing(activeGarden)} />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/home" className="lv-btn lv-btn-primary">
                Ir al jardin
              </Link>
              <Link href="/bonds/manage" className="lv-btn lv-btn-secondary">
                Cambiar jardin activo
              </Link>
            </div>
          </>
        ) : (
          <>
            <h2 className="mt-3 text-3xl font-semibold">Todavia no tienes jardin activo</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--lv-text-muted)]">
              Crea un jardin personal o acepta una invitacion para empezar a usar Libro Vivo.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/bonds/create" className="lv-btn lv-btn-primary">
                Crear jardin
              </Link>
              <Link href="/bonds/pending" className="lv-btn lv-btn-secondary">
                Ver invitaciones
              </Link>
            </div>
          </>
        )}
      </div>

      <div className="lv-card p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--lv-text-muted)]">
          Que hacer ahora
        </div>
        <div className="mt-4 grid gap-3">
          <Link href={primaryHref} className="lv-btn lv-btn-primary w-full justify-center">
            {primaryLabel}
          </Link>
          <Link href="/bonds/invite" className="lv-btn lv-btn-secondary w-full justify-center">
            Invitar a alguien
          </Link>
          <Link href="/bonds/manage" className="lv-btn lv-btn-secondary w-full justify-center">
            Gestionar jardines ({gardenCount})
          </Link>
        </div>
        <p className="mt-4 text-xs leading-5 text-[var(--lv-text-muted)]">
          {coupleLockReason ??
            "El jardin de pareja se crea una sola vez. Si necesitas un espacio solo tuyo, usa Crear jardin."}
        </p>
      </div>
    </section>
  );
}

function GardenFactCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
        {label}
      </div>
      <div className="mt-1 font-semibold text-[var(--lv-text)]">{value}</div>
    </div>
  );
}

function CreateGardenSection({
  sectionRef,
  activeGarden,
  gardens,
  hasActiveCoupleGarden,
  coupleLockReason,
  personalGardenTitle,
  setPersonalGardenTitle,
  creatingPersonalGarden,
  onCreatePersonalGarden,
}: {
  sectionRef: RefObject<HTMLDivElement | null>;
  activeGarden: BondGardenSummary | null;
  gardens: BondGardenSummary[];
  hasActiveCoupleGarden: boolean;
  coupleLockReason: string | null;
  personalGardenTitle: string;
  setPersonalGardenTitle: (value: string) => void;
  creatingPersonalGarden: boolean;
  onCreatePersonalGarden: () => void;
}) {
  return (
    <section ref={sectionRef} className="grid scroll-mt-6 gap-5 lg:grid-cols-2">
      <div className="lv-card p-6">
        <SectionHeading
          eyebrow="Crear"
          title="Crear jardin"
          detail="Elige entre un espacio personal o un jardin de pareja. Esta pantalla solo crea espacios; la gestion queda aparte."
        />

        <div className="mt-5 rounded-[22px] border border-[var(--lv-border)] bg-white p-5">
          <h3 className="text-xl font-semibold">Jardin personal</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--lv-text-muted)]">
            Un espacio solo tuyo. No invita a nadie, no toca tu jardin de pareja y puedes usarlo
            para notas o recuerdos propios.
          </p>
          <div className="mt-5 space-y-3">
            <label className="block">
              <span className="text-sm font-semibold">Nombre opcional</span>
              <input
                className="lv-input mt-2"
                placeholder="Mi jardin personal"
                value={personalGardenTitle}
                onChange={(event) => setPersonalGardenTitle(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="lv-btn lv-btn-primary w-full justify-center"
              onClick={onCreatePersonalGarden}
              disabled={creatingPersonalGarden}
            >
              {creatingPersonalGarden ? "Creando..." : "Crear jardin personal"}
            </button>
          </div>
        </div>
      </div>

      <div className="lv-card p-6">
        <div className="rounded-[22px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
            Jardin de pareja
          </div>
          <h3 className="mt-3 text-xl font-semibold">
            {hasActiveCoupleGarden ? "Ya tienes jardin de pareja" : "Crear invitando a tu pareja"}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--lv-text-muted)]">
            El jardin de pareja es unico. Se crea cuando la otra persona acepta tu invitacion.
          </p>
          {coupleLockReason ? (
            <div className="mt-4 rounded-[18px] border border-[var(--lv-border)] bg-white p-4 text-sm text-[var(--lv-text-muted)]">
              {coupleLockReason}
            </div>
          ) : (
            <Link href="/bonds/invite" className="lv-btn lv-btn-secondary mt-5 w-full justify-center">
              Invitar a mi pareja
            </Link>
          )}
        </div>

        <div className="mt-4 rounded-[22px] border border-[var(--lv-border)] bg-white p-5">
          <h3 className="font-semibold">Activo ahora</h3>
          <p className="mt-2 text-sm text-[var(--lv-text-muted)]">
            {activeGarden
              ? `${activeGarden.title} (${activeGarden.bondType ? bondTypeLabel(activeGarden.bondType) : "jardin"})`
              : "No hay jardin activo todavia."}
          </p>
          <p className="mt-2 text-xs text-[var(--lv-text-muted)]">
            Total de jardines: {gardens.length}. La lista completa vive en Gestionar.
          </p>
        </div>
      </div>
    </section>
  );
}

function PendingActionsSection({
  incomingPending,
  outgoingPending,
  currentUserId,
  hasAnyGarden,
  activeGardenTitle,
  acceptingId,
  updatingInvitationId,
  onAccept,
  onReject,
  onCancel,
}: {
  incomingPending: BondInvitation[];
  outgoingPending: BondInvitation[];
  currentUserId: string | null;
  hasAnyGarden: boolean;
  activeGardenTitle: string | null;
  acceptingId: string | null;
  updatingInvitationId: string | null;
  onAccept: (invitationId: string) => void;
  onReject: (invitationId: string) => void;
  onCancel: (invitationId: string) => void;
}) {
  const hasPending = incomingPending.length > 0 || outgoingPending.length > 0;
  if (!hasPending) return null;

  return (
    <section id="pending-actions" className="lv-card scroll-mt-6 p-5">
      <SectionHeading
        eyebrow="Pendiente"
        title="Invitaciones que pueden cambiar tus jardines"
        detail="Aceptar una recibida crea un jardin nuevo separado. Enviar una invitacion no mete a nadie en tu jardin activo."
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <PendingColumn title="Recibidas" count={incomingPending.length}>
          {incomingPending.length ? (
            incomingPending.map((invitation) => (
              <IncomingInvitationCard
                key={invitation.id}
                invitation={invitation}
                hasAnyGarden={hasAnyGarden}
                activeGardenTitle={activeGardenTitle}
                acceptingId={acceptingId}
                updatingInvitationId={updatingInvitationId}
                onAccept={onAccept}
                onReject={onReject}
              />
            ))
          ) : (
            <EmptyInline text="Nada pendiente para aceptar." />
          )}
        </PendingColumn>

        <PendingColumn title="Enviadas" count={outgoingPending.length}>
          {outgoingPending.length ? (
            outgoingPending.map((invitation) => (
              <OutgoingInvitationCard
                key={invitation.id}
                invitation={invitation}
                currentUserId={currentUserId}
                activeGardenTitle={activeGardenTitle}
                updatingInvitationId={updatingInvitationId}
                acceptingId={acceptingId}
                onCancel={onCancel}
              />
            ))
          ) : (
            <EmptyInline text="Nada esperando respuesta." />
          )}
        </PendingColumn>
      </div>
    </section>
  );
}

function PendingColumn({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">{title}</h3>
        <span className="lv-badge">{count}</span>
      </div>
      {children}
    </div>
  );
}

function NoPendingSection() {
  return (
    <section className="lv-card p-6 text-center">
      <div className="mx-auto max-w-md">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--lv-text-muted)]">
          Pendientes
        </div>
        <h2 className="mt-3 text-2xl font-semibold">No hay invitaciones pendientes</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--lv-text-muted)]">
          Si quieres crear un jardin compartido, envia una invitacion. Si solo necesitas un
          espacio tuyo, crea un jardin personal.
        </p>
        <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
          <Link href="/bonds/invite" className="lv-btn lv-btn-primary justify-center">
            Invitar a alguien
          </Link>
          <Link href="/bonds/create" className="lv-btn lv-btn-secondary justify-center">
            Crear jardin
          </Link>
        </div>
      </div>
    </section>
  );
}

function IncomingInvitationCard({
  invitation,
  hasAnyGarden,
  activeGardenTitle,
  acceptingId,
  updatingInvitationId,
  onAccept,
  onReject,
}: {
  invitation: BondInvitation;
  hasAnyGarden: boolean;
  activeGardenTitle: string | null;
  acceptingId: string | null;
  updatingInvitationId: string | null;
  onAccept: (invitationId: string) => void;
  onReject: (invitationId: string) => void;
}) {
  return (
    <article className="rounded-[18px] border border-[var(--lv-border)] bg-white p-4">
      <InvitationTitleRow invitation={invitation} />
      <div className="mt-2 text-sm font-semibold text-[var(--lv-text)]">
        Jardin: {invitation.gardenTitle ?? getDerivedGardenTitleForBondType(invitation.bondType)}
      </div>
      <p className="mt-2 text-sm text-[var(--lv-text-muted)]">
        {acceptanceImpactText({
          bondType: invitation.bondType,
          hasAnyGarden,
          activeGardenTitle,
        })}
      </p>
      <div className="mt-2 text-xs text-[var(--lv-text-muted)]">
        Creada: {formatDate(invitation.createdAt)} | Expira: {formatDate(invitation.expiresAt)}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="lv-btn lv-btn-primary"
          onClick={() => onAccept(invitation.id)}
          disabled={!!acceptingId || !!updatingInvitationId}
        >
          {acceptingId === invitation.id ? "Aceptando..." : "Aceptar y crear jardin"}
        </button>
        <button
          type="button"
          className="lv-btn lv-btn-secondary"
          onClick={() => onReject(invitation.id)}
          disabled={!!acceptingId || !!updatingInvitationId}
        >
          {updatingInvitationId === invitation.id ? "Procesando..." : "Rechazar"}
        </button>
      </div>
    </article>
  );
}

function OutgoingInvitationCard({
  invitation,
  currentUserId,
  activeGardenTitle,
  updatingInvitationId,
  acceptingId,
  onCancel,
}: {
  invitation: BondInvitation;
  currentUserId: string | null;
  activeGardenTitle: string | null;
  updatingInvitationId: string | null;
  acceptingId: string | null;
  onCancel: (invitationId: string) => void;
}) {
  const recipientLabel = describeInvitationRecipient({
    invitedEmail: invitation.invitedEmail,
    invitedUserId: invitation.invitedUserId,
  });
  const outcome = invitationOutcomeFor(invitation, currentUserId);

  return (
    <article className="rounded-[18px] border border-[var(--lv-border)] bg-white p-4">
      <InvitationTitleRow invitation={invitation} />
      <div className="mt-2 text-sm text-[var(--lv-text-muted)]">Destino: {recipientLabel}</div>
      <div className="mt-1 text-sm font-semibold text-[var(--lv-text)]">
        Jardin: {invitation.gardenTitle ?? getDerivedGardenTitleForBondType(invitation.bondType)}
      </div>
      <p className="mt-2 text-sm text-[var(--lv-text-muted)]">
        {outgoingInvitationImpactText({
          bondType: invitation.bondType,
          activeGardenTitle,
        })}
      </p>
      <div className="mt-2 text-xs text-[var(--lv-text-muted)]">
        {outcome.title} | Expira: {formatDate(invitation.expiresAt)}
      </div>
      <button
        type="button"
        className="lv-btn lv-btn-secondary mt-4"
        onClick={() => onCancel(invitation.id)}
        disabled={!!updatingInvitationId || !!acceptingId}
      >
        {updatingInvitationId === invitation.id ? "Cancelando..." : "Cancelar invitacion"}
      </button>
    </article>
  );
}

function InvitationTitleRow({ invitation }: { invitation: BondInvitation }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="font-semibold">{bondTypeLabel(invitation.bondType)}</div>
      <span
        className={`rounded-full border px-2 py-0.5 text-[11px] ${invitationStatusPillClass(
          invitation.status,
        )}`}
      >
        {invitationStatusLabel(invitation.status)}
      </span>
    </div>
  );
}

function GardensSection({
  sectionRef,
  gardens,
  activeGardenId,
  switchingGardenId,
  deletingGardenId,
  onSetActiveGarden,
  onArchiveGarden,
  onDeleteGarden,
}: {
  sectionRef: RefObject<HTMLDivElement | null>;
  gardens: BondGardenSummary[];
  activeGardenId: string | null;
  switchingGardenId: string | null;
  deletingGardenId: string | null;
  onSetActiveGarden: (gardenId: string) => void;
  onArchiveGarden: (garden: BondGardenSummary) => void;
  onDeleteGarden: (garden: BondGardenSummary) => void;
}) {
  const activeGardens = gardens.filter((garden) => garden.status !== "archived");
  const archivedGardens = gardens.filter((garden) => garden.status === "archived");

  return (
    <div ref={sectionRef} className="scroll-mt-6">
      <section className="lv-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionHeading
            eyebrow="Gestion"
            title={`Gestionar jardines (${gardens.length})`}
            detail="Cambia el jardin activo cuando lo necesites. Los jardines compartidos se cierran; los personales si pueden borrarse."
          />
          <Link href="/bonds/create" className="lv-btn lv-btn-secondary">
            Crear jardin
          </Link>
        </div>

        <div className="mt-4 space-y-5">
          <div className="space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--lv-text-muted)]">
              Jardines disponibles ({activeGardens.length})
            </div>
            {!activeGardens.length ? (
              <EmptyInline text="Todavia no tienes jardines activos." />
            ) : (
              activeGardens.map((garden) => {
                const isActive = activeGardenId === garden.id;
                const isDeleting = deletingGardenId === garden.id;
                const isOwner = garden.memberRole === "owner";
                const isPersonal = garden.bondType === "personal";
                return (
                  <article
                    key={garden.id}
                    className={`rounded-[18px] border p-4 ${
                      isActive
                        ? "border-[var(--lv-primary)] bg-[var(--lv-primary-soft)]"
                        : "border-[var(--lv-border)] bg-white"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-lg font-semibold">{garden.title}</div>
                        <div className="mt-1 text-sm font-medium text-[var(--lv-primary-strong)]">
                          {describeGardenSharing(garden)}
                        </div>
                        <div className="mt-1 text-sm text-[var(--lv-text-muted)]">
                          {isActive ? "Activo ahora" : "Disponible"} |{" "}
                          {garden.bondType ? `${bondTypeLabel(garden.bondType)} | ` : ""}
                          Rol: {memberRoleLabel(garden.memberRole)}
                        </div>
                        <div className="mt-1 text-xs text-[var(--lv-text-muted)]">
                          Alta: {formatDate(garden.joinedAt)}
                          {garden.theme ? ` | Tema: ${garden.theme}` : ""}
                        </div>
                        {!isOwner ? (
                          <div className="mt-3 text-xs text-[var(--lv-text-muted)]">
                            {isPersonal
                              ? "Solo quien tiene rol propietario puede borrar este jardin."
                              : "Solo quien tiene rol propietario puede cerrar este jardin compartido."}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-stretch gap-2 sm:items-end">
                        <button
                          type="button"
                          className={`lv-btn ${isActive ? "lv-btn-secondary" : "lv-btn-primary"}`}
                          onClick={() => onSetActiveGarden(garden.id)}
                          disabled={
                            isActive || switchingGardenId === garden.id || Boolean(deletingGardenId)
                          }
                        >
                          {isActive
                            ? "Activo"
                            : switchingGardenId === garden.id
                              ? "Activando..."
                              : "Usar este jardin"}
                        </button>
                        {isOwner ? (
                          <button
                            type="button"
                            className="lv-btn lv-btn-secondary text-red-600 hover:text-red-700"
                            onClick={() =>
                              isPersonal ? onDeleteGarden(garden) : onArchiveGarden(garden)
                            }
                            disabled={Boolean(switchingGardenId) || Boolean(deletingGardenId)}
                          >
                            {isDeleting
                              ? isPersonal
                                ? "Borrando..."
                                : "Cerrando..."
                              : isPersonal
                                ? "Borrar jardin"
                                : "Cerrar jardin"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          {archivedGardens.length ? (
            <div className="space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--lv-text-muted)]">
                Jardines cerrados ({archivedGardens.length})
              </div>
              {archivedGardens.map((garden) => (
                <article
                  key={garden.id}
                  className="rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-lg font-semibold">{garden.title}</div>
                      <div className="mt-1 text-sm font-medium text-[var(--lv-primary-strong)]">
                        {describeGardenSharing(garden)}
                      </div>
                      <div className="mt-1 text-sm text-[var(--lv-text-muted)]">
                        Cerrado |{" "}
                        {garden.bondType ? `${bondTypeLabel(garden.bondType)} | ` : ""}
                        Rol: {memberRoleLabel(garden.memberRole)}
                      </div>
                      <div className="mt-1 text-xs text-[var(--lv-text-muted)]">
                        Se conserva como referencia y ya no aparece en el uso diario.
                      </div>
                    </div>
                    <span className="lv-badge bg-[var(--lv-surface)] text-[var(--lv-text-muted)]">
                      Archivado
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function InvitationComposerSection({
  sectionRef,
  meInviteCode,
  codeCopied,
  onCopyCode,
  bondTypes,
  bondType,
  setBondType,
  recipientInput,
  setRecipientInput,
  searching,
  searchResult,
  canVerifyRecipientCode,
  onSearch,
  canSendInvitation,
  sendingInvite,
  onCreateInvitation,
  inviteValidationMessage,
  invitationGardenTitle,
  setInvitationGardenTitle,
  gardenTitleValidationMessage,
  invitationPlan,
  activeGarden,
  coupleLockReason,
}: {
  sectionRef: RefObject<HTMLElement | null>;
  meInviteCode: string | null;
  codeCopied: boolean;
  onCopyCode: () => void;
  bondTypes: InvitableBondType[];
  bondType: InvitableBondType;
  setBondType: (value: InvitableBondType) => void;
  recipientInput: string;
  setRecipientInput: (value: string) => void;
  searching: boolean;
  searchResult: { id: string; name: string; avatarUrl: string | null; inviteCode: string } | null;
  canVerifyRecipientCode: boolean;
  onSearch: () => void;
  canSendInvitation: boolean;
  sendingInvite: boolean;
  onCreateInvitation: () => void;
  inviteValidationMessage: string | null;
  invitationGardenTitle: string;
  setInvitationGardenTitle: (value: string) => void;
  gardenTitleValidationMessage: string | null;
  invitationPlan: {
    gardenTitle: string;
    headline: string;
    detail: string;
    impactLabel: string;
  };
  activeGarden: BondGardenSummary | null;
  coupleLockReason: string | null;
}) {
  const hasVerifiedRecipient = Boolean(searchResult);
  const visibleInvitationGardenTitle = invitationGardenTitle.trim() || invitationPlan.gardenTitle;
  const codeHelpText =
    recipientInput.length === 0
      ? "Introduce el codigo privado de la otra persona."
      : recipientInput.length < 8
        ? `Faltan ${8 - recipientInput.length} caracter(es).`
        : hasVerifiedRecipient
          ? "Codigo comprobado. Ya puedes enviar la invitacion."
          : "Comprueba el codigo para confirmar que existe.";

  return (
    <section ref={sectionRef} className="lv-card scroll-mt-6 p-5">
      <SectionHeading
        eyebrow="Invitar"
        title="Invitar a alguien"
        detail="Pide a la otra persona su codigo privado, compruebalo y envia. Si acepta, se crea un jardin compartido separado."
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.15fr)]">
        <div className="space-y-4">
          <div className="rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
              Tu codigo privado
            </div>
            <div className="mt-3 text-3xl font-semibold tracking-[0.18em]">
              {meInviteCode ?? "--------"}
            </div>
            <p className="mt-2 text-sm text-[var(--lv-text-muted)]">
              Comparte este codigo solo con quien quieras que pueda enviarte una invitacion.
            </p>
            <button
              type="button"
              className="lv-btn lv-btn-secondary mt-3"
              onClick={onCopyCode}
              disabled={!meInviteCode}
            >
              {codeCopied ? "Copiado" : "Copiar codigo"}
            </button>
          </div>
        </div>

        <div className="space-y-4 rounded-[20px] border border-[var(--lv-border)] bg-white p-4">
          <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
                Tipo de jardin
              </span>
              <select
                className="lv-select mt-2"
                value={bondType}
                onChange={(event) => setBondType(event.target.value as InvitableBondType)}
                disabled={bondTypes.length === 0}
              >
                {bondTypes.map((type) => (
                  <option key={type} value={type}>
                    {bondTypeLabel(type)}
                  </option>
                ))}
              </select>
              {coupleLockReason ? (
                <p className="mt-2 text-xs leading-5 text-[var(--lv-text-muted)]">
                  Pareja no aparece porque ya esta cubierta o pendiente.
                </p>
              ) : null}
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
                Persona invitada
              </span>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  className="lv-input"
                  placeholder="Codigo de 8 caracteres"
                  value={recipientInput}
                  onChange={(event) => setRecipientInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && canVerifyRecipientCode && !hasVerifiedRecipient) {
                      event.preventDefault();
                      onSearch();
                    }
                  }}
                />
                {hasVerifiedRecipient ? (
                  <div className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-[14px] border border-[var(--lv-border)] bg-[var(--lv-success-soft)] px-4 text-sm font-semibold text-[var(--lv-success)]">
                    Codigo comprobado
                  </div>
                ) : (
                  <button
                    type="button"
                    className="lv-btn lv-btn-primary shrink-0"
                    onClick={onSearch}
                    disabled={!canVerifyRecipientCode || searching}
                  >
                    {searching ? "Comprobando..." : "Comprobar codigo"}
                  </button>
                )}
              </div>
              <p
                className={`mt-2 text-xs leading-5 ${
                  hasVerifiedRecipient ? "text-[var(--lv-success)]" : "text-[var(--lv-text-muted)]"
                }`}
              >
                {codeHelpText}
              </p>
            </label>
          </div>

          {searchResult ? (
            <div className="rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-info-soft)] p-4 text-sm text-[var(--lv-info)]">
              <div className="text-xs font-semibold uppercase tracking-[0.16em]">Persona encontrada</div>
              <div className="mt-1 text-lg font-semibold">{searchResult.name}</div>
              <p className="mt-1 leading-6">
                Si envias la invitacion y acepta, se creara {visibleInvitationGardenTitle}. No
                cambia tu jardin activo{activeGarden ? `: ${activeGarden.title}.` : "."}
              </p>
              <label className="mt-4 block text-left text-[var(--lv-text)]">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
                  Nombre del jardin
                </span>
                <input
                  className="lv-input mt-2"
                  value={invitationGardenTitle}
                  placeholder={invitationPlan.gardenTitle}
                  onChange={(event) => setInvitationGardenTitle(event.target.value)}
                  maxLength={80}
                />
              </label>
              <p
                className={`mt-2 text-xs leading-5 ${
                  gardenTitleValidationMessage
                    ? "text-[var(--lv-warning)]"
                    : "text-[var(--lv-info)]"
                }`}
              >
                {gardenTitleValidationMessage ?? "Puedes dejarlo asi o cambiarlo antes de enviar."}
              </p>
            </div>
          ) : null}

          {hasVerifiedRecipient ? (
            <div className="rounded-[18px] border border-[var(--lv-border)] bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
                Paso 2
              </div>
              <h3 className="mt-1 text-lg font-semibold">Enviar invitacion</h3>
              <p className="mt-1 text-sm leading-6 text-[var(--lv-text-muted)]">
                La otra persona tendra que aceptarla para crear el jardin compartido.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="lv-btn lv-btn-primary"
                  onClick={onCreateInvitation}
                  disabled={!canSendInvitation}
                >
                  {sendingInvite ? "Enviando..." : "Enviar invitacion"}
                </button>
                {inviteValidationMessage ? (
                  <div className="text-sm text-[var(--lv-warning)]">{inviteValidationMessage}</div>
                ) : gardenTitleValidationMessage ? (
                  <div className="text-sm text-[var(--lv-warning)]">
                    {gardenTitleValidationMessage}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function RecentUpdatesSection({
  invitations,
  currentUserId,
}: {
  invitations: BondInvitation[];
  currentUserId: string | null;
}) {
  if (!invitations.length) return null;

  return (
    <section className="lv-card p-5">
      <SectionHeading
        eyebrow="Respuestas recientes"
        title="Ultimos cierres de invitacion"
        detail="Lo que ya se acepto, rechazo o caduco queda resumido aqui sin competir con el jardin activo."
      />
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {invitations.map((invitation) => {
          const outcome = invitationOutcomeFor(invitation, currentUserId);
          return (
            <article
              key={invitation.id}
              className="rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4"
            >
              <div className="font-semibold">{outcome.title}</div>
              <p className="mt-1 text-sm text-[var(--lv-text-muted)]">{outcome.detail}</p>
              <div className="mt-2 text-xs text-[var(--lv-text-muted)]">
                Actualizada: {formatDate(invitationUpdateDate(invitation))}
              </div>
              <Link
                href={invitation.status === "accepted" ? "/bonds/manage" : "/bonds/invite"}
                className="lv-btn lv-btn-secondary mt-3"
              >
                {invitation.status === "accepted" ? "Ver jardines" : "Enviar otra"}
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function HistorySection({
  invitations,
  currentUserId,
}: {
  invitations: BondInvitation[];
  currentUserId: string | null;
}) {
  return (
    <details className="lv-card p-5">
      <summary className="cursor-pointer font-semibold">
        Historico de invitaciones ({invitations.length})
      </summary>
      <p className="mt-2 text-sm text-[var(--lv-text-muted)]">
        Rastro de invitaciones cerradas. Esta parte queda plegada para no distraer del jardin
        activo.
      </p>
      {!invitations.length ? (
        <EmptyInline text="Sin movimientos historicos." className="mt-4" />
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {invitations.map((invitation) => {
            const isOutgoing = invitation.invitedByUserId === currentUserId;
            const outcome = invitationOutcomeFor(invitation, currentUserId);
            return (
              <article
                key={invitation.id}
                className="rounded-[18px] border border-[var(--lv-border)] bg-white p-4"
              >
                <InvitationTitleRow invitation={invitation} />
                <div className="mt-2 font-semibold">{outcome.title}</div>
                <p className="mt-1 text-sm text-[var(--lv-text-muted)]">
                  {invitationHistoryMessage(invitation, isOutgoing)}
                </p>
                <div className="mt-2 text-xs text-[var(--lv-text-muted)]">
                  Creada: {formatDate(invitation.createdAt)} | Aceptada:{" "}
                  {formatDate(invitation.acceptedAt)}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </details>
  );
}

function SectionHeading({
  eyebrow,
  title,
  detail,
}: {
  eyebrow: string;
  title: string;
  detail: string;
}) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
        {eyebrow}
      </div>
      <h2 className="mt-2 text-xl font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-[var(--lv-text-muted)]">{detail}</p>
    </div>
  );
}

function EmptyInline({ text, className }: { text: string; className?: string }) {
  return (
    <div
      className={`rounded-[18px] border border-[var(--lv-border)] bg-white p-4 text-sm text-[var(--lv-text-muted)] ${
        className ?? ""
      }`}
    >
      {text}
    </div>
  );
}
