"use client";

import { useState } from "react";
import type { RefObject } from "react";
import { VideoUploadQueuePanel } from "@/components/canvas/VideoUploadQueuePanel";
import type { CanvasTemplateConfig } from "@/lib/canvasCatalog";

type LibraryPanel = "none" | "stickers" | "templates";
type SelectedKind = "none" | "sticker" | "text" | "photo" | "video";

type VideoUploadPanelState = {
  uploading: boolean;
  uploadPercent: number;
  uploadLoaded: number;
  uploadTotal: number;
  uploadEtaMs: number | null;
  activeFileName: string | null;
  queueLength: number;
  failedFileName: string | null;
  errorMessage: string | null;
  infoMessage: string | null;
  statusLabel?: string | null;
  onCancel: () => void;
  onRetry: () => void;
  onClear: () => void;
};

type CanvasEditorToolbarProps = {
  addText: () => void;
  addPhoto: () => void;
  showPhotoButton?: boolean;
  activeLibraryPanel: LibraryPanel;
  onToggleLibraryPanel: (panel: Exclude<LibraryPanel, "none">) => void;
  onCloseLibraryPanel: () => void;
  availableStickers: string[];
  templatePresets: CanvasTemplateConfig[];
  showGrid: boolean;
  onToggleGrid: () => void;
  snapEnabled: boolean;
  onToggleSnap: () => void;
  snapToObjectsEnabled: boolean;
  onToggleSnapObjects: () => void;
  onResetView: () => void;
  onUndo: () => void;
  onRedo: () => void;
  stickerQuery: string;
  onStickerQueryChange: (next: string) => void;
  filteredStickerSources: string[];
  onAddSticker: (src: string) => void;
  onAddTemplate: (template: CanvasTemplateConfig) => void;
  selectionCount: number;
  selectedUnlockedCount: number;
  selectedLockedCount: number;
  hasEditableSelection: boolean;
  multiSelected: boolean;
  lockActionLabel: string;
  canToggleLockSelection: boolean;
  onDuplicateSelection: () => void;
  onBringToFrontSelection: () => void;
  onBringForwardSelection: () => void;
  onSendBackwardSelection: () => void;
  onSendToBackSelection: () => void;
  onToggleLockSelection: () => void;
  onRemoveSelection: () => void;
  photoFileInputRef: RefObject<HTMLInputElement | null>;
  videoFileInputRef: RefObject<HTMLInputElement | null>;
  onPhotoFileSelected: (file: File) => void | Promise<void>;
  onVideoFilesSelected: (files: File[]) => void;
  selectedObjectType: SelectedKind;
  selectedObjectLocked: boolean;
  canUploadPhoto: boolean;
  uploadingPhoto: boolean;
  uploadingVideo: boolean;
  onRequestPhotoUpload: () => void;
  onRequestVideoUpload: () => void;
  onOpenExternalVideoUrl: () => void;
  showVideoUploadPanel: boolean;
  videoUploadState: VideoUploadPanelState;
  selectedPhotoSrc: string | null;
  selectedPhotoWashi: string;
  selectedPhotoStamp: string;
  onClearSelectedPhoto: () => void;
  onToggleSelectedPhotoWashi: () => void;
  onCycleSelectedPhotoStamp: () => void;
  selectedVideoSrc: string | null;
  isSelectedVideoPlaying: boolean;
  onToggleSelectedVideoPlayback: () => void;
  onClearSelectedVideo: () => void;
};

export function CanvasEditorToolbar(props: CanvasEditorToolbarProps) {
  const {
    addText,
    addPhoto,
    showPhotoButton = true,
    activeLibraryPanel,
    onToggleLibraryPanel,
    onCloseLibraryPanel,
    availableStickers,
    templatePresets,
    showGrid,
    onToggleGrid,
    snapEnabled,
    onToggleSnap,
    snapToObjectsEnabled,
    onToggleSnapObjects,
    onResetView,
    onUndo,
    onRedo,
    stickerQuery,
    onStickerQueryChange,
    filteredStickerSources,
    onAddSticker,
    onAddTemplate,
    selectionCount,
    selectedUnlockedCount,
    selectedLockedCount,
    hasEditableSelection,
    multiSelected,
    lockActionLabel,
    canToggleLockSelection,
    onDuplicateSelection,
    onBringToFrontSelection,
    onBringForwardSelection,
    onSendBackwardSelection,
    onSendToBackSelection,
    onToggleLockSelection,
    onRemoveSelection,
    photoFileInputRef,
    videoFileInputRef,
    onPhotoFileSelected,
    onVideoFilesSelected,
    selectedObjectType,
    selectedObjectLocked,
    canUploadPhoto,
    uploadingPhoto,
    uploadingVideo,
    onRequestPhotoUpload,
    onRequestVideoUpload,
    onOpenExternalVideoUrl,
    showVideoUploadPanel,
    videoUploadState,
    selectedPhotoSrc,
    selectedPhotoWashi,
    selectedPhotoStamp,
    onClearSelectedPhoto,
    onToggleSelectedPhotoWashi,
    onCycleSelectedPhotoStamp,
    selectedVideoSrc,
    isSelectedVideoPlaying,
    onToggleSelectedVideoPlayback,
    onClearSelectedVideo,
  } = props;

  const canUploadPhotoToFrame =
    selectedObjectType === "photo" && !selectedObjectLocked && canUploadPhoto;
  const canUploadVideoToFrame =
    selectedObjectType === "video" && !selectedObjectLocked && canUploadPhoto;
  const canSetExternalVideoUrl =
    selectedObjectType === "video" && !selectedObjectLocked;
  const [showViewTools, setShowViewTools] = useState(false);
  const [showSelectionTools, setShowSelectionTools] = useState(false);

  return (
    <div className="rounded-3xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-4 shadow-[var(--lv-shadow-sm)] space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={addText}
          className="px-4 py-2 rounded-2xl border border-[var(--lv-info)] bg-[var(--lv-info-soft)] hover:shadow-[var(--lv-shadow-sm)] transition text-sm font-medium text-[var(--lv-info)]"
        >
          + Texto
        </button>

        {showPhotoButton ? (
          <button
            type="button"
            onClick={addPhoto}
            className="px-4 py-2 rounded-2xl border border-[var(--lv-success)] bg-[var(--lv-success-soft)] hover:shadow-[var(--lv-shadow-sm)] transition text-sm font-medium text-[var(--lv-success)]"
          >
            + Foto
          </button>
        ) : null}

        <button
          type="button"
          className={`px-4 py-2 rounded-2xl border text-sm font-medium ${
            activeLibraryPanel === "stickers"
              ? "border-[var(--lv-warning)] bg-[var(--lv-warning-soft)] text-[var(--lv-warning)]"
              : "border-[var(--lv-border)] bg-[var(--lv-surface)] text-[var(--lv-text)]"
          }`}
          onClick={() => onToggleLibraryPanel("stickers")}
        >
          Stickers ({availableStickers.length})
        </button>

        <button
          type="button"
          className={`px-4 py-2 rounded-2xl border text-sm font-medium ${
            activeLibraryPanel === "templates"
              ? "border-[var(--lv-warning)] bg-[var(--lv-warning-soft)] text-[var(--lv-warning)]"
              : "border-[var(--lv-border)] bg-[var(--lv-surface)] text-[var(--lv-text)]"
          }`}
          onClick={() => onToggleLibraryPanel("templates")}
        >
          Plantillas ({templatePresets.length})
        </button>

        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            className="px-4 py-2 rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] text-sm text-[var(--lv-text)]"
            onClick={onUndo}
          >
            Undo
          </button>

          <button
            type="button"
            className="px-4 py-2 rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] text-sm text-[var(--lv-text)]"
            onClick={onRedo}
          >
            Redo
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          className={`rounded-2xl border px-4 py-2 text-sm ${
            showViewTools
              ? "border-[var(--lv-info)] bg-[var(--lv-info-soft)] text-[var(--lv-info)]"
              : "border-[var(--lv-border)] bg-[var(--lv-surface)] text-[var(--lv-text)]"
          }`}
          onClick={() => setShowViewTools((prev) => !prev)}
        >
          Ver y ajustar
        </button>
        {selectionCount > 0 ? (
          <button
            type="button"
            className={`rounded-2xl border px-4 py-2 text-sm ${
              showSelectionTools
                ? "border-[var(--lv-warning)] bg-[var(--lv-warning-soft)] text-[var(--lv-warning)]"
                : "border-[var(--lv-border)] bg-[var(--lv-surface)] text-[var(--lv-text)]"
            }`}
            onClick={() => setShowSelectionTools((prev) => !prev)}
          >
            Seleccion ({selectionCount})
          </button>
        ) : null}
        <div className="text-xs opacity-60">
          {selectionCount > 0
            ? `Editables ${selectedUnlockedCount} / bloqueados ${selectedLockedCount}`
            : "Elige un objeto para organizarlo mejor."}
        </div>
      </div>

      {showViewTools ? (
        <div className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-3 space-y-3">
          <div className="text-sm font-medium">Vista del lienzo</div>
          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              className={`px-4 py-2 rounded-2xl border text-sm ${
                showGrid
                  ? "border-[var(--lv-info)] bg-[var(--lv-info-soft)] text-[var(--lv-info)]"
                  : "border-[var(--lv-border)] bg-[var(--lv-surface)] text-[var(--lv-text)]"
              }`}
              onClick={onToggleGrid}
            >
              {showGrid ? "Rejilla: ON" : "Rejilla: OFF"}
            </button>

            <button
              type="button"
              className={`px-4 py-2 rounded-2xl border text-sm ${
                snapEnabled
                  ? "border-[var(--lv-warning)] bg-[var(--lv-warning-soft)] text-[var(--lv-warning)]"
                  : "border-[var(--lv-border)] bg-[var(--lv-surface)] text-[var(--lv-text)]"
              }`}
              onClick={onToggleSnap}
            >
              {snapEnabled ? "Snap: ON" : "Snap: OFF"}
            </button>

            <button
              type="button"
              className={`px-4 py-2 rounded-2xl border text-sm ${
                snapToObjectsEnabled
                  ? "border-[var(--lv-success)] bg-[var(--lv-success-soft)] text-[var(--lv-success)]"
                  : "border-[var(--lv-border)] bg-[var(--lv-surface)] text-[var(--lv-text)]"
              }`}
              onClick={onToggleSnapObjects}
            >
              {snapToObjectsEnabled ? "Snap objetos: ON" : "Snap objetos: OFF"}
            </button>

            <button
              type="button"
              className="px-4 py-2 rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] text-sm text-[var(--lv-text)]"
              onClick={onResetView}
              title="Reset vista (Ctrl/Cmd+0)"
            >
              Reset vista
            </button>
          </div>
          <div className="text-xs opacity-60">
            Zoom: rueda. Pan: Space + arrastrar. Multi: Shift + click. Seleccion libre: arrastra en vacio.
          </div>
        </div>
      ) : null}

      {activeLibraryPanel === "stickers" && (
        <div className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-medium">Biblioteca de stickers</div>
            <button
              type="button"
              className="rounded-xl border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-1 text-xs text-[var(--lv-text)]"
              onClick={onCloseLibraryPanel}
            >
              Cerrar
            </button>
          </div>
          <input
            className="w-full rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-2 text-sm text-[var(--lv-text)]"
            placeholder="Buscar sticker por nombre de archivo..."
            value={stickerQuery}
            onChange={(event) => onStickerQueryChange(event.target.value)}
          />
          <div className="max-h-52 overflow-auto pr-1">
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {filteredStickerSources.map((src) => {
                const fileName =
                  src.split("/").pop()?.replace(/\.[a-z0-9]+$/i, "") ?? "sticker";
                return (
                  <button
                    key={src}
                    type="button"
                    onClick={() => onAddSticker(src)}
                    className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-2 hover:shadow-[var(--lv-shadow-sm)] transition"
                    title={`Añadir ${fileName}`}
                  >
                    <img src={src} alt={fileName} className="w-10 h-10 mx-auto" />
                  </button>
                );
              })}
              {!filteredStickerSources.length && (
                <div className="col-span-full text-sm opacity-70 p-2">
                  No hay stickers para esa busqueda.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeLibraryPanel === "templates" && (
        <div className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-medium">Biblioteca de plantillas</div>
            <button
              type="button"
              className="rounded-xl border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-1 text-xs text-[var(--lv-text)]"
              onClick={onCloseLibraryPanel}
            >
              Cerrar
            </button>
          </div>
          <div className="max-h-52 overflow-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {templatePresets.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => onAddTemplate(template)}
                  className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-3 text-left hover:shadow-[var(--lv-shadow-sm)] transition"
                  title={template.description ?? `Plantilla: ${template.label}`}
                >
                  <div className="font-medium">{template.label}</div>
                  <div className="text-xs opacity-70 mt-1">
                    {template.description ?? "Sin descripción"}
                  </div>
                </button>
              ))}
              {!templatePresets.length && (
                <div className="text-sm opacity-70 p-2">No hay plantillas disponibles.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectionCount > 0 && showSelectionTools ? (
        <div className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-3 space-y-3">
          <div className="text-sm font-medium">Organizar selección</div>
          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              className={`rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-2 text-sm text-[var(--lv-text)] ${
                hasEditableSelection ? "" : "opacity-50"
              }`}
              onClick={onDuplicateSelection}
              disabled={!hasEditableSelection}
            >
              Duplicar
            </button>

            <button
              type="button"
              className={`rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-2 text-sm text-[var(--lv-text)] ${
                hasEditableSelection ? "" : "opacity-50"
              }`}
              onClick={onBringToFrontSelection}
              disabled={!hasEditableSelection}
            >
              Al frente
            </button>

            <button
              type="button"
              className={`rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-2 text-sm text-[var(--lv-text)] ${
                hasEditableSelection ? "" : "opacity-50"
              }`}
              onClick={onBringForwardSelection}
              disabled={!hasEditableSelection}
            >
              Subir capa
            </button>

            <button
              type="button"
              className={`rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-2 text-sm text-[var(--lv-text)] ${
                hasEditableSelection ? "" : "opacity-50"
              }`}
              onClick={onSendBackwardSelection}
              disabled={!hasEditableSelection}
            >
              Bajar capa
            </button>

            <button
              type="button"
              className={`rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-2 text-sm text-[var(--lv-text)] ${
                hasEditableSelection ? "" : "opacity-50"
              }`}
              onClick={onSendToBackSelection}
              disabled={!hasEditableSelection}
            >
              Al fondo
            </button>

            <button
              type="button"
              className={`rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-2 text-sm text-[var(--lv-text)] ${
                canToggleLockSelection ? "" : "opacity-50"
              }`}
              onClick={onToggleLockSelection}
              disabled={!canToggleLockSelection}
            >
              {lockActionLabel}
            </button>

            <button
              type="button"
              className={`rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-2 text-sm text-[var(--lv-text)] ${
                hasEditableSelection ? "" : "opacity-50"
              }`}
              onClick={onRemoveSelection}
              disabled={!hasEditableSelection}
            >
              Borrar editables
            </button>

            {multiSelected && (
              <div className="text-xs opacity-60">
                Multi-transform activo: escala o rota varios objetos a la vez.
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 items-center">
        <input
          ref={photoFileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            await onPhotoFileSelected(file);
            if (photoFileInputRef.current) photoFileInputRef.current.value = "";
          }}
        />

        <input
          ref={videoFileInputRef}
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={(event) => {
            const picked = Array.from(event.target.files ?? []);
            if (!picked.length) return;
            onVideoFilesSelected(picked);
            if (videoFileInputRef.current) videoFileInputRef.current.value = "";
          }}
        />

        <button
          type="button"
          className={`rounded-2xl border px-4 py-2 text-sm ${
            canUploadPhotoToFrame
              ? "border-[var(--lv-success)] bg-[var(--lv-success-soft)] text-[var(--lv-success)]"
              : "border-[var(--lv-border)] bg-[var(--lv-surface)] text-[var(--lv-text-muted)] opacity-50"
          }`}
          onClick={onRequestPhotoUpload}
          disabled={uploadingPhoto || !canUploadPhotoToFrame}
          title={
            canUploadPhoto
              ? "Subir foto al marco"
              : "Guarda la página primero para subir fotos"
          }
        >
          {uploadingPhoto ? "Subiendo foto..." : "Subir foto al marco"}
        </button>

        <button
          type="button"
          className={`rounded-2xl border px-4 py-2 text-sm ${
            canUploadVideoToFrame
              ? "border-[var(--lv-info)] bg-[var(--lv-info-soft)] text-[var(--lv-info)]"
              : "border-[var(--lv-border)] bg-[var(--lv-surface)] text-[var(--lv-text-muted)] opacity-50"
          }`}
          onClick={onRequestVideoUpload}
          disabled={uploadingVideo || !canUploadVideoToFrame}
          title={
            canUploadPhoto
              ? "Subir video al marco"
              : "Guarda la página primero para subir videos"
          }
        >
          Subir video al marco
        </button>

        <button
          type="button"
          className={`rounded-2xl border px-4 py-2 text-sm ${
            canSetExternalVideoUrl
              ? "border-[var(--lv-primary)] bg-[var(--lv-primary-soft)] text-[var(--lv-primary-strong)]"
              : "border-[var(--lv-border)] bg-[var(--lv-surface)] text-[var(--lv-text-muted)] opacity-50"
          }`}
          onClick={onOpenExternalVideoUrl}
          disabled={uploadingVideo || !canSetExternalVideoUrl}
          title="Pegar URL externa de video"
        >
          URL video externa
        </button>

        {showVideoUploadPanel ? (
          <VideoUploadQueuePanel
            uploading={videoUploadState.uploading}
            uploadPercent={videoUploadState.uploadPercent}
            uploadLoaded={videoUploadState.uploadLoaded}
            uploadTotal={videoUploadState.uploadTotal}
            uploadEtaMs={videoUploadState.uploadEtaMs}
            activeFileName={videoUploadState.activeFileName}
            queueLength={videoUploadState.queueLength}
            failedFileName={videoUploadState.failedFileName}
            errorMessage={videoUploadState.errorMessage}
            infoMessage={videoUploadState.infoMessage}
            statusLabel={videoUploadState.statusLabel}
            onCancel={videoUploadState.onCancel}
            onRetry={videoUploadState.onRetry}
            onClear={videoUploadState.onClear}
          />
        ) : null}

        {selectedPhotoSrc ? (
          <>
            <button
              type="button"
              className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-2 text-sm text-[var(--lv-text)]"
              onClick={onClearSelectedPhoto}
            >
              Quitar foto
            </button>

            <button
              type="button"
              className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-2 text-sm text-[var(--lv-text)]"
              onClick={onToggleSelectedPhotoWashi}
            >
              Washi: {selectedPhotoWashi}
            </button>

            <button
              type="button"
              className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-2 text-sm text-[var(--lv-text)]"
              onClick={onCycleSelectedPhotoStamp}
            >
              Sello: {selectedPhotoStamp}
            </button>
          </>
        ) : null}

        {selectedVideoSrc ? (
          <>
            <button
              type="button"
              className="rounded-2xl border border-[var(--lv-info)] bg-[var(--lv-info-soft)] px-4 py-2 text-sm text-[var(--lv-info)]"
              onClick={onToggleSelectedVideoPlayback}
            >
              {isSelectedVideoPlaying ? "Pausar video" : "Reproducir video"}
            </button>

            <button
              type="button"
              className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-2 text-sm text-[var(--lv-text)]"
              onClick={onClearSelectedVideo}
            >
              Quitar video
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
