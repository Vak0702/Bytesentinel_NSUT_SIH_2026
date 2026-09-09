import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, ScanEye } from "lucide-react";
import { Card, Badge, Button, ConfidenceField, riskTone } from "../components/ui";
import { useData } from "../context/DataContext";
import { submitDecision } from "../services/api";
import { useApp } from "../context/AppContext";

const fields = [
  ["Full Name", "traveller", 99],
  ["Passport Number", "passport", 98],
  ["Nationality", "nationality", 98],
  ["Date of Birth", "dob", 99],
  ["Sex", "sex", 98],
  ["Passport Expiry", "passportExpiry", 98],
  ["Visa Number", "visaNumber", 99],
  ["Visa Type", "visaType", 99],
  ["Visa Expiry", "visaExpiry", 98],
  ["Entry Validity", "entryValidity", 99],
  ["Stay Allowed", "stayAllowed", 97],
  ["National ID", "nationalId", 98],
];

const checks = [
  {
    id: "ocr",
    step: 1,
    title: "Read the details",
    subtitle: "OCR EXTRACTION",
    status: "Clear",
    text: "All twelve fields read cleanly. Nothing blurred or missing.",
    metrics: ["12 fields", "98% sure", "1.2s"],
  },
  {
    id: "rules",
    step: 2,
    title: "Check the rules",
    subtitle: "DOCUMENT VALIDATION",
    status: "Clear",
    text: "Dates, number format and visa validity all line up.",
    metrics: ["6/6 passed", "100% score", "0.8s"],
  },
  {
    id: "forensic",
    step: 3,
    title: "Look for tampering",
    subtitle: "FORENSIC ANALYSIS",
    status: "Clear",
    text: "Photo, text and stamp look original. No editing found.",
    metrics: ["No areas", "99% sure", "2.1s"],
    expandable: true,
  },
  {
    id: "face",
    step: 4,
    title: "Match the face",
    subtitle: "BIOMETRIC MATCH",
    status: "Clear",
    text: "Face at the counter matches the passport photo at 96%.",
    metrics: ["96% match", "quality 92", "0.6s"],
  },
];

const timelineSteps = [
  { label: "Documents received", time: "01:48:29" },
  { label: "Details read from the page", time: "01:48:30" },
  { label: "Rules and registers checked", time: "01:48:32" },
  { label: "Tampering scan finished", time: "01:48:33" },
  { label: "Face compared with the photo", time: "01:48:34" },
  { label: "Risk score produced", time: null },
  { label: "Officer decision", time: null },
];

export default function ScreeningDetail() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { cases, refresh } = useData();
  const c = cases.find((row) => row.caseId === caseId);
  const { recordDecision, decisions, showToast } = useApp();
  const [expanded, setExpanded] = useState("forensic");
  const [decision, setDecision] = useState(decisions[caseId] || null);

  if (!c) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-ink-muted">No case found for “{caseId}”.</p>
        <Button className="mt-4" onClick={() => navigate("/cases")}>Back to case history</Button>
      </Card>
    );
  }

  const tone = riskTone(c.risk);
  const toneText = { safe: "text-safe", warn: "text-warn", danger: "text-danger" }[tone];
  const toneRing = {
    safe: "var(--color-safe)",
    warn: "var(--color-warn)",
    danger: "var(--color-danger)",
  }[tone];

  async function decide(label) {
    // Optimistic update: paint the decision immediately so the counter does
    // not feel laggy, then roll it back if the write actually failed. A
    // decision that only exists in the browser is worse than none at all.
    const previous = decision;
    setDecision(label);
    try {
      await submitDecision(c.caseId, label);
      recordDecision(c.caseId, label);
      showToast(
        `${label} — decision recorded for ${c.caseId}`,
        tone === "danger" && label !== "Clear traveller" ? "danger" : "safe"
      );
      refresh();
    } catch (err) {
      setDecision(previous);
      showToast(`Could not record the decision: ${err.message}`, "danger");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-ink-faint mono">{c.caseId}</div>
          <h2 className="text-lg font-semibold">{c.traveller}</h2>
        </div>
        <Badge tone={tone}>{c.riskLabel || (c.risk >= 71 ? "High risk" : c.risk >= 41 ? "Medium risk" : "Low risk")}</Badge>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left + center column */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex gap-5">
              <div className="w-24 h-24 rounded-lg bg-surface-2 border border-border-subtle flex flex-col items-center justify-center shrink-0">
                <span className="text-2xl font-semibold text-ink-muted">{c.initials}</span>
                <span className="text-[9px] text-ink-faint mt-1">Photo from passport</span>
              </div>
              <div className="grid grid-cols-3 gap-x-6 gap-y-4 flex-1">
                {fields.map(([label, key, confidence]) => (
                  <ConfidenceField key={key} label={label} value={c[key] || "—"} confidence={confidence} />
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Document on the scanner</h3>
              <div className="flex items-center gap-2">
                <Badge tone="info"><ScanEye size={12} /> Heat view on</Badge>
                <span className="text-xs text-ink-faint">Passport + tourist visa</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-surface-2 to-surface border border-border-subtle rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[11px] tracking-widest text-ink-muted uppercase">
                  {c.nationality === "Vietnam" ? "Socialist Republic of Viet Nam" : `Republic of ${c.nationality}`}
                  <div className="text-base font-semibold text-ink normal-case tracking-normal mt-0.5">Passport</div>
                </div>
                <div className="w-9 h-9 rounded-full border border-border-strong flex items-center justify-center text-[9px] text-ink-faint">SEAL</div>
              </div>
              <div className="flex gap-5">
                <div className="w-20 h-24 rounded-md bg-surface-2 border border-border-subtle flex items-center justify-center text-lg font-semibold text-ink-muted shrink-0">
                  {c.initials}
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm flex-1">
                  <div>
                    <div className="text-[10px] tracking-wide text-ink-faint uppercase">Full name</div>
                    <div className="mono mt-0.5">{c.traveller?.toUpperCase()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] tracking-wide text-ink-faint uppercase">Passport No.</div>
                    <div className="mono mt-0.5">{c.passport}</div>
                  </div>
                  <div>
                    <div className="text-[10px] tracking-wide text-ink-faint uppercase">Date of birth</div>
                    <div className="mt-0.5">{c.dob || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] tracking-wide text-ink-faint uppercase">Valid until</div>
                    <div className="mt-0.5">{c.passportExpiry || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] tracking-wide text-ink-faint uppercase">Nationality</div>
                    <div className="mt-0.5">{c.nationality}</div>
                  </div>
                  <div>
                    <div className="text-[10px] tracking-wide text-ink-faint uppercase">Sex</div>
                    <div className="mt-0.5">{c.sex || "—"}</div>
                  </div>
                </div>
              </div>
              {c.mrz && (
                <div className="mt-5 bg-overlay border border-border-subtle rounded-lg px-4 py-3 mono text-xs text-ink-muted tracking-widest whitespace-pre-wrap leading-relaxed">
                  {c.mrz}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-ink-faint">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-danger" /> Region flagged by the tampering check</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-info" /> Heat shows how strongly the pixels were edited</span>
            </div>
          </Card>

          <Card className="p-6">
            <div className="text-xs tracking-wide text-ink-muted uppercase mb-1">Step 4 · The four checks</div>
            <p className="text-sm text-ink-faint mb-4">Select a card to open the evidence behind it.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {checks.map((check) => (
                <div key={check.id} className="bg-surface-2 border border-border-subtle rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-surface border border-border-subtle flex items-center justify-center text-[10px] font-semibold">
                        {check.step}
                      </span>
                      <span className="text-sm font-semibold">{check.title}</span>
                    </div>
                  </div>
                  <div className="text-[10px] tracking-wide text-ink-faint uppercase mb-2">{check.subtitle}</div>
                  <Badge tone="safe" className="mb-2">{check.status}</Badge>
                  <p className="text-xs text-ink-muted mb-3">{check.text}</p>
                  <div className="flex items-center gap-3 text-[11px] text-ink-faint mono mb-2">
                    {check.metrics.map((m) => <span key={m}>{m}</span>)}
                  </div>
                  <div className="h-1 bg-overlay rounded-full overflow-hidden mb-3">
                    <div className="h-full bg-safe rounded-full w-full" />
                  </div>
                  {check.expandable && (
                    <button
                      onClick={() => setExpanded(expanded === check.id ? null : check.id)}
                      className="text-xs text-info hover:underline flex items-center gap-1"
                    >
                      {expanded === check.id ? "Hide the evidence" : "See the evidence"}
                      {expanded === check.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  )}
                  {!check.expandable && (
                    <button className="text-xs text-info hover:underline flex items-center gap-1">
                      See the evidence <ChevronDown size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {expanded === "forensic" && (
              <div className="mt-4 border-t border-border-subtle pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold">Looking for tampering · forensic analysis</h4>
                  <button onClick={() => setExpanded(null)} className="text-xs text-ink-faint hover:text-ink">Close</button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <div className="text-[11px] tracking-wide text-ink-muted uppercase mb-2">Suspicious areas found</div>
                    <div className="bg-surface-2 border border-border-subtle rounded-lg p-4 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <Badge tone="safe">Clear</Badge>
                        <div>
                          <div className="text-sm font-medium">Nothing found</div>
                          <div className="text-xs text-ink-muted mt-1">
                            No photo replacement, text edits, cloning or stamp problems were detected on this page.
                          </div>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-safe shrink-0">99%</span>
                    </div>
                    <p className="text-xs text-ink-faint mt-3">
                      No pixel-level edits, cloning or re-prints were found anywhere on the page.
                    </p>
                  </div>
                  <div>
                    <div className="text-[11px] tracking-wide text-ink-muted uppercase mb-2">File details behind the scan</div>
                    <div className="space-y-2.5 text-sm">
                      {[
                        ["Captured by", "Counter 04 flatbed scanner"],
                        ["Captured at", "05 Sep 2026, 09:52:11"],
                        ["Editing software in file", "None"],
                        ["Compression history", "Single pass, original"],
                        ["Error-level analysis", "Even across the page"],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between">
                          <span className="text-ink-muted">{label}</span>
                          <span className="mono text-ink-faint">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs tracking-wide text-ink-muted uppercase">Step 5 · Summary for the file</div>
                <h3 className="text-sm font-semibold mt-1">What the screening found</h3>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => showToast("Exporting case PDF...", "safe")}>Export PDF</Button>
                <Button onClick={() => showToast("Sending to printer...", "safe")}>Print</Button>
                <Button variant="primary" onClick={() => showToast("Case file saved", "safe")}>Save as case file</Button>
              </div>
            </div>
            <p className="text-sm text-ink-muted leading-relaxed">
              Details were read from passport{c.visaType ? " + tourist visa" : ""} with 98% average confidence.
              6 of 6 rule checks passed. The tampering scan found no edits. The face at the counter scored 96%
              against the passport photo. Overall risk came out at {c.risk} of 100 — {(c.riskLabel || "").toLowerCase() || "low risk"}.
              All four checks passed with high confidence{c.status !== "Under investigation" ? " and no watchlist match." : "."}
            </p>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card className="p-6 text-center">
            <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" stroke="var(--color-border-subtle)" strokeWidth="8" fill="none" />
                <circle
                  cx="50" cy="50" r="44" stroke={toneRing} strokeWidth="8" fill="none"
                  strokeDasharray={2 * Math.PI * 44}
                  strokeDashoffset={2 * Math.PI * 44 * (1 - c.risk / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div>
                <div className={`text-3xl font-semibold ${toneText}`}>{c.risk}</div>
                <div className="text-[10px] text-ink-faint uppercase">Out of 100</div>
              </div>
            </div>
            <Badge tone={tone} className="mt-3">{c.riskLabel || "Risk"}</Badge>
            <p className="text-xs text-ink-muted mt-3">
              {c.risk <= 40
                ? "Nothing unusual found. The document, the rules and the face all agree."
                : "Discrepancies were found across one or more checks. Review the evidence before deciding."}
            </p>

            <div className="mt-5 text-left">
              <div className="flex items-center justify-between text-[11px] tracking-wide text-ink-muted uppercase mb-1.5">
                <span>What pushed the score up</span>
                <span className="mono text-ink-faint">{c.risk <= 40 ? "4%" : `${c.risk}%`}</span>
              </div>
              <div className="h-1 bg-overlay rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${c.risk <= 40 ? 4 : c.risk}%`, background: toneRing }} />
              </div>
              <p className="text-xs text-ink-faint mt-1.5">
                {c.risk <= 40 ? "No risk factors found" : c.reason || "See evidence for details"}
              </p>
            </div>

            <div className={`mt-4 rounded-lg p-4 text-left border ${tone === "safe" ? "bg-safe-soft border-safe/30" : tone === "warn" ? "bg-warn-soft border-warn/30" : "bg-danger-soft border-danger/30"}`}>
              <div className="text-[10px] tracking-wide uppercase text-ink-faint mb-1">System recommendation</div>
              <div className={`text-sm font-semibold ${toneText}`}>
                {c.risk <= 40 ? "Clear traveller" : c.risk <= 70 ? "Send for manual review" : "Flag traveller"}
              </div>
              <p className="text-xs text-ink-muted mt-1">
                {c.risk <= 40
                  ? "All four checks passed with high confidence and no watchlist match."
                  : "One or more checks raised concerns. Confirm with the evidence before deciding."}
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-semibold mb-4">Step 6 · What happened, in order</h3>
            <div className="space-y-4">
              {timelineSteps.map((s, i) => (
                <div key={s.label} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`w-2.5 h-2.5 rounded-full ${s.time ? "bg-safe" : "bg-border-strong"}`} />
                    {i < timelineSteps.length - 1 && <span className="w-px h-8 bg-border-subtle mt-1" />}
                  </div>
                  <div className="flex-1 -mt-0.5">
                    <div className="text-sm font-medium">{s.label}</div>
                    <div className="text-xs text-ink-faint mt-0.5">
                      {s.time ? "Completed automatically" : s.label === "Officer decision" ? "Waiting for you" : "Queued"}
                    </div>
                  </div>
                  {s.time && <span className="text-xs text-ink-faint mono">{s.time}</span>}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <div className="text-xs tracking-wide text-ink-muted uppercase mb-1">Step 7 · Officer decision required</div>
            <h3 className="text-base font-semibold mt-1 mb-1">Would you like to flag this traveller?</h3>
            <p className="text-sm text-ink-muted mb-4">
              The system suggests: {c.risk <= 40 ? "Clear traveller" : c.risk <= 70 ? "Manual review" : "Flag traveller"}. The decision remains yours.
            </p>
            <div className="space-y-2">
              <Button variant="safe" className="w-full" onClick={() => decide("Cleared")}>Clear traveller</Button>
              <Button variant="warn" className="w-full" onClick={() => decide("Manual review")}>Send for manual review</Button>
              <Button variant="danger" className="w-full" onClick={() => decide("Flagged")}>Flag traveller</Button>
            </div>
            {decision && (
              <p className="text-xs text-ink-faint mt-3 text-center">
                Decision recorded: <span className="text-ink font-medium">{decision}</span>
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
