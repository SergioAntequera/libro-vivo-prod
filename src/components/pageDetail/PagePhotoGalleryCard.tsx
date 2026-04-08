"use client";

import { useMemo, useState } from "react";

type PagePhotoGalleryCardProps = {
  photosInPage: string[];
  coverPhotoUrl: string | null | undefined;
  onClearCover: () => void | Promise<void>;
  onSetCover: (url: string) => void | Promise<void>;
};

export function PagePhotoGalleryCard(props: PagePhotoGalleryCardProps) {
  const { photosInPage, coverPhotoUrl, onClearCover, onSetCover } = props;
  const hasPhotos = photosInPage.length > 0;
  const [isExpanded, setIsExpanded] = useState(hasPhotos);
  const summary = useMemo(() => {
    if (!hasPhotos) return "Todavía no hay fotos metidas en el lienzo.";
    if (coverPhotoUrl) return `${photosInPage.length} foto(s) y portada elegida.`;
    return `${photosInPage.length} foto(s) listas para elegir portada.`;
  }, [coverPhotoUrl, hasPhotos, photosInPage.length]);

  return (
    <section className="lv-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
            Fotos
          </div>
          <div className="mt-1 text-lg font-semibold text-[var(--lv-text)]">
            Portada y galeria
          </div>
          <div className="mt-1 text-sm text-[var(--lv-text-muted)]">{summary}</div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="lv-btn lv-btn-secondary text-sm"
            onClick={() => setIsExpanded((prev) => !prev)}
          >
            {isExpanded ? "Ocultar fotos" : hasPhotos ? "Abrir fotos" : "Ver galeria"}
          </button>
        </div>
      </div>

      {coverPhotoUrl ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-3">
          <div className="text-sm text-[var(--lv-text)]">La portada actual ya esta elegida.</div>
          <button
            className="lv-btn lv-btn-secondary text-sm"
            onClick={() => void onClearCover()}
            title="Quitar portada"
          >
            Quitar portada
          </button>
        </div>
      ) : null}

      {!isExpanded ? null : !hasPhotos ? (
        <div className="lv-card-soft mt-3 p-4 text-sm text-[var(--lv-text-muted)]">
          Anade una foto al lienzo y aparecera aqui para poder usarla como portada.
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photosInPage.map((url) => {
            const isCover = coverPhotoUrl === url;
            return (
              <button
                key={url}
                className={`overflow-hidden rounded-[22px] border bg-[var(--lv-surface)] text-left transition hover:shadow-[var(--lv-shadow-sm)] ${
                  isCover ? "ring-2 ring-black/60" : ""
                }`}
                onClick={() => void onSetCover(url)}
                title={isCover ? "Esta ya es la portada" : "Usar como portada"}
              >
                <img src={url} alt="foto del recuerdo" className="h-32 w-full object-cover" />
                <div className="flex items-center justify-between p-3 text-xs text-[var(--lv-text-muted)]">
                  <span>{isCover ? "Portada actual" : "Usar como portada"}</span>
                  <span className="opacity-60">-&gt;</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
