type QuickAction = {
  id: string;
  title: string;
  subtitle: string;
  onClick: () => void;
};

export default function HomeQuickActionsGrid({
  actions,
}: {
  actions: QuickAction[];
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {actions.map((action) => (
        <button
          key={action.id}
          className="lv-card p-5 text-left transition hover:-translate-y-[1px]"
          onClick={action.onClick}
        >
          <div className="text-base font-semibold">{action.title}</div>
          <div className="mt-1 text-sm text-[var(--lv-text-muted)]">{action.subtitle}</div>
        </button>
      ))}
    </div>
  );
}
