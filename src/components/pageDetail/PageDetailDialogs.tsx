"use client";

import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { PromptModal } from "@/components/ui/PromptModal";
import { PageYearHighlightReplaceModal } from "@/components/pageDetail/PageYearHighlightReplaceModal";

type YearHighlightDialogItem = {
  id: string;
  title: string | null;
  date: string;
  coverPhotoUrl: string | null;
  thumbnailUrl: string | null;
};

type PageDetailDialogsProps = {
  showExternalAudioModal: boolean;
  externalAudioDraft: string;
  uploadingAudio: boolean;
  onExternalAudioDraftChange: (value: string) => void;
  onSubmitExternalAudioUrl: () => void;
  onCloseExternalAudioModal: () => void;
  showDeleteConfirmModal: boolean;
  deletingPage: boolean;
  onConfirmDelete: () => void;
  onCloseDeleteConfirm: () => void;
  showUnsavedLeaveModal: boolean;
  leavingWithoutSaving: boolean;
  onConfirmLeaveWithoutSaving: () => void;
  onCloseUnsavedLeaveModal: () => void;
  showYearHighlightReplaceModal: boolean;
  yearHighlightYear: number | null;
  yearHighlightTargetTitle: string;
  yearHighlightTargetDate: string;
  yearHighlightItems: YearHighlightDialogItem[];
  updatingYearHighlight: boolean;
  onReplaceYearHighlight: (pageId: string) => void;
  onCloseYearHighlightReplaceModal: () => void;
};

export function PageDetailDialogs(props: PageDetailDialogsProps) {
  const {
    showExternalAudioModal,
    externalAudioDraft,
    uploadingAudio,
    onExternalAudioDraftChange,
    onSubmitExternalAudioUrl,
    onCloseExternalAudioModal,
    showDeleteConfirmModal,
    deletingPage,
    onConfirmDelete,
    onCloseDeleteConfirm,
    showUnsavedLeaveModal,
    leavingWithoutSaving,
    onConfirmLeaveWithoutSaving,
    onCloseUnsavedLeaveModal,
    showYearHighlightReplaceModal,
    yearHighlightYear,
    yearHighlightTargetTitle,
    yearHighlightTargetDate,
    yearHighlightItems,
    updatingYearHighlight,
    onReplaceYearHighlight,
    onCloseYearHighlightReplaceModal,
  } = props;

  return (
    <>
      <PromptModal
        open={showExternalAudioModal}
        title="Enlazar audio externo"
        description="Pega una URL pública de audio (https://...). Si lo dejas vacío se quitara el audio actual."
        placeholder="https://..."
        value={externalAudioDraft}
        confirmLabel="Guardar URL"
        busy={uploadingAudio}
        onValueChange={onExternalAudioDraftChange}
        onConfirm={onSubmitExternalAudioUrl}
        onCancel={onCloseExternalAudioModal}
      />

      <ConfirmModal
        open={showDeleteConfirmModal}
        title="Borrar página"
        description="Esta acción elimina la página del diario y no se puede deshacer."
        confirmLabel="Si, borrar"
        cancelLabel="Cancelar"
        tone="danger"
        busy={deletingPage}
        onConfirm={onConfirmDelete}
        onCancel={onCloseDeleteConfirm}
      />

      <ConfirmModal
        open={showUnsavedLeaveModal}
        title="Salir sin guardar"
        description="Se perderán los cambios locales de esta página. La media subida a Drive y aún no guardada se limpiará antes de salir."
        confirmLabel="Salir sin guardar"
        cancelLabel="Seguir editando"
        busy={leavingWithoutSaving}
        onConfirm={onConfirmLeaveWithoutSaving}
        onCancel={onCloseUnsavedLeaveModal}
      />

      <PageYearHighlightReplaceModal
        open={showYearHighlightReplaceModal}
        year={yearHighlightYear}
        currentPageTitle={yearHighlightTargetTitle}
        currentPageDate={yearHighlightTargetDate}
        highlights={yearHighlightItems}
        busy={updatingYearHighlight}
        onReplace={onReplaceYearHighlight}
        onCancel={onCloseYearHighlightReplaceModal}
      />
    </>
  );
}
