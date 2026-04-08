"use client";

import type { RefObject } from "react";
import {
  CanvasEditor,
  type CanvasPhotoUploadState,
  type CanvasEditorHandle,
  type CanvasVideoUploadState,
} from "@/components/canvas/CanvasEditor";
import { UploadTaskCenter, type UploadTaskChannel } from "@/components/ui/UploadTaskCenter";
import type { CanvasObject } from "@/lib/canvasTypes";

type PageDetailCanvasSectionProps = {
  pageId: string;
  activeGardenId: string | null;
  canvasRef: RefObject<CanvasEditorHandle | null>;
  objects: CanvasObject[];
  readOnly?: boolean;
  onObjectsChange: (next: CanvasObject[]) => void;
  onPhotoUploadStateChange: (state: CanvasPhotoUploadState | null) => void;
  onVideoUploadStateChange: (state: CanvasVideoUploadState | null) => void;
  uploadTaskChannels: UploadTaskChannel[];
  coverPhotoUrl: string | null;
  onPointerStateChange?: (pointer: { x: number; y: number } | null) => void;
  remotePointers?: Array<{
    userId: string;
    name: string;
    x: number;
    y: number;
    color: string;
  }>;
};

export function PageDetailCanvasSection(props: PageDetailCanvasSectionProps) {
  const {
    pageId,
    activeGardenId,
    canvasRef,
    objects,
    readOnly = false,
    onObjectsChange,
    onPhotoUploadStateChange,
    onVideoUploadStateChange,
    uploadTaskChannels,
    coverPhotoUrl,
    onPointerStateChange,
    remotePointers = [],
  } = props;

  return (
    <section className="lv-card space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
            {readOnly ? "Recuerdo compartido" : "Lienzo"}
          </div>
          <h2 className="mt-1 text-lg font-semibold text-[var(--lv-text)]">
            {readOnly ? "Así se ve la flor ahora mismo" : "Composicion del recuerdo"}
          </h2>
          <p className="mt-1 text-sm text-[var(--lv-text-muted)]">
            {readOnly
              ? "Aquí lees el recuerdo tal y como esta hoy. Entra en editar solo cuando quieras tocar algo."
              : "Aquí vive la parte visual. Texto, fotos, stickers y plantillas quedan juntos para que el recuerdo respire mejor."}
          </p>
        </div>
      </div>

      {!readOnly ? <UploadTaskCenter channels={uploadTaskChannels} /> : null}

      <CanvasEditor
        ref={canvasRef}
        pageId={pageId}
        activeGardenId={activeGardenId}
        value={objects}
        onChange={onObjectsChange}
        coverPhotoUrl={coverPhotoUrl}
        readOnly={readOnly}
        showVideoUploadPanel={false}
        onPhotoUploadStateChange={onPhotoUploadStateChange}
        onVideoUploadStateChange={onVideoUploadStateChange}
        onPointerStateChange={onPointerStateChange}
        remotePointers={remotePointers}
      />
    </section>
  );
}
