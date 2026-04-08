"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminDiagnosticsRulesEditor,
  diagnosticsRuleCardDomId,
  diagnosticsRuleGroupDomId,
  type DiagnosticsRuleGroup,
} from "@/components/admin/AdminDiagnosticsRulesEditor";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { ensureSuperadminOrRedirect } from "@/lib/auth";
import {
  createValidationRuleFromTemplate,
  getCreatableValidationRuleTemplates,
  loadAllValidationRules,
  restoreDefaultValidationRules,
  saveValidationRules,
  VALIDATION_RULE_DOMAINS,
  VALIDATION_RULE_TEMPLATES,
  type ValidationDomain,
  type ValidationRuleDefinition,
} from "@/lib/adminValidationRules";

const DOMAIN_META: Record<
  ValidationDomain,
  { label: string; description: string }
> = {
  flowers: {
    label: "Flowers",
    description:
      "Gobierna el panel local de `Validacion` del editor de flores y memorias.",
  },
  map: {
    label: "Map",
    description:
      "Gobierna las validaciones del editor espacial sin mezclarlo con incidencias del jardín.",
  },
  trail: {
    label: "Trail Editor",
    description:
      "Gobierna las reglas del sendero, la cima y los assets del home inmersivo.",
  },
  progression: {
    label: "Progression",
    description:
      "Gobierna las reglas del árbol de hitos, sus condiciones, dependencias y rewards canónicas.",
  },
  seeds: {
    label: "Seeds",
    description:
      "Gobierna las reglas de composición y completitud de la superficie Nueva semilla.",
  },
};

function domainStats(rules: ValidationRuleDefinition[]) {
  return {
    total: rules.length,
    enabled: rules.filter((rule) => rule.enabled).length,
    disabled: rules.filter((rule) => !rule.enabled).length,
  };
}

function cloneRulesByDomain(
  value: Record<ValidationDomain, ValidationRuleDefinition[]>,
) {
  return Object.fromEntries(
    VALIDATION_RULE_DOMAINS.map((domain) => [
      domain,
      (value[domain] ?? []).map((rule) => ({
        ...rule,
        params: { ...rule.params },
      })),
    ]),
  ) as Record<ValidationDomain, ValidationRuleDefinition[]>;
}

function SummaryChip(props: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-[#d9e4d3] bg-white px-4 py-2 shadow-sm">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[#61755c]">
        {props.label}
      </div>
      <div className="mt-1 text-sm font-medium text-slate-950">{props.value}</div>
    </div>
  );
}

function ruleTargetLabel(target: string | null) {
  return target?.trim() || "General";
}

function ruleTargetKey(target: string | null) {
  return ruleTargetLabel(target).toLowerCase();
}

function sortRulesForEditor(rules: ValidationRuleDefinition[]) {
  return [...rules].sort(
    (left, right) =>
      left.sortOrder - right.sortOrder ||
      left.label.localeCompare(right.label) ||
      left.id.localeCompare(right.id),
  );
}

function normalizeRuleOrder(rules: ValidationRuleDefinition[]) {
  return rules.map((rule, index) => ({
    ...rule,
    sortOrder: (index + 1) * 10,
  }));
}

function buildRuleGroups(rules: ValidationRuleDefinition[]): DiagnosticsRuleGroup[] {
  const groups = new Map<string, DiagnosticsRuleGroup>();

  for (const rule of sortRulesForEditor(rules)) {
    const label = ruleTargetLabel(rule.target);
    const key = ruleTargetKey(rule.target);
    const existing = groups.get(key);

    if (existing) {
      existing.rules.push(rule);
      if (rule.enabled) existing.enabled += 1;
      else existing.disabled += 1;
      continue;
    }

    groups.set(key, {
      key,
      label,
      rules: [rule],
      enabled: rule.enabled ? 1 : 0,
      disabled: rule.enabled ? 0 : 1,
    });
  }

  return [...groups.values()];
}

function insertRuleIntoTargetGroup(
  rules: ValidationRuleDefinition[],
  nextRule: ValidationRuleDefinition,
) {
  const ordered = sortRulesForEditor(rules);
  const nextTargetKey = ruleTargetKey(nextRule.target);
  let insertIndex = ordered.length;

  ordered.forEach((rule, index) => {
    if (ruleTargetKey(rule.target) === nextTargetKey) {
      insertIndex = index + 1;
    }
  });

  const next = [...ordered];
  next.splice(insertIndex, 0, nextRule);
  return normalizeRuleOrder(next);
}

function moveRuleWithinGroup(
  rules: ValidationRuleDefinition[],
  ruleId: string,
  direction: -1 | 1,
) {
  const ordered = sortRulesForEditor(rules);
  const index = ordered.findIndex((rule) => rule.id === ruleId);
  if (index < 0) return ordered;

  const targetKey = ruleTargetKey(ordered[index].target);
  const groupIndexes = ordered
    .map((rule, ruleIndex) => ({
      ruleIndex,
      targetKey: ruleTargetKey(rule.target),
    }))
    .filter((entry) => entry.targetKey === targetKey)
    .map((entry) => entry.ruleIndex);

  const positionInGroup = groupIndexes.indexOf(index);
  const swapIndex = groupIndexes[positionInGroup + direction];
  if (swapIndex == null) return ordered;

  const next = [...ordered];
  [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  return normalizeRuleOrder(next);
}

export default function AdminDiagnosticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<ValidationDomain>("flowers");
  const [newRuleKind, setNewRuleKind] = useState("");
  const [pendingRuleId, setPendingRuleId] = useState<string | null>(null);
  const [persistedRules, setPersistedRules] = useState<Record<
    ValidationDomain,
    ValidationRuleDefinition[]
  > | null>(null);
  const [draftRules, setDraftRules] = useState<Record<
    ValidationDomain,
    ValidationRuleDefinition[]
  > | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const session = await ensureSuperadminOrRedirect(router);
      if (!session || cancelled) {
        setLoading(false);
        return;
      }

      try {
        const next = await loadAllValidationRules();
        if (cancelled) return;
        setPersistedRules(next);
        setDraftRules(cloneRulesByDomain(next));
      } catch (error) {
        if (cancelled) return;
        setMsg(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las reglas de validación.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const currentRules = draftRules?.[selectedDomain] ?? [];
  const orderedCurrentRules = useMemo(
    () => sortRulesForEditor(currentRules),
    [currentRules],
  );
  const currentGroups = useMemo(
    () => buildRuleGroups(orderedCurrentRules),
    [orderedCurrentRules],
  );
  const creatableTemplates = useMemo(
    () => getCreatableValidationRuleTemplates(selectedDomain),
    [selectedDomain],
  );
  const currentStats = domainStats(currentRules);
  const isDirty = JSON.stringify(draftRules) !== JSON.stringify(persistedRules);
  const allEnabled = useMemo(() => {
    if (!draftRules) return 0;
    return VALIDATION_RULE_DOMAINS.reduce(
      (acc, domain) => acc + domainStats(draftRules[domain]).enabled,
      0,
    );
  }, [draftRules]);

  useEffect(() => {
    setNewRuleKind(creatableTemplates[0]?.kind ?? "");
  }, [creatableTemplates]);

  useEffect(() => {
    if (!pendingRuleId) return;

    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const card = document.getElementById(
          diagnosticsRuleCardDomId(pendingRuleId),
        );
        if (!card) {
          setPendingRuleId(null);
          return;
        }
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        const primaryInput = card.querySelector<HTMLElement>(
          "[data-rule-primary-input='true']",
        );
        primaryInput?.focus();
        setPendingRuleId(null);
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [pendingRuleId, draftRules, selectedDomain]);

  async function handleSave() {
    if (!draftRules) return;
    setSaving(true);
    setMsg(null);
    try {
      await saveValidationRules(draftRules);
      const stable = cloneRulesByDomain(draftRules);
      setPersistedRules(stable);
      setDraftRules(cloneRulesByDomain(stable));
      setMsg("Reglas de validación guardadas.");
    } catch (error) {
      setMsg(
        error instanceof Error
          ? error.message
          : "No se pudieron guardar las reglas de validación.",
      );
    } finally {
      setSaving(false);
    }
  }

  function updateRule(
    domain: ValidationDomain,
    ruleId: string,
    updater: (rule: ValidationRuleDefinition) => ValidationRuleDefinition,
  ) {
    setDraftRules((current) => {
      if (!current) return current;
      return {
        ...current,
        [domain]: current[domain].map((rule) =>
          rule.id === ruleId ? updater(rule) : rule,
        ),
      };
    });
  }

  function removeRule(domain: ValidationDomain, ruleId: string) {
    setDraftRules((current) => {
      if (!current) return current;
      return {
        ...current,
        [domain]: current[domain].filter((rule) => rule.id !== ruleId),
      };
    });
  }

  function moveRule(domain: ValidationDomain, ruleId: string, direction: -1 | 1) {
    setDraftRules((current) => {
      if (!current) return current;
      return {
        ...current,
        [domain]: moveRuleWithinGroup(current[domain], ruleId, direction),
      };
    });
  }

  function handleAddRule() {
    if (!draftRules || !newRuleKind) return;
    const nextRule = createValidationRuleFromTemplate(
      selectedDomain,
      newRuleKind as ValidationRuleDefinition["kind"],
      draftRules[selectedDomain],
    );
    if (!nextRule) return;

    setDraftRules((current) => {
      if (!current) return current;
      return {
        ...current,
        [selectedDomain]: insertRuleIntoTargetGroup(
          current[selectedDomain],
          nextRule,
        ),
      };
    });
    setPendingRuleId(nextRule.id);
  }

  function handleRestoreDomain(domain: ValidationDomain) {
    setDraftRules((current) => {
      if (!current) return current;
      return {
        ...current,
        [domain]: restoreDefaultValidationRules(domain),
      };
    });
  }

  if (loading && !draftRules) {
    return <PageLoadingState message="Cargando reglas de validación..." />;
  }

  return (
    <div className="min-h-screen bg-[#f5f7f3] p-6 text-slate-900">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        <section className="rounded-[34px] border border-[#dde8d8] bg-[rgba(255,255,255,0.96)] p-6 shadow-[0_20px_50px_rgba(21,36,24,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-full border border-[#d9e4d3] bg-white px-4 py-2 text-sm text-slate-800 transition hover:bg-[#f8fbf5]"
                  onClick={() => router.push("/admin")}
                >
                  Volver
                </button>
                <button
                  type="button"
                  className="rounded-full border border-[#d9e4d3] bg-white px-4 py-2 text-sm text-slate-800 transition hover:bg-[#f8fbf5]"
                  onClick={() => handleRestoreDomain(selectedDomain)}
                >
                  Restaurar dominio
                </button>
                <button
                  type="button"
                  className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1d1d1d] disabled:cursor-not-allowed disabled:bg-[#95a193]"
                  onClick={() => void handleSave()}
                  disabled={!isDirty || saving}
                >
                  {saving ? "Guardando..." : "Guardar reglas"}
                </button>
              </div>
              <div className="space-y-2">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[#61755c]">
                  Gobierno de validacion
                </div>
                <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
                  Diagnostico y validacion
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-slate-600">
                  Esta pantalla no muestra errores del sistema. Aqui se administran
                  las reglas que despues usa cada pagina en su propio panel local de
                  `Validacion`.
                </p>
              </div>
            </div>

            <div className="max-w-[420px] rounded-[28px] border border-[#dfe8da] bg-[#f8fbf6] px-4 py-4 shadow-sm">
              <div className="text-[11px] uppercase tracking-[0.18em] text-[#61755c]">
                Regla fuerte
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                El sistema ya no depende de ningun jardin. Las reglas viven aqui,
                son genericas y las pantallas las consumen como fuente de verdad.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <SummaryChip label="Dominios" value={String(VALIDATION_RULE_DOMAINS.length)} />
            <SummaryChip label="Reglas activas" value={String(allEnabled)} />
            <SummaryChip label="Dominio actual" value={DOMAIN_META[selectedDomain].label} />
            <SummaryChip label="Activas aquí" value={String(currentStats.enabled)} />
            <SummaryChip label="Apagadas aquí" value={String(currentStats.disabled)} />
          </div>

          {msg ? <StatusNotice className="mt-4" message={msg} /> : null}
        </section>

        <section className="rounded-[30px] border border-[#dde8d8] bg-white p-4 shadow-[0_18px_48px_rgba(21,36,24,0.06)]">
          <div className="flex flex-wrap gap-2">
            {VALIDATION_RULE_DOMAINS.map((domain) => {
              const stats = domainStats(draftRules?.[domain] ?? []);
              const active = domain === selectedDomain;
              return (
                <button
                  key={domain}
                  type="button"
                  onClick={() => setSelectedDomain(domain)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    active
                      ? "border-[#b7d0b4] bg-[#eef7e8] text-[#355c38]"
                      : "border-[#d9e4d3] bg-white text-slate-700 hover:bg-[#f8fbf5]"
                  }`}
                >
                  {DOMAIN_META[domain].label} - {stats.enabled}/{stats.total}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-[32px] border border-[#dde8d8] bg-white p-6 shadow-[0_18px_48px_rgba(21,36,24,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-[0.18em] text-[#61755c]">
                {DOMAIN_META[selectedDomain].label}
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                Reglas del dominio
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                {DOMAIN_META[selectedDomain].description}
              </p>
            </div>

            <div className="rounded-[24px] border border-[#dfe8da] bg-[#f8fbf6] px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-[#61755c]">
                Biblioteca soportada
              </div>
              <div className="mt-2 text-sm text-slate-700">
                {
                  VALIDATION_RULE_TEMPLATES.filter(
                    (template) => template.domain === selectedDomain,
                  ).length
                }{" "}
                plantillas soportadas.
              </div>
              <div className="mt-1 text-sm text-slate-600">
                {creatableTemplates.length} se pueden instanciar sin tocar codigo.
              </div>
            </div>
          </div>

          {creatableTemplates.length ? (
            <div className="mt-5 rounded-[26px] border border-[#dfe8da] bg-[#f8fbf6] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-[#61755c]">
                Crear nueva regla
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                <select
                  value={newRuleKind}
                  onChange={(event) => setNewRuleKind(event.target.value)}
                  className="min-w-[280px] rounded-[18px] border border-[#d9e4d3] bg-white px-4 py-3 text-sm"
                >
                  {creatableTemplates.map((template) => (
                    <option key={template.kind} value={template.kind}>
                      {template.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="rounded-[18px] border border-[#b7d0b4] bg-white px-4 py-3 text-sm font-medium text-[#355c38] transition hover:bg-[#eef7e8]"
                  onClick={handleAddRule}
                >
                  Anadir regla desde plantilla
                </button>
              </div>
            </div>
          ) : null}

          <AdminDiagnosticsRulesEditor
            domain={selectedDomain}
            groups={currentGroups}
            onJumpToGroup={(groupKey) => {
              document
                .getElementById(diagnosticsRuleGroupDomId(groupKey))
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            onUpdateRule={updateRule}
            onMoveRule={moveRule}
            onRemoveRule={removeRule}
          />
        </section>
      </div>
    </div>
  );
}
