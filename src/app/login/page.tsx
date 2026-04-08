"use client";

import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getAuthSessionPersistencePreference,
  setAuthSessionPersistence,
  supabase,
} from "@/lib/supabase";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { PRODUCT_DESCRIPTION, PRODUCT_NAME } from "@/lib/productIdentity";
import { getProductSurfaceHref } from "@/lib/productSurfaces";
import { normalizeAuthNextHref } from "@/lib/authRouteConfig";
import {
  configuredOAuthProviders,
  getAuthRedirectUrl,
  isOAuthProviderEnabled,
  type OAuthProvider,
} from "@/lib/authOAuthConfig";

type AuthMode = "login" | "signup" | "recover" | "reset";
type NoticeTone = "info" | "success" | "warning" | "error";

type AuthNotice = {
  message: string;
  tone?: NoticeTone;
};

type AuthField = "email" | "password" | "newPassword" | "newPasswordConfirm";
type FieldErrors = Partial<Record<AuthField, string>>;

type PasswordFieldProps = {
  id: string;
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  revealed: boolean;
  onToggleReveal: () => void;
  autoComplete: string;
  autoFocus?: boolean;
  required?: boolean;
  hint?: string;
  error?: string;
  invalid?: boolean;
  disabled?: boolean;
  onCapsLockChange: (active: boolean) => void;
};

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MODE_COPY: Record<
  AuthMode,
  { eyebrow: string; title: string; subtitle: string; primaryCta: string; loadingCta: string }
> = {
  login: {
    eyebrow: "ACCESO PRIVADO",
    title: "Iniciar sesion",
    subtitle: `Accede a tu espacio privado en ${PRODUCT_NAME}.`,
    primaryCta: "Iniciar sesion",
    loadingCta: "Iniciando sesion...",
  },
  signup: {
    eyebrow: "Nuevo jardin",
    title: "Crear cuenta",
    subtitle: "Crea tu acceso privado para empezar a guardar vuestra historia.",
    primaryCta: "Crear cuenta",
    loadingCta: "Creando cuenta...",
  },
  recover: {
    eyebrow: "Recuperar acceso",
    title: "Recuperar contraseña",
    subtitle: "Te enviaremos un enlace seguro para volver a entrar.",
    primaryCta: "Enviar enlace",
    loadingCta: "Enviando enlace...",
  },
  reset: {
    eyebrow: "Nueva contraseña",
    title: "Define una contraseña nueva",
    subtitle: "Usa una clave nueva para volver a entrar al jardin.",
    primaryCta: "Guardar nueva contraseña",
    loadingCta: "Guardando...",
  },
};

function normalizeAuthError(input: unknown) {
  const raw =
    input instanceof Error
      ? input.message
      : typeof input === "string"
        ? input
        : "Error de autenticacion.";
  const msg = raw.trim();
  const lower = msg.toLowerCase();

  if (lower.includes("invalid login credentials")) {
    return "No hemos podido entrar con esos datos. Revisa email y contraseña.";
  }
  if (lower.includes("email not confirmed")) {
    return "Tu cuenta existe, pero falta confirmar el email.";
  }
  if (lower.includes("user already registered")) {
    return "Ese email ya esta registrado. Prueba a entrar o recuperar la contraseña.";
  }
  if (lower.includes("password should be")) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (
    lower.includes("auth session missing") ||
    lower.includes("session") && lower.includes("missing")
  ) {
    return "El enlace de recuperacion no parece activo o ha expirado. Pide uno nuevo.";
  }
  if (lower.includes("infinite recursion detected in policy")) {
    return "La sesion es valida, pero Supabase no deja preparar el perfil por una politica en bucle.";
  }
  if (lower.includes("row-level security")) {
    return "La sesion es valida, pero no se pudo crear o leer el perfil por RLS.";
  }
  return msg || "Error de autenticacion.";
}

function isEmailNotConfirmedError(input: unknown) {
  const raw = input instanceof Error ? input.message : String(input ?? "");
  return raw.toLowerCase().includes("email not confirmed");
}

function isInvalidLoginCredentialsError(input: unknown) {
  const raw = input instanceof Error ? input.message : String(input ?? "");
  return raw.toLowerCase().includes("invalid login credentials");
}

function isValidEmail(value: string) {
  return EMAIL_PATTERN.test(value.trim());
}

function emailErrorFor(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "Este campo es obligatorio.";
  if (!isValidEmail(trimmed)) return "Introduce un email valido.";
  return undefined;
}

function passwordErrorFor(value: string, mode: AuthMode) {
  if (!value) return "Este campo es obligatorio.";
  if (mode === "signup" && value.length < MIN_PASSWORD_LENGTH) {
    return `Usa al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  return undefined;
}

function modeFromSearch(value: string | null): AuthMode | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "signup") return "signup";
  if (normalized === "recover") return "recover";
  if (normalized === "reset") return "reset";
  if (normalized === "login") return "login";
  return null;
}

function passwordStrengthLabel(value: string) {
  if (!value) return "Minimo 8 caracteres.";
  if (value.length < MIN_PASSWORD_LENGTH) return "Todavia es demasiado corta.";
  const variety =
    Number(/[a-z]/.test(value)) +
    Number(/[A-Z]/.test(value)) +
    Number(/[0-9]/.test(value)) +
    Number(/[^a-zA-Z0-9]/.test(value));
  if (value.length >= 12 && variety >= 3) return "Contraseña fuerte.";
  if (variety >= 2) return "Contraseña correcta; puedes reforzarla con mas variedad.";
  return "Mejor si combinas letras, numeros o simbolos.";
}

function getAuthInputClassName(invalid?: boolean) {
  return [
    "lv-input min-h-12 rounded-[18px] border bg-white px-4 py-3 text-[0.98rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] outline-none transition",
    "placeholder:text-[#8b9688] hover:border-[#83977f] focus:border-[var(--lv-primary)] focus:ring-4 focus:ring-[#2f5f44]/15 disabled:cursor-not-allowed disabled:bg-[#f4f6f2] disabled:text-[#7d887a]",
    invalid
      ? "border-[var(--lv-danger)] focus:border-[var(--lv-danger)] focus:ring-[#b33d3d]/15"
      : "",
  ].join(" ");
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs font-semibold leading-5 text-[var(--lv-danger)]">
      {message}
    </p>
  );
}

function SocialProviderIcon({ provider }: { provider: OAuthProvider }) {
  if (provider === "apple") {
    return (
      <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.45 12.38c-.03-2.45 2-3.63 2.09-3.69-1.14-1.66-2.91-1.89-3.54-1.92-1.51-.15-2.95.89-3.72.89-.77 0-1.96-.87-3.22-.85-1.66.02-3.19.96-4.04 2.45-1.72 2.98-.44 7.39 1.24 9.81.82 1.18 1.8 2.52 3.09 2.47 1.24-.05 1.71-.8 3.21-.8 1.5 0 1.92.8 3.23.78 1.33-.03 2.18-1.21 2.99-2.4.94-1.38 1.33-2.71 1.35-2.78-.03-.01-2.6-.99-2.68-3.96ZM14.01 5.18c.68-.82 1.14-1.96 1.01-3.1-.98.04-2.17.65-2.87 1.47-.63.73-1.18 1.9-1.03 3.02 1.09.08 2.21-.56 2.89-1.39Z" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M21.6 12.23c0-.78-.07-1.53-.2-2.23H12v4.22h5.38c-.23 1.25-.94 2.31-2 3.02v2.51h3.24c1.89-1.74 2.98-4.31 2.98-7.52Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.89 6.62-2.42l-3.24-2.51c-.9.6-2.04.95-3.38.95-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.41 13.9A6.01 6.01 0 0 1 6.1 12c0-.66.11-1.3.31-1.9V7.51H3.07A10 10 0 0 0 2 12c0 1.61.39 3.13 1.07 4.49l3.34-2.59Z" />
      <path fill="#EA4335" d="M12 5.98c1.47 0 2.79.5 3.82 1.49l2.87-2.87C16.95 2.98 14.69 2 12 2a10 10 0 0 0-8.93 5.51l3.34 2.59C7.2 7.74 9.4 5.98 12 5.98Z" />
    </svg>
  );
}

function SocialAuthButton({
  provider,
  label,
  loading,
  disabled,
  onClick,
}: {
  provider: OAuthProvider;
  label: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex min-h-12 w-full items-center justify-center gap-3 rounded-[18px] border border-[#c4d2bd] bg-white px-4 py-3 text-sm font-bold text-[var(--lv-text)] shadow-[0_8px_20px_rgba(30,52,38,0.06)] transition duration-150 hover:-translate-y-0.5 hover:border-[#8fa184] hover:bg-[#fbfdf8] hover:shadow-[0_12px_28px_rgba(30,52,38,0.1)] focus:outline-none focus:ring-4 focus:ring-[#2f5f44]/15 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={disabled}
      onClick={onClick}
      aria-busy={loading}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--lv-primary)]/30 border-t-[var(--lv-primary)]" />
      ) : (
        <SocialProviderIcon provider={provider} />
      )}
      {loading ? "Conectando..." : label}
    </button>
  );
}

function PasswordField({
  id,
  label,
  name,
  value,
  onChange,
  revealed,
  onToggleReveal,
  autoComplete,
  autoFocus,
  required,
  hint,
  error,
  invalid,
  disabled,
  onCapsLockChange,
}: PasswordFieldProps) {
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const descriptionIds = [hint ? helpId : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-[var(--lv-text)]">
          {label}
        </label>
        <button
          type="button"
          className="min-h-9 rounded-full px-2 text-sm font-semibold text-[var(--lv-primary)] underline-offset-4 hover:bg-[var(--lv-primary-soft)] hover:underline focus:outline-none focus:ring-4 focus:ring-[#2f5f44]/15 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onToggleReveal}
          disabled={disabled}
        >
          {revealed ? "Ocultar" : "Mostrar"}
        </button>
      </div>
      <input
        id={id}
        name={name}
        className={getAuthInputClassName(Boolean(invalid || error))}
        type={revealed ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => onCapsLockChange(event.getModifierState("CapsLock"))}
        onKeyUp={(event) => onCapsLockChange(event.getModifierState("CapsLock"))}
        onBlur={() => onCapsLockChange(false)}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        disabled={disabled}
        required={required}
        aria-describedby={descriptionIds || undefined}
        aria-invalid={invalid || error ? true : undefined}
      />
      {hint ? (
        <p id={helpId} className="text-xs leading-5 text-[var(--lv-text-muted)]">
          {hint}
        </p>
      ) : null}
      <FieldError id={errorId} message={error} />
    </div>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialMode = useMemo(
    () => modeFromSearch(searchParams.get("mode")) ?? "login",
    [searchParams],
  );

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [notice, setNotice] = useState<AuthNotice | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [recoverSentTo, setRecoverSentTo] = useState<string | null>(null);
  const [magicLinkSentTo, setMagicLinkSentTo] = useState<string | null>(null);
  const [canResendConfirmation, setCanResendConfirmation] = useState(false);
  const [rememberSession, setRememberSession] = useState(getAuthSessionPersistencePreference);
  const [socialLoadingProvider, setSocialLoadingProvider] = useState<OAuthProvider | null>(null);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showNewPasswordConfirm, setShowNewPasswordConfirm] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);

  const cleanEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const safeNextHref = useMemo(
    () => normalizeAuthNextHref(searchParams.get("next")) ?? null,
    [searchParams],
  );
  const copy = MODE_COPY[mode];
  const isResetRequested = mode === "reset";
  const passwordTooShort =
    mode === "signup" && password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const newPasswordTooShort =
    mode === "reset" && newPassword.length > 0 && newPassword.length < MIN_PASSWORD_LENGTH;
  const resetMismatch =
    mode === "reset" &&
    newPasswordConfirm.length > 0 &&
    newPassword !== newPasswordConfirm;
  const showRecoverySuccess = Boolean(recoverSentTo && mode === "recover");
  const showMagicLinkSuccess = Boolean(magicLinkSentTo && mode === "login");
  const isSubmitting = loading || socialLoadingProvider !== null || magicLinkLoading;
  const showSocialAuth =
    configuredOAuthProviders.length > 0 &&
    (mode === "login" || mode === "signup") &&
    !showRecoverySuccess &&
    !showMagicLinkSuccess;

  useEffect(() => {
    const qpMode = modeFromSearch(searchParams.get("mode"));
    if (qpMode) setMode(qpMode);
  }, [searchParams]);

  useEffect(() => {
    setAuthSessionPersistence(rememberSession);
  }, [rememberSession]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (isResetRequested) return;
      const hash =
        typeof window !== "undefined" ? window.location.hash.toLowerCase() : "";
      if (hash.includes("type=recovery")) return;

      const { data, error } = await supabase.auth.getUser();
      if (cancelled) return;
      if (error || !data.user) return;
      try {
        await finishAuth();
      } catch (profileError) {
        setNotice({ message: normalizeAuthError(profileError), tone: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isResetRequested, router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes("type=recovery")) {
        setMode("reset");
      }
    }

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset");
        setNotice({
          message: "Enlace de recuperacion detectado. Define tu nueva contraseña.",
          tone: "success",
        });
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  function getLoginRedirectUrl(queryMode?: "reset" | "recover") {
    return getAuthRedirectUrl(queryMode, safeNextHref);
  }

  function updateFieldError(field: AuthField, message: string | undefined) {
    setFieldErrors((current) => {
      const next = { ...current };
      if (message) {
        next[field] = message;
      } else {
        delete next[field];
      }
      return next;
    });
  }

  function validateForm() {
    const nextErrors: FieldErrors = {};

    if (mode !== "reset") {
      const emailError = emailErrorFor(cleanEmail);
      if (emailError) nextErrors.email = emailError;
    }

    if (mode === "login" || mode === "signup") {
      const passwordError = passwordErrorFor(password, mode);
      if (passwordError) nextErrors.password = passwordError;
    }

    if (mode === "reset") {
      if (!newPassword) {
        nextErrors.newPassword = "Este campo es obligatorio.";
      } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
        nextErrors.newPassword = `Usa al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
      }

      if (!newPasswordConfirm) {
        nextErrors.newPasswordConfirm = "Este campo es obligatorio.";
      } else if (newPassword !== newPasswordConfirm) {
        nextErrors.newPasswordConfirm = "Las contraseñas no coinciden.";
      }
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setNotice(null);
    setFieldErrors({});
    setRecoverSentTo(null);
    setMagicLinkSentTo(null);
    setCanResendConfirmation(false);
    setCapsLockActive(false);
    const params = new URLSearchParams();
    if (nextMode !== "login") params.set("mode", nextMode);
    if (safeNextHref) params.set("next", safeNextHref);
    const query = params.toString();
    const nextHref = query ? `/login?${query}` : "/login";
    router.replace(nextHref, { scroll: false });
  }

  async function prepareProfileForCurrentSession() {
    const { data, error } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token ?? null;
    if (error || !accessToken) {
      throw new Error("La sesion es valida, pero no se pudo leer el token de acceso.");
    }

    const response = await fetch("/api/auth/profile", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const payload = (await response.json().catch(() => null)) as {
      error?: unknown;
    } | null;

    if (!response.ok) {
      throw new Error(
        typeof payload?.error === "string"
          ? payload.error
          : "No se pudo preparar tu perfil de usuario.",
      );
    }
  }

  async function finishAuth() {
    await prepareProfileForCurrentSession();
    router.replace(safeNextHref ?? getProductSurfaceHref("home"));
  }

  async function handleSocialSignIn(provider: OAuthProvider) {
    setNotice(null);
    setFieldErrors({});
    setCanResendConfirmation(false);

    if (!isOAuthProviderEnabled(provider)) {
      setNotice({
        message:
          "Este proveedor todavia no esta activado. Configuralo en Supabase y habilita su variable publica.",
        tone: "warning",
      });
      return;
    }

    setAuthSessionPersistence(rememberSession);
    setSocialLoadingProvider(provider);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getLoginRedirectUrl(),
          queryParams: provider === "google" ? { prompt: "select_account" } : undefined,
        },
      });
      if (error) throw error;
    } catch (error) {
      setNotice({
        message: `${normalizeAuthError(error)} Si el proveedor no esta activado, revisa OAuth en Supabase.`,
        tone: "error",
      });
      setSocialLoadingProvider(null);
    }
  }

  async function sendMagicLink(targetEmail = cleanEmail) {
    const emailError = emailErrorFor(targetEmail);
    setNotice(null);
    setCanResendConfirmation(false);

    if (emailError) {
      updateFieldError("email", emailError);
      setNotice({ message: "Escribe un email valido para enviarte el enlace.", tone: "warning" });
      return;
    }

    setAuthSessionPersistence(rememberSession);
    setMagicLinkLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: {
          emailRedirectTo: getLoginRedirectUrl(),
          shouldCreateUser: false,
        },
      });
      if (error) throw error;
      setMagicLinkSentTo(targetEmail);
      setFieldErrors({});
      setPassword("");
    } catch (error) {
      setNotice({ message: normalizeAuthError(error), tone: "error" });
    } finally {
      setMagicLinkLoading(false);
    }
  }

  async function handlePrimarySubmit(event: FormEvent) {
    event.preventDefault();
    setNotice(null);
    setCanResendConfirmation(false);

    if (!validateForm()) {
      setNotice({ message: "Revisa los campos marcados antes de continuar.", tone: "warning" });
      return;
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: getLoginRedirectUrl(),
          },
        });
        if (error) throw error;

        if (data.session && data.user) {
          await finishAuth();
          return;
        }

        setNotice({
          message:
            "Si el email es nuevo, te hemos enviado un email de confirmacion. Si ya existia, prueba a entrar o recupera la contrasena.",
          tone: "info",
        });
        setMode("login");
        setFieldErrors({});
        setRecoverSentTo(null);
        setMagicLinkSentTo(null);
        setPassword("");
        {
          const params = new URLSearchParams();
          if (safeNextHref) params.set("next", safeNextHref);
          const nextHref = params.toString() ? `/login?${params.toString()}` : "/login";
          router.replace(nextHref, { scroll: false });
        }
        return;
      }

      if (mode === "recover") {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: getLoginRedirectUrl("reset"),
        });
        if (error) throw error;

        setRecoverSentTo(cleanEmail);
        return;
      }

      if (mode === "reset") {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (error) throw error;

        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          await finishAuth();
          return;
        }

        setNewPassword("");
        setNewPasswordConfirm("");
        setMode("login");
        {
          const params = new URLSearchParams();
          if (safeNextHref) params.set("next", safeNextHref);
          const nextHref = params.toString() ? `/login?${params.toString()}` : "/login";
          router.replace(nextHref, { scroll: false });
        }
        setNotice({
          message: "Contraseña actualizada. Ya puedes entrar.",
          tone: "success",
        });
        return;
      }

      setAuthSessionPersistence(rememberSession);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error) throw error;
      if (data.user) {
        await finishAuth();
      }
    } catch (error) {
      setCanResendConfirmation(isEmailNotConfirmedError(error));
      if (isInvalidLoginCredentialsError(error)) {
        setFieldErrors({
          email: "Revisa este email.",
          password: "El email o la contraseña no coinciden.",
        });
      } else if (isEmailNotConfirmedError(error)) {
        setFieldErrors({ email: "Confirma este email antes de entrar." });
      }
      setNotice({ message: normalizeAuthError(error), tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function resendConfirmationEmail() {
    if (!cleanEmail) {
      setNotice({ message: "Escribe tu email para reenviar la confirmacion.", tone: "warning" });
      return;
    }

    setResending(true);
    setNotice(null);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: cleanEmail,
        options: {
          emailRedirectTo: getLoginRedirectUrl(),
        },
      });
      if (error) throw error;
      setNotice({
        message: "Confirmacion reenviada. Revisa la bandeja principal y spam.",
        tone: "success",
      });
    } catch (error) {
      setNotice({ message: normalizeAuthError(error), tone: "error" });
    } finally {
      setResending(false);
    }
  }

  async function resendRecoveryEmail() {
    if (!cleanEmail && !recoverSentTo) {
      setNotice({ message: "Escribe tu email para reenviar el enlace.", tone: "warning" });
      return;
    }

    setResending(true);
    setNotice(null);
    try {
      const targetEmail = recoverSentTo ?? cleanEmail;
      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: getLoginRedirectUrl("reset"),
      });
      if (error) throw error;
      setRecoverSentTo(targetEmail);
      setNotice({ message: "Enlace reenviado.", tone: "success" });
    } catch (error) {
      setNotice({ message: normalizeAuthError(error), tone: "error" });
    } finally {
      setResending(false);
    }
  }

  async function resendMagicLink() {
    if (!magicLinkSentTo) {
      await sendMagicLink(cleanEmail);
      return;
    }
    await sendMagicLink(magicLinkSentTo);
  }

  const primaryLabel = loading ? copy.loadingCta : copy.primaryCta;

  return (
    <main className="lv-page relative min-h-screen overflow-hidden px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[-12%] top-[-22%] h-80 w-80 rounded-full bg-[#d7ead3]/45 blur-3xl" />
        <div className="absolute bottom-[-18%] right-[-10%] h-96 w-96 rounded-full bg-[#e6d8b8]/45 blur-3xl" />
        <div className="absolute left-[45%] top-[18%] h-52 w-52 rounded-full bg-[#dfe9f6]/45 blur-3xl" />
      </div>

      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center gap-6 lg:grid-cols-[0.78fr_1fr] lg:gap-8">
        <section className="order-2 flex flex-col justify-between rounded-[32px] border border-white/70 bg-white/30 p-5 shadow-[0_18px_60px_rgba(30,52,38,0.07)] backdrop-blur sm:p-6 lg:order-1 lg:min-h-[540px] lg:rounded-[36px] lg:p-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--lv-border)] bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
              Acceso privado
            </div>
            <h1 className="mt-6 max-w-xl text-3xl font-semibold leading-[1.08] tracking-tight text-[var(--lv-text)] sm:text-4xl lg:mt-8 lg:text-[2.7rem]">
              Vuelve al lugar donde sigue vuestra historia.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-[var(--lv-text-muted)]">
              {PRODUCT_DESCRIPTION}
            </p>
          </div>

          <div className="mt-8 rounded-[26px] border border-white/70 bg-white/70 p-5 shadow-[0_14px_36px_rgba(35,56,39,0.09)] lg:mt-0">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
              {PRODUCT_NAME}
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--lv-text-muted)]">
              Un acceso sencillo para seguir escribiendo, recordando y preparando planes, sin ruido
              alrededor.
            </p>
          </div>
        </section>

        <section className="order-1 overflow-hidden rounded-[32px] border border-[#c4d2bd] bg-white/95 shadow-[0_28px_90px_rgba(30,52,38,0.16)] lg:order-2">
          <div className="border-b border-[var(--lv-border)] bg-[linear-gradient(180deg,#ffffff_0%,#f5f8f0_100%)] p-6 sm:p-8">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--lv-text-muted)]">
              {copy.eyebrow}
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--lv-text)] sm:text-[2.35rem]">
              {copy.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--lv-text-muted)]">
              {copy.subtitle}
            </p>
          </div>

          <div className="p-6 sm:p-8">
            {showRecoverySuccess ? (
              <div className="rounded-[28px] border border-[var(--lv-border)] bg-[var(--lv-success-soft)] p-5">
                <div className="text-sm font-semibold text-[var(--lv-success)]">
                  Enlace enviado
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--lv-text-muted)]">
                  Hemos enviado instrucciones a <strong>{recoverSentTo}</strong>. Si no aparece,
                  revisa spam o pide otro enlace.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a className="lv-btn lv-btn-secondary text-sm" href="mailto:">
                    Abrir correo
                  </a>
                  <button
                    type="button"
                    className="text-sm font-semibold text-[var(--lv-primary)] underline-offset-4 hover:underline disabled:opacity-50"
                    onClick={() => void resendRecoveryEmail()}
                    disabled={resending}
                  >
                    {resending ? "Reenviando..." : "Reenviar enlace"}
                  </button>
                  <button
                    type="button"
                    className="text-sm font-semibold text-[var(--lv-primary)] underline-offset-4 hover:underline"
                    onClick={() => {
                      setRecoverSentTo(null);
                      setNotice(null);
                    }}
                  >
                    Usar otro email
                  </button>
                </div>
              </div>
            ) : null}

            {showMagicLinkSuccess ? (
              <div className="rounded-[28px] border border-[var(--lv-border)] bg-[var(--lv-success-soft)] p-5">
                <div className="text-sm font-semibold text-[var(--lv-success)]">
                  Enlace de acceso enviado
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--lv-text-muted)]">
                  Hemos enviado un enlace seguro a <strong>{magicLinkSentTo}</strong>. Si ese email
                  tiene cuenta, podras entrar sin escribir contraseña.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <a className="lv-btn lv-btn-secondary text-sm" href="mailto:">
                    Abrir correo
                  </a>
                  <button
                    type="button"
                    className="text-sm font-semibold text-[var(--lv-primary)] underline-offset-4 hover:underline disabled:opacity-50"
                    onClick={() => void resendMagicLink()}
                    disabled={magicLinkLoading}
                  >
                    {magicLinkLoading ? "Reenviando..." : "Reenviar enlace"}
                  </button>
                  <button
                    type="button"
                    className="text-sm font-semibold text-[var(--lv-primary)] underline-offset-4 hover:underline"
                    onClick={() => {
                      setMagicLinkSentTo(null);
                      setNotice(null);
                    }}
                  >
                    Entrar con contraseña
                  </button>
                </div>
              </div>
            ) : null}

            {mode === "reset" ? (
              <div className="mb-5 rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-info-soft)] p-4 text-sm leading-6 text-[var(--lv-info)]">
                Si el enlace ha expirado, vuelve a pedir uno desde recuperar acceso. Por seguridad,
                no reutilices una contraseña antigua.
              </div>
            ) : null}

            {showSocialAuth ? (
              <div className="mb-6 space-y-4">
                <div
                  className={
                    configuredOAuthProviders.length > 1
                      ? "grid gap-3 sm:grid-cols-2"
                      : "grid gap-3"
                  }
                >
                  {configuredOAuthProviders.map(({ provider, label }) => (
                    <SocialAuthButton
                      key={provider}
                      provider={provider}
                      label={label}
                      loading={socialLoadingProvider === provider}
                      disabled={isSubmitting}
                      onClick={() => void handleSocialSignIn(provider)}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                  <span className="h-px flex-1 bg-[var(--lv-border)]" />
                  o continua con email
                  <span className="h-px flex-1 bg-[var(--lv-border)]" />
                </div>
              </div>
            ) : null}

            {!showRecoverySuccess && !showMagicLinkSuccess ? (
              <form onSubmit={handlePrimarySubmit} className="space-y-5" noValidate>
                {mode !== "reset" ? (
                  <div className="space-y-2">
                    <label htmlFor="auth-email" className="text-sm font-semibold">
                      Email
                    </label>
                    <input
                      id="auth-email"
                      name="email"
                      className={getAuthInputClassName(Boolean(fieldErrors.email))}
                      type="email"
                      value={email}
                      onChange={(event) => {
                        const nextEmail = event.target.value;
                        setEmail(nextEmail);
                        updateFieldError("email", emailErrorFor(nextEmail));
                      }}
                      autoComplete="email"
                      inputMode="email"
                      placeholder="tu@email.com"
                      autoFocus
                      disabled={isSubmitting}
                      required
                      aria-describedby={
                        fieldErrors.email ? "auth-email-error auth-email-help" : "auth-email-help"
                      }
                      aria-invalid={fieldErrors.email ? true : undefined}
                    />
                    <p id="auth-email-help" className="text-xs leading-5 text-[var(--lv-text-muted)]">
                      Usaremos este email solo para identificar tu cuenta y enviar enlaces seguros.
                    </p>
                    <FieldError id="auth-email-error" message={fieldErrors.email} />
                  </div>
                ) : null}

                {mode === "login" || mode === "signup" ? (
                  <PasswordField
                    id="auth-password"
                    label="Contraseña"
                    name="password"
                    value={password}
                    onChange={(value) => {
                      setPassword(value);
                      updateFieldError("password", passwordErrorFor(value, mode));
                    }}
                    revealed={showPassword}
                    onToggleReveal={() => setShowPassword((current) => !current)}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    required
                    hint={
                      mode === "signup"
                        ? passwordStrengthLabel(password)
                        : "Usa la contraseña de tu cuenta."
                    }
                    error={fieldErrors.password}
                    invalid={passwordTooShort}
                    disabled={isSubmitting}
                    onCapsLockChange={setCapsLockActive}
                  />
                ) : null}

                {mode === "login" ? (
                  <div className="rounded-[20px] border border-[var(--lv-border)] bg-[#f8fbf5] p-4">
                    <label className="group flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-[var(--lv-text)]">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[var(--lv-border-strong)] accent-[var(--lv-primary)] transition group-hover:scale-105 focus:outline-none focus:ring-4 focus:ring-[#2f5f44]/15"
                        checked={rememberSession}
                        disabled={isSubmitting}
                        onChange={(event) => setRememberSession(event.target.checked)}
                      />
                      Mantener sesion iniciada
                    </label>
                    <div className="mt-3 grid gap-2 border-t border-[var(--lv-border)] pt-3">
                      <button
                        type="button"
                        className="inline-flex min-h-10 w-fit items-center rounded-full px-1 text-left text-sm font-semibold text-[var(--lv-primary)] underline-offset-4 hover:underline focus:outline-none focus:ring-4 focus:ring-[#2f5f44]/15"
                        onClick={() => switchMode("recover")}
                        disabled={isSubmitting}
                      >
                        Olvidaste tu contraseña?
                      </button>
                      <button
                        type="button"
                        className="inline-flex min-h-10 w-fit items-center rounded-full px-1 text-left text-sm font-semibold text-[var(--lv-primary)] underline-offset-4 hover:underline focus:outline-none focus:ring-4 focus:ring-[#2f5f44]/15 disabled:opacity-50"
                        onClick={() => void sendMagicLink()}
                        disabled={isSubmitting}
                      >
                        {magicLinkLoading ? "Enviando enlace..." : "Entrar con enlace por email"}
                      </button>
                    </div>
                  </div>
                ) : null}

                {mode === "reset" ? (
                  <>
                    <PasswordField
                      id="auth-new-password"
                      label="Nueva contraseña"
                      name="new-password"
                      value={newPassword}
                      onChange={(value) => {
                        setNewPassword(value);
                        updateFieldError(
                          "newPassword",
                          value.length === 0
                            ? "Este campo es obligatorio."
                            : value.length < MIN_PASSWORD_LENGTH
                              ? `Usa al menos ${MIN_PASSWORD_LENGTH} caracteres.`
                              : undefined,
                        );
                      }}
                      revealed={showNewPassword}
                      onToggleReveal={() => setShowNewPassword((current) => !current)}
                      autoComplete="new-password"
                      autoFocus
                      required
                      hint={passwordStrengthLabel(newPassword)}
                      error={fieldErrors.newPassword}
                      invalid={newPasswordTooShort}
                      disabled={isSubmitting}
                      onCapsLockChange={setCapsLockActive}
                    />
                    <PasswordField
                      id="auth-new-password-confirm"
                      label="Repite la nueva contraseña"
                      name="new-password-confirm"
                      value={newPasswordConfirm}
                      onChange={(value) => {
                        setNewPasswordConfirm(value);
                        updateFieldError(
                          "newPasswordConfirm",
                          value.length === 0
                            ? "Este campo es obligatorio."
                            : newPassword !== value
                              ? "Las contraseñas no coinciden."
                              : undefined,
                        );
                      }}
                      revealed={showNewPasswordConfirm}
                      onToggleReveal={() => setShowNewPasswordConfirm((current) => !current)}
                      autoComplete="new-password"
                      required
                      hint={resetMismatch ? "Las contraseñas no coinciden todavia." : undefined}
                      error={fieldErrors.newPasswordConfirm}
                      invalid={resetMismatch}
                      disabled={isSubmitting}
                      onCapsLockChange={setCapsLockActive}
                    />
                  </>
                ) : null}

                {capsLockActive ? (
                  <div className="rounded-[18px] border border-[var(--lv-warning)] bg-[var(--lv-warning-soft)] px-4 py-3 text-sm text-[var(--lv-warning)]">
                    Parece que Bloq Mayus esta activado.
                  </div>
                ) : null}

                <button
                  className="lv-btn lv-btn-primary min-h-12 w-full rounded-[18px] text-base text-white shadow-[0_12px_28px_rgba(47,95,68,0.25)] hover:shadow-[0_16px_34px_rgba(47,95,68,0.3)] focus:outline-none focus:ring-4 focus:ring-[#2f5f44]/20 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                  type="submit"
                  aria-busy={loading}
                >
                  {loading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  ) : null}
                  {primaryLabel}
                </button>
              </form>
            ) : null}

            {notice ? (
              <StatusNotice message={notice.message} tone={notice.tone} className="mt-4" />
            ) : null}

            <div className="mt-6 space-y-3 border-t border-[var(--lv-border)] pt-5 text-sm text-[var(--lv-text-muted)]">
              {mode === "login" ? (
                <p>
                  No tienes cuenta?{" "}
                  <button
                    className="min-h-10 rounded-full px-1 font-semibold text-[var(--lv-primary)] underline-offset-4 hover:underline focus:outline-none focus:ring-4 focus:ring-[#2f5f44]/15"
                    onClick={() => switchMode("signup")}
                    type="button"
                  >
                    Crear una cuenta
                  </button>
                </p>
              ) : null}

              {mode !== "login" ? (
                <p>
                  {mode === "signup" ? "Ya tienes cuenta?" : "Quieres volver al acceso normal?"}{" "}
                  <button
                    className="min-h-10 rounded-full px-1 font-semibold text-[var(--lv-primary)] underline-offset-4 hover:underline focus:outline-none focus:ring-4 focus:ring-[#2f5f44]/15"
                    onClick={() => switchMode("login")}
                    type="button"
                  >
                    Entrar
                  </button>
                </p>
              ) : null}

              {canResendConfirmation ? (
                <button
                  className="min-h-10 rounded-full px-1 font-semibold text-[var(--lv-primary)] underline-offset-4 hover:underline focus:outline-none focus:ring-4 focus:ring-[#2f5f44]/15 disabled:opacity-50"
                  onClick={() => void resendConfirmationEmail()}
                  disabled={resending}
                  type="button"
                >
                  {resending ? "Reenviando confirmacion..." : "Reenviar email de confirmacion"}
                </button>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoadingState message="Cargando acceso..." />}>
      <LoginPageContent />
    </Suspense>
  );
}
