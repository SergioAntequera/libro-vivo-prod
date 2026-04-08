"use client";

import {
  VALIDATION_RULE_TEMPLATES,
  type DiagnosticsTone,
  type ValidationDomain,
  type ValidationRuleFieldDefinition,
  type ValidationRuleDefinition,
} from "@/lib/adminValidationRules";

export type DiagnosticsRuleGroup = {
  key: string;
  label: string;
  rules: ValidationRuleDefinition[];
  enabled: number;
  disabled: number;
};

export function diagnosticsRuleCardDomId(ruleId: string) {
  return `validation-rule-${ruleId}`;
}

export function diagnosticsRuleGroupDomId(groupKey: string) {
  return `validation-group-${groupKey}`;
}

function toneBadgeClass(tone: DiagnosticsTone) {
  if (tone === "error") return "border-[var(--lv-danger)] bg-[var(--lv-danger-soft)] text-[var(--lv-danger)]";
  if (tone === "warning") return "border-[var(--lv-warning)] bg-[var(--lv-warning-soft)] text-[var(--lv-warning)]";
  return "border-[var(--lv-success)] bg-[var(--lv-success-soft)] text-[var(--lv-success)]";
}

function isCustomRule(rule: ValidationRuleDefinition) {
  return rule.id !== rule.kind;
}

type Props = {
  domain: ValidationDomain;
  groups: DiagnosticsRuleGroup[];
  onJumpToGroup: (groupKey: string) => void;
  onUpdateRule: (
    domain: ValidationDomain,
    ruleId: string,
    updater: (rule: ValidationRuleDefinition) => ValidationRuleDefinition,
  ) => void;
  onMoveRule: (domain: ValidationDomain, ruleId: string, direction: -1 | 1) => void;
  onRemoveRule: (domain: ValidationDomain, ruleId: string) => void;
};

export function AdminDiagnosticsRulesEditor(props: Props) {
  return (
    <>
      {props.groups.length ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {props.groups.map((group) => (
            <button
              key={group.key}
              type="button"
              className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-2 text-sm text-[var(--lv-text)] transition hover:bg-[var(--lv-surface-soft)]"
              onClick={() => props.onJumpToGroup(group.key)}
            >
              {group.label} - {group.enabled}/{group.rules.length}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-6 grid gap-5">
        {props.groups.map((group) => (
          <section
            key={group.key}
            id={diagnosticsRuleGroupDomId(group.key)}
            className="rounded-[30px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                  Grupo
                </div>
                <h3 className="text-lg font-semibold text-[var(--lv-text)]">{group.label}</h3>
                <p className="text-sm text-[var(--lv-text-muted)]">
                  {group.rules.length} regla(s) - {group.enabled} activa(s) -{" "}
                  {group.disabled} apagada(s)
                </p>
              </div>
              <div className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
                Orden manual dentro del grupo
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              {group.rules.map((rule, index) => {
                const template = VALIDATION_RULE_TEMPLATES.find(
                  (candidate) => candidate.kind === rule.kind,
                );
                return (
                  <article
                    key={rule.id}
                    id={diagnosticsRuleCardDomId(rule.id)}
                    tabIndex={-1}
                    className="rounded-[28px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-5 outline-none shadow-[var(--lv-shadow-sm)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-[var(--lv-text)]">{rule.id}</div>
                        <div className="text-xs uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
                          {group.label}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] ${toneBadgeClass(rule.tone)}`}
                        >
                          {rule.tone}
                        </span>
                        {isCustomRule(rule) ? (
                          <span className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
                            Instancia
                          </span>
                        ) : null}
                        <button
                          type="button"
                          disabled={index === 0}
                          className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-1.5 text-sm text-[var(--lv-text)] transition hover:bg-[var(--lv-surface-soft)] disabled:cursor-not-allowed disabled:opacity-45"
                          onClick={() => props.onMoveRule(props.domain, rule.id, -1)}
                        >
                          Subir
                        </button>
                        <button
                          type="button"
                          disabled={index === group.rules.length - 1}
                          className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-1.5 text-sm text-[var(--lv-text)] transition hover:bg-[var(--lv-surface-soft)] disabled:cursor-not-allowed disabled:opacity-45"
                          onClick={() => props.onMoveRule(props.domain, rule.id, 1)}
                        >
                          Bajar
                        </button>
                        <label className="inline-flex items-center gap-2 rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-1.5 text-sm text-[var(--lv-text)]">
                          <input
                            type="checkbox"
                            checked={rule.enabled}
                            onChange={(event) =>
                              props.onUpdateRule(props.domain, rule.id, (current) => ({
                                ...current,
                                enabled: event.target.checked,
                              }))
                            }
                          />
                          Activa
                        </label>
                        {isCustomRule(rule) ? (
                          <button
                            type="button"
                            className="rounded-full border border-[var(--lv-danger)] bg-[var(--lv-surface)] px-3 py-1.5 text-sm text-[var(--lv-danger)] transition hover:bg-[var(--lv-danger-soft)]"
                            onClick={() => props.onRemoveRule(props.domain, rule.id)}
                          >
                            Eliminar
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                      <label className="space-y-2">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                          Nombre visible
                        </div>
                        <input
                          value={rule.label}
                          data-rule-primary-input="true"
                          onChange={(event) =>
                            props.onUpdateRule(props.domain, rule.id, (current) => ({
                              ...current,
                              label: event.target.value,
                            }))
                          }
                          className="w-full rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-3 text-sm text-[var(--lv-text)]"
                        />
                      </label>

                      <label className="space-y-2">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                          Severidad
                        </div>
                        <select
                          value={rule.tone}
                          onChange={(event) =>
                            props.onUpdateRule(props.domain, rule.id, (current) => ({
                              ...current,
                              tone: event.target.value as DiagnosticsTone,
                            }))
                          }
                          className="w-full rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-3 text-sm text-[var(--lv-text)]"
                        >
                          <option value="error">Error</option>
                          <option value="warning">Warning</option>
                          <option value="info">Info</option>
                        </select>
                      </label>

                      <label className="space-y-2 lg:col-span-2">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                          Descripcion / copy de la regla
                        </div>
                        <textarea
                          value={rule.description}
                          onChange={(event) =>
                            props.onUpdateRule(props.domain, rule.id, (current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                          rows={3}
                          className="w-full rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-3 text-sm leading-6 text-[var(--lv-text)]"
                        />
                      </label>

                      {template?.fields?.length ? (
                        <div className="grid gap-4 lg:col-span-2 md:grid-cols-2">
                          {template.fields.map((field: ValidationRuleFieldDefinition) => {
                            const fieldLabel = (
                              <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                                {field.label}
                              </div>
                            );
                            const fieldHint = field.hint ? (
                              <div className="text-xs leading-5 text-[var(--lv-text-muted)]">{field.hint}</div>
                            ) : null;

                            if (field.type === "number") {
                              return (
                                <label key={field.key} className="space-y-2">
                                  {fieldLabel}
                                  {fieldHint}
                                  <input
                                    type="number"
                                    min={field.min}
                                    step={field.step ?? 1}
                                    value={String(rule.params[field.key] ?? field.defaultValue)}
                                    onChange={(event) =>
                                      props.onUpdateRule(props.domain, rule.id, (current) => ({
                                        ...current,
                                        params: {
                                          ...current.params,
                                          [field.key]: Number(event.target.value),
                                        },
                                      }))
                                    }
                                    className="w-full rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-3 text-sm text-[var(--lv-text)]"
                                  />
                                </label>
                              );
                            }

                            if (field.type === "select") {
                              return (
                                <label key={field.key} className="space-y-2">
                                  {fieldLabel}
                                  {fieldHint}
                                  <select
                                    value={String(rule.params[field.key] ?? field.defaultValue)}
                                    onChange={(event) =>
                                      props.onUpdateRule(props.domain, rule.id, (current) => ({
                                        ...current,
                                        params: {
                                          ...current.params,
                                          [field.key]: event.target.value,
                                        },
                                      }))
                                    }
                                    className="w-full rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-3 text-sm text-[var(--lv-text)]"
                                  >
                                    {field.options.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              );
                            }

                            if (field.type === "multiselect") {
                              const selectedValues = Array.isArray(rule.params[field.key])
                                ? (rule.params[field.key] as string[])
                                : field.defaultValue;
                              return (
                                <div key={field.key} className="space-y-2 md:col-span-2">
                                  {fieldLabel}
                                  {fieldHint}
                                  <div className="grid gap-2 rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-3 md:grid-cols-2">
                                    {field.options.map((option) => {
                                      const checked = selectedValues.includes(option.value);
                                      return (
                                        <label
                                          key={option.value}
                                          className="inline-flex items-center gap-2 text-sm text-[var(--lv-text)]"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={(event) =>
                                              props.onUpdateRule(
                                                props.domain,
                                                rule.id,
                                                (current) => {
                                                  const currentValues = Array.isArray(
                                                    current.params[field.key],
                                                  )
                                                    ? (current.params[field.key] as string[])
                                                    : [];
                                                  const nextValues = event.target.checked
                                                    ? [...currentValues, option.value]
                                                    : currentValues.filter(
                                                        (value) => value !== option.value,
                                                      );
                                                  return {
                                                    ...current,
                                                    params: {
                                                      ...current.params,
                                                      [field.key]: nextValues,
                                                    },
                                                  };
                                                },
                                              )
                                            }
                                          />
                                          {option.label}
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            }

                            if (field.type === "textarea") {
                              return (
                                <label key={field.key} className="space-y-2 md:col-span-2">
                                  {fieldLabel}
                                  {fieldHint}
                                  <textarea
                                    value={String(rule.params[field.key] ?? field.defaultValue)}
                                    onChange={(event) =>
                                      props.onUpdateRule(props.domain, rule.id, (current) => ({
                                        ...current,
                                        params: {
                                          ...current.params,
                                          [field.key]: event.target.value,
                                        },
                                      }))
                                    }
                                    rows={3}
                                    className="w-full rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-3 text-sm text-[var(--lv-text)]"
                                  />
                                </label>
                              );
                            }

                            return (
                              <label key={field.key} className="space-y-2">
                                {fieldLabel}
                                {fieldHint}
                                <input
                                  type="text"
                                  value={String(rule.params[field.key] ?? field.defaultValue)}
                                  placeholder={field.placeholder}
                                  onChange={(event) =>
                                    props.onUpdateRule(props.domain, rule.id, (current) => ({
                                      ...current,
                                      params: {
                                        ...current.params,
                                        [field.key]: event.target.value,
                                      },
                                    }))
                                  }
                                  className="w-full rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-3 text-sm text-[var(--lv-text)]"
                                />
                              </label>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
