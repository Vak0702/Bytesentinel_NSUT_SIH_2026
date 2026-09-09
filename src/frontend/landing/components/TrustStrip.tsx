const CAPABILITIES = [
  "AI-Assisted Screening",
  "Document Intelligence",
  "Identity Verification",
  "Risk Assessment",
];

export function TrustStrip() {
  return (
    <section className="section-divider border-b bg-void/60 py-10">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-12 gap-y-4 px-6">
        {CAPABILITIES.map((item) => (
          <span
            key={item}
            className="font-mono text-xs uppercase tracking-[0.2em] text-ink-tertiary"
          >
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
