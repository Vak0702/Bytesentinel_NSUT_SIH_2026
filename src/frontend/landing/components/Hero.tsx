import { ArrowRight, PlayCircle, CheckCircle2 } from "lucide-react";
import { Spotlight } from "./ui/spotlight";
import { GridBackground } from "./ui/grid-background";
import { MovingBorderButton } from "./ui/moving-border";

export function Hero() {
  return (
    <section
      id="home"
      className="relative flex min-h-screen items-center overflow-hidden pt-28 pb-20"
    >
      <GridBackground />
      <Spotlight className="left-1/2 top-0 -translate-x-1/2" />

      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 gap-16 px-6 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        {/* Left: copy */}
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface/60 px-3 py-1 text-xs uppercase tracking-widest text-ink-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-cyan" />
            Smart India Hackathon 2026
          </div>

          <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight text-ink-primary text-balance sm:text-5xl lg:text-6xl">
            AI-Powered Identity &amp;{" "}
            <span className="bg-gradient-to-r from-accent-cyan to-accent bg-clip-text text-transparent">
              Document Screening
            </span>
          </h1>

          <p className="mt-6 font-display text-lg text-ink-secondary">
            &ldquo;Verify before you trust.&rdquo;
          </p>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-secondary">
            Detect suspicious identities, analyze identity documents, and
            generate explainable risk assessments through one intelligent
            screening platform.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <MovingBorderButton as="a" {...{ href: "#start-verification" }}>
              Start Verification
              <ArrowRight className="h-4 w-4" />
            </MovingBorderButton>

            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-6 py-3 text-sm font-semibold text-ink-primary transition-colors hover:border-ink-secondary focus-ring"
            >
              <PlayCircle className="h-4 w-4 text-accent-cyan" />
              See How It Works
            </a>
          </div>
        </div>

        {/* Right: live verification interface preview */}
        <div className="relative">
          <div className="absolute -inset-6 rounded-3xl bg-accent-cyan/5 blur-2xl" />
          <div className="relative rounded-2xl border border-surface-border bg-surface/80 shadow-glow-cyan backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
              <span className="font-mono text-xs uppercase tracking-widest text-ink-secondary">
                Document Analysis
              </span>
              <span className="flex items-center gap-1.5 text-xs text-signal-verified">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal-verified" />
                Live
              </span>
            </div>

            <div className="space-y-3 px-5 py-5 font-mono text-sm">
              <CheckRow label="OCR Extracted" />
              <CheckRow label="Identity Data Consistent" />
              <CheckRow label="Tampering Check Passed" />
              <CheckRow label="Face Match — 97.8%" />
            </div>

            <div className="border-t border-surface-border px-5 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-ink-tertiary">
                    Overall Risk
                  </p>
                  <p className="font-display text-2xl font-semibold text-signal-verified">
                    LOW
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-widest text-ink-tertiary">
                    Status
                  </p>
                  <p className="flex items-center gap-1.5 font-display text-2xl font-semibold text-signal-verified">
                    <CheckCircle2 className="h-5 w-5" />
                    Verified
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CheckRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 text-ink-secondary">
      <CheckCircle2 className="h-4 w-4 shrink-0 text-signal-verified" />
      <span>{label}</span>
    </div>
  );
}
