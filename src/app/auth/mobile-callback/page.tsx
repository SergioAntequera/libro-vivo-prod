"use client";

import { useEffect, useMemo, useState } from "react";

function isAllowedMobileRedirect(value: string | null) {
  if (!value) return false;
  return (
    value.startsWith("exp://") ||
    value.startsWith("exps://") ||
    value.startsWith("librovivomobile://")
  );
}

function buildMobileRedirectUrl(currentHref: string) {
  const currentUrl = new URL(currentHref);
  const mobileRedirectTo = currentUrl.searchParams.get("mobile_redirect_to");

  if (!isAllowedMobileRedirect(mobileRedirectTo)) {
    return null;
  }

  const targetUrl = new URL(mobileRedirectTo as string);

  currentUrl.searchParams.forEach((value, key) => {
    if (key !== "mobile_redirect_to") {
      targetUrl.searchParams.set(key, value);
    }
  });

  if (currentUrl.hash) {
    targetUrl.hash = currentUrl.hash.replace(/^#/, "");
  }

  return targetUrl.toString();
}

export default function MobileAuthCallbackPage() {
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const title = useMemo(
    () => (failed ? "No pudimos volver a la app" : "Volviendo a Libro Vivo"),
    [failed],
  );

  useEffect(() => {
    const nextUrl = buildMobileRedirectUrl(window.location.href);
    setFallbackUrl(nextUrl);

    if (!nextUrl) {
      setFailed(true);
      return;
    }

    window.location.replace(nextUrl);
  }, []);

  return (
    <main className="lv-page flex min-h-screen items-center justify-center px-6 py-10">
      <section className="w-full max-w-md rounded-[28px] border border-[var(--lv-border)] bg-white/90 p-6 text-center shadow-[0_22px_70px_rgba(30,52,38,0.12)]">
        <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-2 border-[#2f5f44]/20 border-t-[#2f5f44]" />
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--lv-text)]">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--lv-text-muted)]">
          Estamos cerrando el acceso con Google y devolviendo la sesion a la app movil.
        </p>
        {fallbackUrl ? (
          <a
            className="lv-btn lv-btn-primary mt-6 min-h-11 w-full rounded-[18px] text-white"
            href={fallbackUrl}
          >
            Volver a la app
          </a>
        ) : null}
      </section>
    </main>
  );
}
