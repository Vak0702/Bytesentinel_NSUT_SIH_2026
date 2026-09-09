import {
  Fingerprint,
  ScanText,
  ShieldAlert,
  UserCheck,
  Gauge,
  FileSearch,
} from "lucide-react";
import { GlowingCard } from "./ui/glowing-effect";

const CAPABILITIES = [
  {
    title: "Identity Verification",
    description:
      "Cross-checks submitted identity details against the document record for consistency.",
    icon: Fingerprint,
    span: "lg:col-span-4 lg:row-span-2",
  },
  {
    title: "Document Intelligence",
    description:
      "Extracts structured fields from identity documents using OCR.",
    icon: ScanText,
    span: "lg:col-span-2",
  },
  {
    title: "Tampering Detection",
    description:
      "Flags signs of digital manipulation or physical alteration in submitted documents.",
    icon: ShieldAlert,
    span: "lg:col-span-2",
  },
  {
    title: "Face Verification",
    description:
      "Matches the document photo against a live capture to confirm the holder's identity.",
    icon: UserCheck,
    span: "lg:col-span-3",
  },
  {
    title: "Fraud Risk Engine",
    description:
      "Combines every signal into a single, weighted risk score for faster review.",
    icon: Gauge,
    span: "lg:col-span-3",
  },
  {
    title: "Explainable Results",
    description:
      "Every verification includes the specific signals that drove the outcome — never a black box.",
    icon: FileSearch,
    span: "lg:col-span-6",
  },
];

export function CapabilityGrid() {
  return (
    <section id="capabilities" className="section-divider border-t py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14 max-w-2xl">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-accent-cyan">
            Core Capabilities
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink-primary sm:text-4xl">
            One screening pipeline.
            <br />
            Multiple fraud signals.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-6 lg:auto-rows-[160px]">
          {CAPABILITIES.map((cap) => (
            <GlowingCard key={cap.title} className={cap.span}>
              <div className="flex h-full flex-col justify-between p-6">
                <cap.icon className="h-6 w-6 text-accent-cyan" strokeWidth={1.75} />
                <div>
                  <h3 className="font-display text-lg font-semibold text-ink-primary">
                    {cap.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                    {cap.description}
                  </p>
                </div>
              </div>
            </GlowingCard>
          ))}
        </div>
      </div>
    </section>
  );
}
