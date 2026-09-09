import { TracingBeam } from "./ui/tracing-beam";

const STEPS = [
  {
    n: "01",
    title: "Upload",
    description: "Submit an identity document.",
  },
  {
    n: "02",
    title: "Extract",
    description: "OCR extracts structured information.",
  },
  {
    n: "03",
    title: "Analyze",
    description: "Analyze document structure and suspicious signals.",
  },
  {
    n: "04",
    title: "Verify",
    description: "Cross-check identity and facial signals.",
  },
  {
    n: "05",
    title: "Assess Risk",
    description: "Combine verification signals into a risk assessment.",
  },
  {
    n: "06",
    title: "Decision",
    description: "Return VERIFIED, REVIEW, or FLAGGED.",
  },
];

export function VerificationTimeline() {
  return (
    <section id="how-it-works" className="section-divider border-t py-24">
      <div className="mx-auto max-w-4xl px-6">
        <div className="mb-16 max-w-2xl">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-accent-cyan">
            How DASTAVEZ Works
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink-primary sm:text-4xl">
            From document to decision
          </h2>
        </div>

        <TracingBeam>
          <div className="space-y-12 pl-8 md:pl-12">
            {STEPS.map((step) => (
              <div key={step.n} className="relative">
                <div className="absolute -left-8 top-0 flex h-4 w-4 items-center justify-center md:-left-12">
                  <span className="h-2.5 w-2.5 rounded-full border-2 border-accent-cyan bg-void" />
                </div>
                <p className="font-mono text-xs text-accent-cyan">{step.n}</p>
                <h3 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </TracingBeam>
      </div>
    </section>
  );
}
