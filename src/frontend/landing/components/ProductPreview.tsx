"use client";

import { useState } from "react";
import { FileText, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const METRICS = [
  { label: "Identity Match", value: 97.8 },
  { label: "Document Authenticity", value: 94.2 },
  { label: "Face Match", value: 96.7 },
  { label: "Tampering Risk", value: 2.4, inverse: true },
];

const TABS = ["Verification Result", "Extracted Fields", "Analysis Timeline"];

const FIELDS = [
  { label: "Full Name", value: "As submitted" },
  { label: "Date of Birth", value: "As submitted" },
  { label: "Document Number", value: "Consistent" },
  { label: "Issuing Authority", value: "Recognized" },
  { label: "Expiry Date", value: "Valid" },
];

const EVENTS = [
  { t: "00:00.4s", label: "Document uploaded" },
  { t: "00:01.1s", label: "OCR extraction complete" },
  { t: "00:02.6s", label: "Tampering check passed" },
  { t: "00:03.3s", label: "Face match computed — 96.7%" },
  { t: "00:03.9s", label: "Risk score generated" },
];

export function ProductPreview() {
  const [tab, setTab] = useState(0);

  return (
    <section className="section-divider border-t py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-14 max-w-2xl">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-accent-cyan">
            Product Preview
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink-primary sm:text-4xl">
            The screening dashboard
          </h2>
        </div>

        <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface/70 shadow-glow-blue">
          {/* window chrome */}
          <div className="flex items-center gap-2 border-b border-surface-border px-5 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-signal-flagged/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-signal-review/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-signal-verified/60" />
            <span className="ml-3 font-mono text-xs text-ink-tertiary">
              DASTAVEZ.app / results / case-04821
            </span>
          </div>

          {/* tabs */}
          <div className="flex gap-1 border-b border-surface-border px-3">
            {TABS.map((label, i) => (
              <button
                key={label}
                onClick={() => setTab(i)}
                className={cn(
                  "px-4 py-3 text-sm font-medium transition-colors focus-ring",
                  tab === i
                    ? "border-b-2 border-accent-cyan text-ink-primary"
                    : "border-b-2 border-transparent text-ink-secondary hover:text-ink-primary"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-8 p-6 lg:grid-cols-[220px_1fr] lg:p-8">
            {/* document preview column */}
            <div className="rounded-xl border border-surface-border bg-void/60 p-4">
              <div className="flex aspect-[3/4] items-center justify-center rounded-lg border border-dashed border-surface-border">
                <FileText className="h-8 w-8 text-ink-tertiary" strokeWidth={1.5} />
              </div>
              <p className="mt-3 text-center font-mono text-[11px] text-ink-tertiary">
                Document Preview
              </p>
            </div>

            {/* main panel, changes per tab */}
            <div>
              {tab === 0 && (
                <div>
                  <div className="space-y-5">
                    {METRICS.map((m) => (
                      <div key={m.label}>
                        <div className="mb-1.5 flex items-center justify-between text-sm">
                          <span className="text-ink-secondary">{m.label}</span>
                          <span className="font-mono text-ink-primary">
                            {m.value}% <CheckCircle2 className="ml-1 inline h-3.5 w-3.5 text-signal-verified" />
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-border/60">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              m.inverse ? "bg-signal-verified" : "bg-gradient-to-r from-accent to-accent-cyan"
                            )}
                            style={{ width: `${m.inverse ? 100 - m.value : m.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 flex flex-col gap-6 border-t border-surface-border pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-8">
                      <div>
                        <p className="text-[11px] uppercase tracking-widest text-ink-tertiary">
                          Data Consistency
                        </p>
                        <p className="font-display text-lg font-semibold text-signal-verified">
                          High
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-widest text-ink-tertiary">
                          Overall Risk
                        </p>
                        <p className="font-display text-lg font-semibold text-signal-verified">
                          Low
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-signal-verified/30 bg-signal-verified/10 px-3 py-1.5 text-sm font-semibold text-signal-verified">
                      <CheckCircle2 className="h-4 w-4" />
                      Verified
                    </span>
                  </div>
                </div>
              )}

              {tab === 1 && (
                <div className="divide-y divide-surface-border/70 font-mono text-sm">
                  {FIELDS.map((f) => (
                    <div key={f.label} className="flex items-center justify-between py-3">
                      <span className="text-ink-secondary">{f.label}</span>
                      <span className="text-signal-verified">{f.value} ✓</span>
                    </div>
                  ))}
                </div>
              )}

              {tab === 2 && (
                <ul className="space-y-4">
                  {EVENTS.map((e) => (
                    <li key={e.label} className="flex items-start gap-3 text-sm">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-cyan" />
                      <span className="font-mono text-ink-tertiary">{e.t}</span>
                      <span className="text-ink-secondary">{e.label}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
