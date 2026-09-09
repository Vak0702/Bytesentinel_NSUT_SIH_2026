import { EvervaultCard } from "./ui/evervault-card";

export function DocumentIntelligence() {
  return (
    <section id="technology" className="section-divider border-t py-24">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-6 lg:grid-cols-2">
        <div>
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-accent-cyan">
            Document Intelligence
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink-primary sm:text-4xl">
            Document → Data Extraction → Verification
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-ink-secondary">
            Every identity document is treated as encrypted until it is
            processed. DASTAVEZ extracts each field, checks it for internal
            consistency, and confirms it against the document&rsquo;s security
            structure before anything is marked verified.
          </p>

          <div className="mt-8 space-y-3 border-l border-surface-border pl-5">
            <Field label="Name" />
            <Field label="Date of Birth" />
            <Field label="Document Number" />
            <Field label="Expiry" />
          </div>
        </div>

        <div>
          <EvervaultCard />
          <p className="mt-4 text-center text-xs text-ink-tertiary">
            Hover to reveal extracted &amp; verified fields
          </p>
        </div>
      </div>
    </section>
  );
}

function Field({ label }: { label: string }) {
  return (
    <p className="font-mono text-sm text-ink-secondary">
      {label} <span className="text-ink-tertiary">— extracted on upload</span>
    </p>
  );
}
