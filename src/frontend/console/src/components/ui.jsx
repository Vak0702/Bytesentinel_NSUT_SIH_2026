export function Card({ children, className = "", ...props }) {
  return (
    <div
      className={`bg-surface border border-border-subtle rounded-xl ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

const toneStyles = {
  safe: "bg-safe-soft text-safe border-safe/30",
  warn: "bg-warn-soft text-warn border-warn/30",
  danger: "bg-danger-soft text-danger border-danger/30",
  info: "bg-info-soft text-info border-info/30",
  neutral: "bg-overlay text-ink-muted border-border-subtle",
};

export function Badge({ tone = "neutral", children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${toneStyles[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function riskTone(risk) {
  if (risk >= 71) return "danger";
  if (risk >= 41) return "warn";
  return "safe";
}

export function RiskBadge({ risk }) {
  const tone = riskTone(risk);
  return (
    <span
      className={`inline-flex items-center justify-center min-w-9 h-7 px-2 rounded-full text-xs font-semibold mono ${toneStyles[tone]}`}
    >
      {risk}
    </span>
  );
}

const decisionTones = {
  Cleared: "safe",
  Flagged: "danger",
  "Manual review": "warn",
  "Secondary inspection": "warn",
  "Under investigation": "danger",
};

export function DecisionBadge({ decision }) {
  return <Badge tone={decisionTones[decision] || "neutral"}>{decision}</Badge>;
}

export function Button({ variant = "default", className = "", children, ...props }) {
  const variants = {
    default: "bg-surface-2 border border-border-strong text-ink hover:bg-surface-hover",
    primary: "bg-accent text-white hover:bg-accent/90 border border-accent",
    safe: "bg-safe text-on-safe hover:bg-safe/90 border border-safe font-semibold",
    warn: "bg-warn-soft text-warn hover:bg-warn/20 border border-warn/40 font-semibold",
    danger: "bg-danger-soft text-danger hover:bg-danger/20 border border-danger/40 font-semibold",
    ghost: "bg-transparent text-ink-muted hover:text-ink hover:bg-overlay border border-transparent",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function StatCard({ label, value, sub, tone = "ink" }) {
  const toneText = {
    ink: "text-ink",
    danger: "text-danger",
    warn: "text-warn",
    safe: "text-safe",
  };
  return (
    <Card className="p-5">
      <div className="text-xs tracking-wide text-ink-muted uppercase">{label}</div>
      <div className={`mt-2 text-3xl font-semibold ${toneText[tone]}`}>{value}</div>
      <div className="mt-1 text-xs text-ink-faint">{sub}</div>
    </Card>
  );
}

export function ProgressBar({ value, tone = "safe" }) {
  const toneBg = { safe: "bg-safe", warn: "bg-warn", danger: "bg-danger", info: "bg-info" };
  return (
    <div className="h-1 w-full bg-overlay rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${toneBg[tone]}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function ConfidenceField({ label, value, confidence }) {
  return (
    <div>
      <div className="text-[11px] tracking-wide text-ink-muted uppercase">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
      <div className="mt-1.5 flex items-center gap-2">
        <div className="h-1 flex-1 bg-overlay rounded-full overflow-hidden">
          <div className="h-full bg-safe rounded-full" style={{ width: `${confidence}%` }} />
        </div>
        <span className="text-[11px] text-ink-faint mono w-8 text-right">{confidence}%</span>
      </div>
    </div>
  );
}
