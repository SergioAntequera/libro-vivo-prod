"use client";

import { useCallback, useState } from "react";
import { CanvasEditor } from "@/components/canvas/CanvasEditor";
import type { FutureMomentsCapsuleConfig } from "@/lib/futureMomentsConfig";
import {
  getTimeCapsuleContentBlockDefinition,
  getTimeCapsuleContentBlockMediaUrl,
  type TimeCapsuleRow,
} from "@/lib/timeCapsuleModel";

type TimeCapsuleViewerModalProps = {
  capsule: TimeCapsuleRow | null;
  config: FutureMomentsCapsuleConfig;
  onClose: () => void;
};

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("es-ES");
}

export function TimeCapsuleViewerModal(props: TimeCapsuleViewerModalProps) {
  const { capsule, config, onClose } = props;
  if (!capsule) return null;

  return (
    <TimeCapsuleViewerModalBody
      key={capsule.id}
      capsule={capsule}
      config={config}
      onClose={onClose}
    />
  );
}

function TimeCapsuleViewerModalBody({
  capsule,
  config,
  onClose,
}: {
  capsule: TimeCapsuleRow;
  config: FutureMomentsCapsuleConfig;
  onClose: () => void;
}) {
  const handleCanvasNoop = useCallback(() => {}, []);
  const [sealOpened, setSealOpened] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);
  const totalBlocks = capsule.content_blocks.length;

  const effectiveRevealedCount =
    sealOpened && totalBlocks > 0 ? Math.max(revealedCount, 1) : 0;
  const visibleBlocks = capsule.content_blocks.slice(0, effectiveRevealedCount);
  const allRevealed = totalBlocks === 0 || effectiveRevealedCount >= totalBlocks;
  const revealProgress =
    totalBlocks > 0 ? Math.round((effectiveRevealedCount / totalBlocks) * 100) : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[28px] border bg-[linear-gradient(180deg,#fffdf8_0%,#f7f5ff_100%)] p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="text-xs uppercase tracking-[0.22em] text-slate-500">
              {config.openingEyebrow}
            </div>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900">{capsule.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {config.openingDescription}
            </p>
            <div className="mt-3 text-xs text-slate-500">
              Sellada el {formatDate(capsule.sealed_at)}
              {capsule.opened_at ? ` - Abierta el ${formatDate(capsule.opened_at)}` : null}
            </div>
          </div>
          <button type="button" className="lv-btn lv-btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>

        {!sealOpened ? (
          <section className="lv-capsule-reveal-card mt-5 overflow-hidden rounded-[28px] border border-[#d7c5ad] bg-[linear-gradient(180deg,#fff8ea_0%,#f1e7d6_55%,#e8dbc6_100%)] p-6 shadow-[0_18px_45px_rgba(89,60,26,0.12)]">
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_240px] md:items-center">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{config.openingTitle}</div>
                <div className="mt-2 text-sm leading-7 text-slate-700">
                  Esta capsula se abria el {formatDate(capsule.opens_at)} y guardo {capsule.content_blocks.length} pieza(s) de aquel momento.
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="lv-btn lv-btn-primary"
                    onClick={() => {
                      setSealOpened(true);
                      setRevealedCount(totalBlocks > 0 ? 1 : 0);
                    }}
                  >
                    Romper sello
                  </button>
                  {totalBlocks > 1 ? (
                    <button
                      type="button"
                      className="rounded-full border border-[#ccb89a] bg-white/80 px-4 py-2 text-sm font-medium text-slate-700"
                      onClick={() => {
                        setSealOpened(true);
                        setRevealedCount(totalBlocks);
                      }}
                    >
                      Abrir todo de una vez
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="lv-capsule-reveal-card mx-auto flex w-full max-w-[220px] flex-col items-center rounded-[28px] border border-[#ceb693] bg-[radial-gradient(circle_at_top,#fff9ef_0%,#efdfc7_72%,#dfc39d_100%)] p-5 text-center shadow-[0_16px_35px_rgba(90,58,26,0.16)]">
                <div className="flex h-28 w-28 items-center justify-center rounded-full border border-[#c9b190] bg-[radial-gradient(circle,#fdf7ec_0%,#ecd9bb_75%,#dbbc93_100%)]">
                  <div className="lv-capsule-seal flex h-16 w-16 items-center justify-center rounded-full border border-[#964f3e] text-[11px] font-semibold uppercase tracking-[0.24em] text-[#fff5ec] shadow-[0_8px_18px_rgba(89,33,24,0.25)]">
                    Sello
                  </div>
                </div>
                <div className="mt-4 text-lg font-semibold text-slate-900">{capsule.title}</div>
                <div className="mt-1 text-sm text-slate-600">{totalBlocks} pieza(s) esperando dentro</div>
              </div>
            </div>
          </section>
        ) : (
          <section className="lv-capsule-reveal-card mt-5 rounded-[24px] border border-[#eadfca] bg-[#fffaf0] p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{config.openingTitle}</div>
            <div className="mt-2 text-sm leading-6 text-slate-700">
              Esta capsula se abria el {formatDate(capsule.opens_at)} y guardo {capsule.content_blocks.length} pieza(s) de aquel momento.
            </div>
            {totalBlocks > 0 ? (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    {allRevealed ? "Capsula completa" : `Pieza ${effectiveRevealedCount} de ${totalBlocks}`}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!allRevealed ? (
                      <>
                        <button
                          type="button"
                          className="lv-btn lv-btn-secondary"
                          onClick={() => setRevealedCount((current) => Math.min(totalBlocks, current + 1))}
                        >
                          Descubrir siguiente pieza
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-[#d8cfbe] bg-white px-3 py-1.5 text-xs font-medium text-slate-600"
                          onClick={() => setRevealedCount(totalBlocks)}
                        >
                          Verlas todas
                        </button>
                      </>
                    ) : totalBlocks > 1 ? (
                      <button
                        type="button"
                        className="rounded-full border border-[#d8cfbe] bg-white px-3 py-1.5 text-xs font-medium text-slate-600"
                        onClick={() => setRevealedCount(1)}
                      >
                        Volver a abrir despacio
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#efe7db]">
                  <div
                    className="h-full rounded-full bg-[#8d6d43] transition-all"
                    style={{ width: `${Math.max(8, revealProgress)}%` }}
                  />
                </div>
                <p className="text-sm leading-6 text-slate-600">
                  {allRevealed ? "Ya habeis recuperado todas las piezas." : "El tiempo os la va devolviendo pieza a pieza."}
                </p>
              </div>
            ) : null}
          </section>
        )}

        <div className="mt-5 space-y-4">
          {visibleBlocks.map((block, idx) => {
            const definition = getTimeCapsuleContentBlockDefinition(block.kind);
            const mediaUrl = getTimeCapsuleContentBlockMediaUrl(block);
            const canvasObjects = Array.isArray(block.canvasObjects) ? block.canvasObjects : [];
            const shouldRenderTextValue =
              (block.kind !== "photo_url" &&
                block.kind !== "audio_url" &&
                block.kind !== "video_url" &&
                block.kind !== "canvas_note") ||
              (block.kind === "canvas_note" && canvasObjects.length === 0 && block.value.trim());
            return (
              <section
                key={`${capsule.id}:${idx}`}
                className="lv-capsule-reveal-card rounded-[24px] border border-[#e7dfd2] bg-white/90 p-5 shadow-sm transition duration-300"
                style={{
                  opacity: 1,
                  transform: "translateY(0)",
                }}
              >
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  {definition.label}
                </div>
                {block.kind === "photo_url" && mediaUrl ? (
                  <div className="mt-4 space-y-3">
                    <img
                      src={mediaUrl}
                      alt={block.caption ?? capsule.title}
                      className="max-h-[28rem] w-full rounded-[24px] object-cover"
                    />
                    {block.caption ? <p className="text-sm text-slate-600">{block.caption}</p> : null}
                  </div>
                ) : null}

                {block.kind === "audio_url" && mediaUrl ? (
                  <div className="mt-4 space-y-3">
                    <audio controls src={mediaUrl} className="w-full" />
                    {block.caption ? <p className="text-sm text-slate-600">{block.caption}</p> : null}
                  </div>
                ) : null}

                {block.kind === "video_url" && mediaUrl ? (
                  <div className="mt-4 space-y-3">
                    <video controls src={mediaUrl} className="max-h-[28rem] w-full rounded-[24px]" />
                    {block.caption ? <p className="text-sm text-slate-600">{block.caption}</p> : null}
                  </div>
                ) : null}

                {block.kind === "canvas_note" && canvasObjects.length > 0 ? (
                  <div className="mt-4 rounded-[24px] border border-[#e9e3f1] bg-[#fcfaff] p-3">
                    <CanvasEditor
                      value={canvasObjects}
                      onChange={handleCanvasNoop}
                      readOnly
                      showVideoUploadPanel={false}
                      showPhotoTool={false}
                    />
                    {block.value.trim() ? (
                      <p className="mt-3 text-sm leading-6 text-slate-600">{block.value}</p>
                    ) : null}
                  </div>
                ) : null}

                {shouldRenderTextValue ? (
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                    {block.value}
                  </p>
                ) : null}
              </section>
            );
          })}

          {capsule.content_blocks.length === 0 ? (
            <p className="text-sm text-slate-400">Esta capsula no tiene contenido visible.</p>
          ) : null}

          {sealOpened && allRevealed && capsule.content_blocks.length > 0 ? (
            <section className="rounded-[24px] border border-[#d9cfbf] bg-[linear-gradient(180deg,#fff7ec_0%,#f5efe6_100%)] p-5 shadow-sm">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Cierre de apertura</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">La capsula ya os ha devuelto todo lo que guardaba</div>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Ahora esta pieza pasa a formar parte de vuestra historia visible. Si quereis, podeis volver a abrirla despacio para revivir el orden en el que os la devolvio.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {capsule.content_blocks.length > 1 ? (
                  <button
                    type="button"
                    className="lv-btn lv-btn-secondary"
                    onClick={() => setRevealedCount(1)}
                  >
                    Repetir apertura lenta
                  </button>
                ) : null}
                <button type="button" className="lv-btn lv-btn-primary" onClick={onClose}>
                  Cerrar capsula
                </button>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
