export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#f6f6f6] text-slate-900 p-6">
      <div className="max-w-xl mx-auto rounded-3xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Sin conexión</h1>
        <p className="text-sm opacity-80 mt-2">
          No hay red ahora mismo. Puedes seguir navegando por el contenido que
          ya esté en cache y reintentar cuando vuelva internet.
        </p>
        <div className="mt-4 text-xs opacity-60">
          Tip: vuelve a Home o Timeline cuando recuperes conexión.
        </div>
      </div>
    </div>
  );
}

