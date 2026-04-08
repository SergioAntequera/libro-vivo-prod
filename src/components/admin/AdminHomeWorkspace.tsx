import type { ReactNode } from "react";
import {
  AdminInlineNote,
  AdminPanel,
  AdminToggleGroup,
  AdminWorkspace,
} from "@/components/admin/AdminWorkspace";

export type AdminHomePack = {
  code: string;
  label: string;
  description: string;
  previewAsset: string;
  tags: string[];
  scene: Record<string, string>;
  flowers: Record<string, string>;
  trees: Record<string, string>;
};

export type AdminHomePreviewTokens = {
  previewBg: string;
  sampleSeed: string;
  sampleFlower: string;
  sampleTree: string;
  sampleSeedBg: string;
  sampleFlowerBg: string;
  sampleTreeBg: string;
};

export type AdminHomeAssetField = {
  id: string;
  label: string;
  path: string;
};

type HomeView = "preview" | "scene" | "validate" | "advanced";

type Props = {
  message: ReactNode;
  view: HomeView;
  onViewChange: (value: HomeView) => void;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  styleFilter: string;
  onStyleFilterChange: (value: string) => void;
  styleOptions: string[];
  seasonFilter: string;
  onSeasonFilterChange: (value: string) => void;
  seasonOptions: string[];
  filteredPacks: AdminHomePack[];
  selectedPackCode: string;
  onSelectPack: (code: string) => void;
  workingPack: AdminHomePack | null;
  previewTokens: AdminHomePreviewTokens | null;
  validationSummaryText: string;
  lastValidatedAt: string | null;
  invalidAssetFields: AdminHomeAssetField[];
  validatingAssets: boolean;
  applying: boolean;
  duplicateApplying: boolean;
  savingDraft: boolean;
  onRunValidation: () => void;
  onApplyPack: () => void;
  onDuplicateDraft: () => void;
  onRepairDefaults: () => void;
  onDuplicateAndApply: () => void;
  onSaveDraft: () => void;
  editableInputClass: (fieldId?: string) => string;
  onSetDraftField: (
    field: "code" | "label" | "description" | "previewAsset",
    value: string,
  ) => void;
  onSetDraftTags: (raw: string) => void;
  onSetDraftMapValue: (
    section: "scene" | "flowers" | "trees",
    key: string,
    value: string,
  ) => void;
  sceneLabel: (key: string) => string;
};

const SCENE_GROUPS = [
  {
    title: "Fondo y paisaje",
    keys: [
      "landscape_asset",
      "sky_top",
      "sky_mid",
      "sky_bottom",
      "hill_left",
      "hill_right",
      "meadow",
      "meadow_shadow",
    ],
  },
  {
    title: "Sendero y decoración",
    keys: [
      "path_outer",
      "path_inner",
      "cloud_left_asset",
      "cloud_right_asset",
      "deco_flower_left_asset",
      "deco_flower_center_asset",
      "deco_flower_right_asset",
      "seed_asset",
    ],
  },
  {
    title: "Fondos de eventos",
    keys: ["event_seed_bg", "event_flower_bg", "event_tree_bg"],
  },
] as const;

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-[#d9e4d3] bg-[#fbfcfa] px-3 py-1.5 text-sm">
      <span className="text-slate-500">{label}:</span>{" "}
      <span className="font-medium text-slate-950">{value}</span>
    </div>
  );
}

export function AdminHomeWorkspace({
  message,
  view,
  onViewChange,
  searchTerm,
  onSearchTermChange,
  styleFilter,
  onStyleFilterChange,
  styleOptions,
  seasonFilter,
  onSeasonFilterChange,
  seasonOptions,
  filteredPacks,
  selectedPackCode,
  onSelectPack,
  workingPack,
  previewTokens,
  validationSummaryText,
  lastValidatedAt,
  invalidAssetFields,
  validatingAssets,
  applying,
  duplicateApplying,
  savingDraft,
  onRunValidation,
  onApplyPack,
  onDuplicateDraft,
  onRepairDefaults,
  onDuplicateAndApply,
  onSaveDraft,
  editableInputClass,
  onSetDraftField,
  onSetDraftTags,
  onSetDraftMapValue,
  sceneLabel,
}: Props) {
  return (
    <AdminWorkspace
      sidebar={
        <>
          {message}

          <AdminPanel title="Escenas" description="Elige el pack que quieres ajustar.">
            <div className="space-y-3">
              <input
                className="w-full rounded-2xl border bg-[#fbfcfa] p-3 text-sm"
                placeholder="Buscar pack"
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
              />
              <select
                className="w-full rounded-2xl border bg-[#fbfcfa] p-3 text-sm"
                value={styleFilter}
                onChange={(e) => onStyleFilterChange(e.target.value)}
              >
                <option value="all">Todos los estilos</option>
                {styleOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <select
                className="w-full rounded-2xl border bg-[#fbfcfa] p-3 text-sm"
                value={seasonFilter}
                onChange={(e) => onSeasonFilterChange(e.target.value)}
              >
                <option value="all">Todas las estaciones</option>
                {seasonOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 space-y-2">
              {filteredPacks.map((pack) => (
                <button
                  key={pack.code}
                  type="button"
                  className={`w-full rounded-[22px] border px-3 py-3 text-left transition ${
                    selectedPackCode === pack.code
                      ? "border-[#9db995] bg-[#f3fbef]"
                      : "border-[#d9e4d3] bg-white hover:border-[#bfd0b7]"
                  }`}
                  onClick={() => onSelectPack(pack.code)}
                >
                  <div className="font-medium">{pack.label}</div>
                  <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
                    {pack.description}
                  </div>
                </button>
              ))}
              {!filteredPacks.length ? (
                <AdminInlineNote>No hay packs con ese filtro.</AdminInlineNote>
              ) : null}
            </div>
          </AdminPanel>

          <AdminPanel title="Tarea" description="Trabaja en una sola cosa a la vez.">
            <AdminToggleGroup
              value={view}
              onChange={onViewChange}
              options={[
                { key: "preview", label: "Vista" },
                { key: "scene", label: "Escena" },
                { key: "validate", label: "Validacion" },
                { key: "advanced", label: "Avanzado" },
              ]}
            />

            <div className="mt-4">
              <AdminInlineNote>
                Tipos de plan define flores y semillas. Aqui solo tocamos escena, preview y
                validacion del home.
              </AdminInlineNote>
            </div>
          </AdminPanel>
        </>
      }
    >
      <AdminPanel
        title={workingPack?.label ?? "Selecciona un pack"}
        description={
          workingPack?.description ??
          "Elige un pack a la izquierda para revisar su escena y dejarla lista para aplicar."
        }
        actions={
          workingPack ? (
            <>
              <button
                className="rounded-2xl border px-4 py-2 text-sm disabled:opacity-50"
                onClick={onSaveDraft}
                disabled={savingDraft || validatingAssets}
              >
                {savingDraft ? "Guardando..." : "Guardar pack"}
              </button>
              <button
                className="rounded-2xl bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
                onClick={onApplyPack}
                disabled={applying || validatingAssets}
              >
                {applying ? "Aplicando..." : "Aplicar en Home"}
              </button>
              <details className="rounded-2xl border bg-[#fbfcfa] px-3 py-2 text-sm text-slate-700">
                <summary className="cursor-pointer select-none">Mas acciones</summary>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="rounded-2xl border px-4 py-2 text-sm"
                    onClick={onDuplicateDraft}
                  >
                    Duplicar
                  </button>
                  <button
                    className="rounded-2xl border px-4 py-2 text-sm"
                    onClick={onRepairDefaults}
                  >
                    Reparar defaults
                  </button>
                  <button
                    className="rounded-2xl border px-4 py-2 text-sm disabled:opacity-50"
                    onClick={onDuplicateAndApply}
                    disabled={duplicateApplying || validatingAssets}
                  >
                    {duplicateApplying ? "Duplicando..." : "Duplicar y aplicar"}
                  </button>
                </div>
              </details>
            </>
          ) : null
        }
      >
        {workingPack ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-3">
              <img
                src={workingPack.previewAsset}
                alt="Preview del pack"
                className="h-64 w-full rounded-[24px] border bg-[#fbfcfa] object-cover"
              />

              {previewTokens ? (
                <div className="rounded-[24px] border bg-[#fbfcfa] p-4">
                  <div className="mb-3 text-sm font-medium text-slate-800">Muestra del home</div>
                  <div className="relative h-36 overflow-hidden rounded-2xl border">
                    <img
                      src={previewTokens.previewBg}
                      alt="Preview sendero"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-white/10" />
                    <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-end gap-3">
                      <span
                        className="rounded-xl border p-1.5"
                        style={{ backgroundColor: previewTokens.sampleSeedBg }}
                      >
                        <img src={previewTokens.sampleSeed} alt="" className="h-7 w-7 object-contain" />
                      </span>
                      <span
                        className="rounded-xl border p-1.5"
                        style={{ backgroundColor: previewTokens.sampleFlowerBg }}
                      >
                        <img src={previewTokens.sampleFlower} alt="" className="h-7 w-7 object-contain" />
                      </span>
                      <span
                        className="rounded-xl border p-1.5"
                        style={{ backgroundColor: previewTokens.sampleTreeBg }}
                      >
                        <img src={previewTokens.sampleTree} alt="" className="h-7 w-7 object-contain" />
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <SummaryChip label="Código" value={workingPack.code} />
                <SummaryChip
                  label="Tags"
                  value={workingPack.tags.length ? workingPack.tags.join(", ") : "Sin tags"}
                />
              </div>

              <AdminInlineNote>
                <span className="font-medium text-slate-800">Compatibilidad:</span> escena {Object.keys(workingPack.scene).length} - preview del sendero lista para validar.
              </AdminInlineNote>
              <AdminInlineNote tone={invalidAssetFields.length > 0 ? "warning" : "success"}>
                {validationSummaryText}
                {lastValidatedAt ? (
                  <div className="mt-1 text-xs">Última validación: {lastValidatedAt}</div>
                ) : null}
              </AdminInlineNote>
              <AdminInlineNote>
                Las flores y arboles se siguen sincronizando por compatibilidad legacy, pero su identidad principal ya se define en Tipos de plan.
              </AdminInlineNote>
            </div>
          </div>
        ) : (
          <AdminInlineNote>Elige un pack en la columna izquierda para empezar.</AdminInlineNote>
        )}
      </AdminPanel>

      {workingPack ? (
        <AdminPanel
          title={
            view === "preview"
              ? "Vista del pack"
              : view === "scene"
                ? "Escena del home"
                : view === "validate"
                  ? "Validacion"
                  : "Avanzado"
          }
          description={
            view === "preview"
              ? "Revisa el pack actual y decide si ya esta listo para aplicar."
              : view === "scene"
                ? "Toca solo los tokens de escena que afectan al home."
                : view === "validate"
                  ? "Comprueba rutas y assets antes de aplicar cambios."
                  : "Code, tags y metadata solo cuando de verdad los necesites."
          }
        >
          {view === "preview" ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[20px] border border-[#d9e4d3] bg-[#fbfcfa] p-4">
                  <div className="text-sm font-medium text-slate-900">Nombre visible</div>
                  <div className="mt-2 text-sm text-slate-600">{workingPack.label}</div>
                </div>
                <div className="rounded-[20px] border border-[#d9e4d3] bg-[#fbfcfa] p-4">
                  <div className="text-sm font-medium text-slate-900">Descripcion</div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">
                    {workingPack.description || "Sin descripción aún."}
                  </div>
                </div>
              </div>
              <AdminInlineNote>
                Usa <span className="font-medium">Escena</span> para editar el look del home. Usa <span className="font-medium">Validacion</span> antes de aplicar. Solo entra en <span className="font-medium">Avanzado</span> si necesitas tocar metadata del pack.
              </AdminInlineNote>
            </div>
          ) : null}

          {view === "scene" ? (
            <div className="space-y-4">
              {SCENE_GROUPS.map((group) => (
                <div
                  key={group.title}
                  className="rounded-[24px] border border-[#d9e4d3] bg-[#fbfcfa] p-4"
                >
                  <div className="mb-4 text-sm font-medium text-slate-900">{group.title}</div>
                  <div className="space-y-2">
                    {group.keys.map((key) => (
                      <div key={key} className="grid gap-2 md:grid-cols-[220px_minmax(0,1fr)]">
                        <div className="text-sm text-slate-600">{sceneLabel(key)}</div>
                        <input
                          className={editableInputClass(`scene:${key}`)}
                          value={workingPack.scene[key] ?? ""}
                          onChange={(e) => onSetDraftMapValue("scene", key, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {view === "validate" ? (
            <div className="space-y-4">
              <button
                className="rounded-2xl border px-4 py-2 text-sm disabled:opacity-50"
                onClick={onRunValidation}
                disabled={validatingAssets}
              >
                {validatingAssets ? "Validando..." : "Validar assets"}
              </button>

              {invalidAssetFields.length > 0 ? (
                <div className="rounded-[20px] border border-[#eadfc1] bg-[#fffaf0] p-4">
                  <div className="font-medium text-slate-900">Assets con problema</div>
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    {invalidAssetFields.map((field) => (
                      <li key={field.id}>{field.label}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <AdminInlineNote tone="success">
                  Todo lo visible en este pack pasa la validacion de formato.
                </AdminInlineNote>
              )}
            </div>
          ) : null}

          {view === "advanced" ? (
            <div className="space-y-4">
              <AdminInlineNote tone="warning">
                Solo entra aqui si necesitas renombrar el pack, cambiar tags o reparar defaults. No hace falta tocar esto para la mayoria de ajustes del home.
              </AdminInlineNote>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  className="rounded-2xl border p-3"
                  value={workingPack.code}
                  onChange={(e) => onSetDraftField("code", e.target.value)}
                  placeholder="Código"
                />
                <input
                  className="rounded-2xl border p-3"
                  value={workingPack.label}
                  onChange={(e) => onSetDraftField("label", e.target.value)}
                  placeholder="Nombre visible"
                />
                <input
                  className={`rounded-2xl border p-3 md:col-span-2 ${editableInputClass("preview_asset").replace(
                    "rounded-xl border p-1 text-xs",
                    "",
                  )}`}
                  value={workingPack.previewAsset}
                  onChange={(e) => onSetDraftField("previewAsset", e.target.value)}
                  placeholder="Preview asset"
                />
                <textarea
                  className="min-h-[120px] rounded-2xl border p-3 md:col-span-2"
                  value={workingPack.description}
                  onChange={(e) => onSetDraftField("description", e.target.value)}
                  placeholder="Descripción"
                />
                <input
                  className="rounded-2xl border p-3 md:col-span-2"
                  value={workingPack.tags.join(", ")}
                  onChange={(e) => onSetDraftTags(e.target.value)}
                  placeholder="tags: style:pastel, season:spring"
                />
              </div>
            </div>
          ) : null}
        </AdminPanel>
      ) : null}
    </AdminWorkspace>
  );
}
