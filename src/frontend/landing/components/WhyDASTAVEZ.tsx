import { Layers, Eye, Zap, ListFilter } from "lucide-react";

const REASONS = [
  {
    icon: Layers,
    title: "Multi-Signal Verification",
    description: "Does not rely on a single verification signal.",
  },
  {
    icon: Eye,
    title: "Explainable Decisions",
    description: "Shows why a case was flagged.",
  },
  {
    icon: Zap,
    title: "Fast Screening",
    description: "Designed for rapid document assessment.",
  },
  {
    icon: ListFilter,
    title: "Risk-Based Review",
    description: "Prioritizes suspicious cases for investigation.",
  },
];

export function WhyVeridex() {
  return (
    <section id="about" className="section-divider border-t py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14 max-w-2xl">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-accent-cyan">
            Why DASTAVEZ
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink-primary sm:text-4xl">
            Built for verification decisions, not just data extraction
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-surface-border bg-surface-border sm:grid-cols-2 lg:grid-cols-4">
          {REASONS.map((r) => (
            <div key={r.title} className="bg-surface p-7">
              <r.icon className="h-6 w-6 text-accent-cyan" strokeWidth={1.75} />
              <h3 className="mt-4 font-display text-base font-semibold text-ink-primary">
                {r.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                {r.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
