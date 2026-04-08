"use client";

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { uploadProfileAvatar } from "@/lib/uploadProfileAvatar";
import ActiveGardenSwitcher from "@/components/shared/ActiveGardenSwitcher";
import { formatActivityUnseenLabel } from "@/lib/activityPresentation";
import {
  PRODUCT_DEFAULT_HOME_INTRO_TEXT,
  PRODUCT_NAME,
  PRODUCT_PRIVATE_GARDEN_LABEL,
  resolveProfileAvatarSrc,
} from "@/lib/productIdentity";
import { getProductSurface } from "@/lib/productSurfaces";

const YEAR_BOOK_SURFACE = getProductSurface("year_book");
const FOREST_SURFACE = getProductSurface("forest");
const CHAT_SURFACE = getProductSurface("chat");
const ACTIVITY_SURFACE = getProductSurface("activity");
const ACHIEVEMENTS_SURFACE = getProductSurface("achievements");
const BONDS_SURFACE = getProductSurface("bonds");
const CAPSULES_SURFACE = getProductSurface("capsules");
const ADMIN_SURFACE = getProductSurface("admin");
const PLANS_SURFACE = getProductSurface("plans");

type MenuSection = "actions" | "profile";

type HomeTopHeaderCardProps = {
  welcomeText: string;
  profileId: string | null;
  profileName: string | null;
  profileLastName: string | null;
  profilePronoun: string | null;
  profileRole: string | null;
  profileRoleLabel: string;
  avatarSrc: string;
  isAdmin: boolean;
  selectedYear: number;
  availableYears: number[];
  onYearChange: (year: number) => void;
  onOpenAdmin: () => void;
  onOpenYearBook: (year: number) => void;
  onOpenForest: () => void;
  onOpenChat: () => void;
  onOpenActivity: () => void;
  onOpenAchievements: () => void;
  onOpenBonds: () => void;
  onOpenCapsules: () => void;
  onPlantSeed: () => void;
  onOpenPlans: () => void;
  chatUnreadCount?: number;
  activityUnseenCount: number;
  onGardenChanged: () => void;
  onProfileUpdated?: () => void;
  onLogout: () => void;
};

function MenuActionButton({
  children,
  onClick,
  badge,
}: {
  children: ReactNode;
  onClick: () => void;
  badge?: ReactNode;
}) {
  return (
    <button
      type="button"
      className="lv-btn lv-btn-secondary w-full justify-between rounded-[16px]"
      onClick={onClick}
    >
      <span>{children}</span>
      {badge}
    </button>
  );
}

function MenuTabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`rounded-[16px] px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-white text-[var(--lv-text)] shadow-[var(--lv-shadow-sm)]"
          : "text-[var(--lv-text-muted)] hover:bg-white/70"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function HomeTopHeaderCard({
  welcomeText,
  profileId,
  profileName,
  profileLastName,
  profilePronoun,
  profileRole,
  profileRoleLabel,
  avatarSrc,
  isAdmin,
  selectedYear,
  availableYears,
  onYearChange,
  onOpenAdmin,
  onOpenYearBook,
  onOpenForest,
  onOpenChat,
  onOpenActivity,
  onOpenAchievements,
  onOpenBonds,
  onOpenCapsules,
  onPlantSeed,
  onOpenPlans,
  chatUnreadCount = 0,
  activityUnseenCount,
  onGardenChanged,
  onProfileUpdated,
  onLogout,
}: HomeTopHeaderCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<MenuSection>("actions");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [resolvedAvatarSrc, setResolvedAvatarSrc] = useState(avatarSrc);
  const [resolvedProfileName, setResolvedProfileName] = useState(profileName ?? "");
  const [resolvedProfileLastName, setResolvedProfileLastName] = useState(profileLastName ?? "");
  const [resolvedProfilePronoun, setResolvedProfilePronoun] = useState(profilePronoun ?? "");
  const [profileDraftName, setProfileDraftName] = useState(profileName ?? "");
  const [profileDraftLastName, setProfileDraftLastName] = useState(profileLastName ?? "");
  const [profileDraftPronoun, setProfileDraftPronoun] = useState(profilePronoun ?? "");
  const menuRef = useRef<HTMLDivElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const defaultAvatarSrc = resolveProfileAvatarSrc({
    pronoun: resolvedProfilePronoun || profilePronoun,
    role: profileRole,
  });
  const hasChatUnread = chatUnreadCount > 0;
  const hasCustomAvatar = resolvedAvatarSrc.trim() !== defaultAvatarSrc;
  const resolvedDisplayName = [resolvedProfileName.trim(), resolvedProfileLastName.trim()]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    setResolvedAvatarSrc(avatarSrc);
  }, [avatarSrc]);

  useEffect(() => {
    const nextName = profileName ?? "";
    setResolvedProfileName(nextName);
    setProfileDraftName(nextName);
  }, [profileName]);

  useEffect(() => {
    const nextLastName = profileLastName ?? "";
    setResolvedProfileLastName(nextLastName);
    setProfileDraftLastName(nextLastName);
  }, [profileLastName]);

  useEffect(() => {
    const nextPronoun = profilePronoun ?? "";
    setResolvedProfilePronoun(nextPronoun);
    setProfileDraftPronoun(nextPronoun);
  }, [profilePronoun]);

  useEffect(() => {
    if (!menuOpen) {
      setActiveSection("actions");
      setProfileMessage(null);
    }
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!menuRef.current?.contains(target)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  async function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file || !profileId) return;

    setAvatarUploading(true);
    setAvatarMessage(null);
    try {
      const publicUrl = await uploadProfileAvatar(profileId, file);
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profileId);

      if (error) {
        throw new Error(error.message || "No se pudo guardar la foto de perfil.");
      }

      setResolvedAvatarSrc(publicUrl);
      setAvatarMessage("Foto actualizada.");
      onProfileUpdated?.();
    } catch (error) {
      const fallback = error instanceof Error ? error.message : "No se pudo actualizar la foto.";
      setAvatarMessage(fallback);
    } finally {
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
      setAvatarUploading(false);
    }
  }

  async function handleProfileSave() {
    const nextName = profileDraftName.trim();
    const nextLastName = profileDraftLastName.trim();
    const nextPronoun = profileDraftPronoun.trim();
    if (!profileId || !nextName) {
      setProfileMessage("Escribe un nombre visible antes de guardar.");
      return;
    }

    setProfileSaving(true);
    setProfileMessage(null);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: nextName,
          last_name: nextLastName || null,
          pronoun: nextPronoun || null,
        })
        .eq("id", profileId);

      if (error) {
        throw new Error(error.message || "No se pudo guardar el perfil.");
      }

      setResolvedProfileName(nextName);
      setResolvedProfileLastName(nextLastName);
      setResolvedProfilePronoun(nextPronoun);
      if (!hasCustomAvatar) {
        setResolvedAvatarSrc(
          resolveProfileAvatarSrc({
            pronoun: nextPronoun || null,
            role: profileRole,
          }),
        );
      }
      setProfileDraftName(nextName);
      setProfileDraftLastName(nextLastName);
      setProfileDraftPronoun(nextPronoun);
      setProfileMessage("Perfil actualizado.");
      onProfileUpdated?.();
    } catch (error) {
      const fallback = error instanceof Error ? error.message : "No se pudo guardar el perfil.";
      setProfileMessage(fallback);
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleAvatarReset() {
    if (!profileId) return;

    setAvatarUploading(true);
    setAvatarMessage(null);
    try {
      const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", profileId);

      if (error) {
        throw new Error(error.message || "No se pudo restaurar el avatar.");
      }

      setResolvedAvatarSrc(defaultAvatarSrc);
      setAvatarMessage("Avatar por defecto restaurado.");
      onProfileUpdated?.();
    } catch (error) {
      const fallback = error instanceof Error ? error.message : "No se pudo quitar la foto.";
      setAvatarMessage(fallback);
    } finally {
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
      setAvatarUploading(false);
    }
  }

  const normalizedDraftName = profileDraftName.trim();
  const normalizedDraftLastName = profileDraftLastName.trim();
  const normalizedDraftPronoun = profileDraftPronoun.trim();
  const canSaveProfile =
    Boolean(profileId) &&
    Boolean(normalizedDraftName) &&
    (
      normalizedDraftName !== (resolvedProfileName.trim() || "") ||
      normalizedDraftLastName !== (resolvedProfileLastName.trim() || "") ||
      normalizedDraftPronoun !== (resolvedProfilePronoun.trim() || "")
    );

  return (
    <section data-home-tour="header-card" className="lv-card p-3.5 sm:p-5">
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--lv-text-muted)] sm:text-sm">
            <span className="font-medium">{PRODUCT_NAME}</span>
            <span className="h-1 w-1 rounded-full bg-[var(--lv-border-strong)]" />
            <span>{PRODUCT_PRIVATE_GARDEN_LABEL}</span>
          </div>
          <h1 className="mt-1 text-lg font-semibold leading-tight tracking-tight sm:text-2xl">
            {welcomeText}
          </h1>
          <p className="mt-1 hidden max-w-2xl text-sm text-[var(--lv-text-muted)] sm:block">
            {PRODUCT_DEFAULT_HOME_INTRO_TEXT}
          </p>
        </div>

        <div ref={menuRef} className="relative shrink-0">
          {menuOpen ? (
            <button
              type="button"
              className="fixed inset-0 z-30 cursor-default bg-transparent"
              onClick={() => setMenuOpen(false)}
              aria-label="Cerrar menu al pulsar fuera"
            />
          ) : null}

          <button
            type="button"
            className="relative z-40 flex items-center gap-3 rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-2.5 py-2 shadow-[var(--lv-shadow-sm)] transition hover:-translate-y-[1px]"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Abrir menu de usuario"
            data-home-tour="header-menu"
          >
            <div className="hidden min-w-0 md:block">
              <div className="truncate text-sm font-semibold text-[var(--lv-text)]">
                {resolvedDisplayName || "Tu perfil"}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--lv-text-muted)]">
                <span className="truncate">{profileRoleLabel}</span>
                {activityUnseenCount > 0 ? (
                  <span className="rounded-full bg-[var(--lv-primary-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--lv-primary-strong)]">
                    {activityUnseenCount > 9 ? "9+" : activityUnseenCount}
                  </span>
                ) : null}
              </div>
            </div>

            <span className="relative block h-12 w-12 overflow-hidden rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-bg-soft)] sm:h-14 sm:w-14">
              <img src={resolvedAvatarSrc} alt="Avatar" className="h-full w-full object-cover" />
              {activityUnseenCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex min-h-[22px] min-w-[22px] items-center justify-center rounded-full bg-[var(--lv-primary)] px-1.5 text-[11px] font-semibold text-white shadow-sm md:hidden">
                  {activityUnseenCount > 9 ? "9+" : activityUnseenCount}
                </span>
              ) : null}
            </span>
          </button>

          {menuOpen ? (
            <div className="fixed inset-x-3 bottom-4 top-20 z-40 flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-[var(--lv-border)] bg-[var(--lv-surface)] shadow-[var(--lv-shadow-md)] sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-[calc(100%+6px)] sm:w-[min(360px,calc(100vw-2rem))] sm:max-h-[min(calc(100dvh-5.5rem),720px)]">
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
                <section className="rounded-[22px] border border-[var(--lv-border)] bg-[linear-gradient(135deg,#fff9f1_0%,#fffdf9_56%,#f6f8fb_100%)] p-3.5">
                  <div className="flex items-center gap-3">
                    <span className="block h-16 w-16 shrink-0 overflow-hidden rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface)] shadow-[var(--lv-shadow-sm)]">
                      <img
                        src={resolvedAvatarSrc}
                        alt="Avatar de perfil"
                        className="h-full w-full object-cover"
                      />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-[var(--lv-text)] sm:text-base">
                        {resolvedDisplayName || "Tu perfil"}
                      </div>
                      <div className="mt-1 text-xs text-[var(--lv-text-muted)] sm:text-sm">
                        {profileRoleLabel || "Miembro del jardin"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-[18px] border border-[var(--lv-border)] bg-white/80 p-3">
                    <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--lv-text-muted)]">
                      Jardin activo
                    </div>
                    <ActiveGardenSwitcher compact onChanged={onGardenChanged} />
                  </div>
                </section>

                <div className="mt-3 grid grid-cols-2 gap-2 rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-1.5">
                  <MenuTabButton
                    active={activeSection === "actions"}
                    onClick={() => setActiveSection("actions")}
                  >
                    Accesos
                  </MenuTabButton>
                  <MenuTabButton
                    active={activeSection === "profile"}
                    onClick={() => setActiveSection("profile")}
                  >
                    Perfil
                  </MenuTabButton>
                </div>

                {activeSection === "actions" ? (
                  <section className="mt-3 rounded-[22px] border border-[var(--lv-border)] bg-white p-4">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <MenuActionButton
                        onClick={() => {
                          setMenuOpen(false);
                          onOpenYearBook(selectedYear);
                        }}
                      >
                        {YEAR_BOOK_SURFACE.label}
                      </MenuActionButton>
                      <MenuActionButton
                        onClick={() => {
                          setMenuOpen(false);
                          onOpenForest();
                        }}
                      >
                        {FOREST_SURFACE.label}
                      </MenuActionButton>
                      <MenuActionButton
                        onClick={() => {
                          setMenuOpen(false);
                          onOpenChat();
                        }}
                        badge={
                          hasChatUnread ? (
                            <span className="rounded-full bg-[#eef3ff] px-2 py-0.5 text-[11px] font-semibold text-[#36538c]">
                              {chatUnreadCount > 9 ? "9+" : chatUnreadCount}
                            </span>
                          ) : null
                        }
                      >
                        {CHAT_SURFACE.label}
                      </MenuActionButton>
                      <MenuActionButton
                        onClick={() => {
                          setMenuOpen(false);
                          onOpenActivity();
                        }}
                        badge={
                          activityUnseenCount > 0 ? (
                            <span className="rounded-full bg-[var(--lv-primary-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--lv-primary-strong)]">
                              {activityUnseenCount}
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-[var(--lv-text-muted)]">
                              {formatActivityUnseenLabel(0, { compact: true })}
                            </span>
                          )
                        }
                      >
                        {ACTIVITY_SURFACE.label}
                      </MenuActionButton>
                      <MenuActionButton
                        onClick={() => {
                          setMenuOpen(false);
                          onOpenAchievements();
                        }}
                      >
                        {ACHIEVEMENTS_SURFACE.label}
                      </MenuActionButton>
                      <MenuActionButton
                        onClick={() => {
                          setMenuOpen(false);
                          onOpenBonds();
                        }}
                      >
                        {BONDS_SURFACE.label}
                      </MenuActionButton>
                      <MenuActionButton
                        onClick={() => {
                          setMenuOpen(false);
                          onOpenCapsules();
                        }}
                      >
                        {CAPSULES_SURFACE.label}
                      </MenuActionButton>
                      {isAdmin ? (
                        <button
                          type="button"
                          className="lv-btn lv-btn-secondary w-full justify-start rounded-[16px]"
                          onClick={() => {
                            setMenuOpen(false);
                            onOpenAdmin();
                          }}
                        >
                          {ADMIN_SURFACE.label}
                        </button>
                      ) : null}
                    </div>

                  </section>
                ) : (
                  <section className="mt-3 rounded-[22px] border border-[var(--lv-border)] bg-white p-4">
                    <div className="rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
                        Foto de perfil
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <span className="block h-16 w-16 shrink-0 overflow-hidden rounded-[20px] border border-[var(--lv-border)] bg-white shadow-[var(--lv-shadow-sm)]">
                          <img
                            src={resolvedAvatarSrc}
                            alt="Preview de avatar"
                            className="h-full w-full object-cover"
                          />
                        </span>

                        <div className="min-w-0 flex-1 text-xs text-[var(--lv-text-muted)]">
                          Cambia tu foto o vuelve al avatar por defecto del jardin.
                        </div>
                      </div>

                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => void handleAvatarFileChange(event)}
                      />
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="lv-btn lv-btn-secondary"
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={avatarUploading || !profileId}
                        >
                          {avatarUploading ? "Subiendo..." : "Cambiar foto"}
                        </button>
                        <button
                          type="button"
                          className="lv-btn lv-btn-secondary"
                          onClick={() => void handleAvatarReset()}
                          disabled={avatarUploading || !profileId || !hasCustomAvatar}
                        >
                          Quitar foto
                        </button>
                      </div>
                    </div>

                    {avatarMessage ? (
                      <div className="mt-2 text-xs text-[var(--lv-text-muted)]">{avatarMessage}</div>
                    ) : null}

                    <div className="mt-3 space-y-3 rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
                        Identidad
                      </div>

                      <label className="block">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
                          Nombre
                        </div>
                        <input
                          type="text"
                          value={profileDraftName}
                          onChange={(event) => setProfileDraftName(event.target.value)}
                          placeholder="Como quieres que te llamemos"
                          className="mt-1.5 w-full rounded-[14px] border border-[var(--lv-border)] bg-white px-3 py-2.5 text-sm text-[var(--lv-text)] outline-none transition focus:border-[var(--lv-primary)]"
                          maxLength={80}
                        />
                      </label>

                      <label className="block">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
                          Apellidos
                        </div>
                        <input
                          type="text"
                          value={profileDraftLastName}
                          onChange={(event) => setProfileDraftLastName(event.target.value)}
                          placeholder="Opcional"
                          className="mt-1.5 w-full rounded-[14px] border border-[var(--lv-border)] bg-white px-3 py-2.5 text-sm text-[var(--lv-text)] outline-none transition focus:border-[var(--lv-primary)]"
                          maxLength={120}
                        />
                      </label>

                      <label className="block">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
                          Pronombre
                        </div>
                        <select
                          value={profileDraftPronoun}
                          onChange={(event) => setProfileDraftPronoun(event.target.value)}
                          className="mt-1.5 w-full rounded-[14px] border border-[var(--lv-border)] bg-white px-3 py-2.5 text-sm text-[var(--lv-text)] outline-none transition focus:border-[var(--lv-primary)]"
                        >
                          <option value="">Prefiero no indicarlo</option>
                          <option value="ella">Ella</option>
                          <option value="el">Él</option>
                          <option value="elle">Elle</option>
                        </select>
                      </label>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="lv-btn lv-btn-primary"
                          onClick={() => void handleProfileSave()}
                          disabled={!canSaveProfile || profileSaving}
                        >
                          {profileSaving ? "Guardando..." : "Guardar"}
                        </button>
                        <button
                          type="button"
                          className="lv-btn lv-btn-secondary"
                          onClick={() => {
                            setProfileDraftName(resolvedProfileName);
                            setProfileDraftLastName(resolvedProfileLastName);
                            setProfileDraftPronoun(resolvedProfilePronoun);
                            setProfileMessage(null);
                          }}
                          disabled={profileSaving}
                        >
                          Cancelar
                        </button>
                      </div>

                      {profileMessage ? (
                        <div className="text-xs text-[var(--lv-text-muted)]">{profileMessage}</div>
                      ) : null}
                    </div>
                  </section>
                )}

                <button
                  type="button"
                  className="lv-btn lv-btn-secondary mt-3 w-full justify-start rounded-[16px]"
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                >
                  Cerrar sesion
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 md:mt-4">
        <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
          <button
            className="lv-btn lv-btn-primary w-full md:w-auto"
            onClick={onPlantSeed}
            data-home-tour="plant-seed"
          >
            Plantar semilla
          </button>
          <button className="lv-btn lv-btn-secondary w-full md:w-auto" onClick={onOpenPlans}>
            {PLANS_SURFACE.label}
          </button>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] text-[var(--lv-text-muted)] transition hover:bg-[var(--lv-surface-soft)] disabled:pointer-events-none disabled:opacity-30"
            disabled={!availableYears.length || selectedYear <= availableYears[availableYears.length - 1]}
            onClick={() => onYearChange(selectedYear - 1)}
            aria-label="Año anterior"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M10 3L5 8L10 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <span className="min-w-[3.5rem] text-center text-sm font-semibold tabular-nums text-[var(--lv-text)]">
            {selectedYear}
          </span>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] text-[var(--lv-text-muted)] transition hover:bg-[var(--lv-surface-soft)] disabled:pointer-events-none disabled:opacity-30"
            disabled={!availableYears.length || selectedYear >= availableYears[0]}
            onClick={() => onYearChange(selectedYear + 1)}
            aria-label="Año siguiente"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M6 3L11 8L6 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
