"use client";

type StatusTone = "info" | "success" | "warning" | "error";

type StatusNoticeProps = {
  message: string;
  tone?: StatusTone;
  className?: string;
};

function inferTone(message: string): StatusTone {
  const text = message.toLowerCase();
  if (
    text.includes("aviso") ||
    text.includes("advertencia") ||
    text.includes("parcial") ||
    text.includes("incompleto")
  ) {
    return "warning";
  }
  if (
    text.includes("error") ||
    text.includes("fallo") ||
    text.includes("no se pudo") ||
    text.includes("denegado") ||
    text.includes("inval")
  ) {
    return "error";
  }
  if (text.includes("ok") || text.includes("guardado") || text.includes("creado")) {
    return "success";
  }
  return "info";
}

function toneClasses(tone: StatusTone) {
  if (tone === "error") return "lv-tone-error";
  if (tone === "warning") return "lv-tone-warning";
  if (tone === "success") return "lv-tone-success";
  return "lv-tone-info";
}

export function StatusNotice({ message, tone, className }: StatusNoticeProps) {
  const resolvedTone = tone ?? inferTone(message);
  const classes = toneClasses(resolvedTone);
  return (
    <div className={`lv-state-panel ${classes} ${className ?? ""}`} role="status">
      {message}
    </div>
  );
}
