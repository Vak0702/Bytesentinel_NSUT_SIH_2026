import { ArrowRight } from "lucide-react";
import { GridBackground } from "./ui/grid-background";
import { MovingBorderButton } from "./ui/moving-border";

export function FinalCTA() {
  return (
    <section
      id="start-verification"
      className="section-divider relative overflow-hidden border-t py-28"
    >
      <GridBackground variant="dot" className="opacity-60" />
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-ink-primary text-balance sm:text-4xl">
          Verify before you trust.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-secondary">
          Screen identity documents. Detect suspicious signals. Make better
          verification decisions.
        </p>
        <div className="mt-10 flex justify-center">
          <MovingBorderButton as="a" {...{ href: "#" }}>
            Start Verification
            <ArrowRight className="h-4 w-4" />
          </MovingBorderButton>
        </div>
      </div>
    </section>
  );
}
