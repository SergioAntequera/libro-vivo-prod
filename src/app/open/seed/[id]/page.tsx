"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

function getSeedId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function OpenSeedPlanPage() {
  const params = useParams<{ id?: string | string[] }>();
  const seedId = getSeedId(params.id);
  const [triedOpen, setTriedOpen] = useState(false);

  const appUrl = useMemo(() => {
    if (!seedId) return "librovivomobile:///";
    return `librovivomobile:///seed/${encodeURIComponent(seedId)}`;
  }, [seedId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.location.href = appUrl;
      setTriedOpen(true);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [appUrl]);

  return (
    <main className="min-h-screen bg-[#fbf6ea] px-5 py-10 text-[#1f3a28]">
      <section className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center text-center">
        <img
          src="/share/email/ready-plan-envelope-seed-transparent.png"
          alt=""
          className="mb-4 w-full max-w-[300px]"
        />
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#6f7450]">
          Libro Vivo
        </p>
        <h1 className="mb-3 font-serif text-4xl leading-tight">Abriendo tu plan</h1>
        <p className="mb-8 text-sm leading-6 text-[#627257]">
          Si tienes la app instalada, el plan se abrira automaticamente.
        </p>
        <a
          href={appUrl}
          className="w-full rounded-2xl bg-[#516046] px-6 py-4 text-sm font-semibold text-[#fbf6ed] shadow-[0_16px_32px_rgba(51,65,47,0.18)]"
        >
          Abrir en la app
        </a>
        {triedOpen ? (
          <p className="mt-5 text-xs leading-5 text-[#627257]">
            Si no se ha abierto, toca el boton de nuevo. Mas adelante aqui mostraremos la descarga.
          </p>
        ) : null}
      </section>
    </main>
  );
}
