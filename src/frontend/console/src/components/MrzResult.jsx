import { AlertTriangle, CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import { Card, Badge } from "./ui";

/**
 * Shows what the OCR read off the passport next to what the database holds,
 * field by field.
 *
 * The design decision worth explaining: this deliberately does NOT collapse to
 * a single verdict. An officer at a counter needs to know *which* field
 * disagrees — a wrong expiry date and a wrong date of birth mean very
 * different things, and a green tick that hides both is worse than useless.
 * The overall status is shown too, but as a summary of the rows, not a
 * replacement for them.
 */

const STATUS_STYLE = {
  MATCH: { icon: CheckCircle2, tone: "safe", label: "Match" },
  PARTIAL: { icon: AlertTriangle, tone: "warn", label: "Close" },
  MISMATCH: { icon: XCircle, tone: "danger", label: "Mismatch" },
  NOT_CHECKED: { icon: HelpCircle, tone: "neutral", label: "Not checked" },
};

const VERDICT = {
  VALID: { tone: "safe", label: "Verified against record" },
  INVALID: { tone: "danger", label: "Does not match record" },
  REVIEW: { tone: "warn", label: "Needs manual review" },
};

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

const FACE_STATUS = {
  MATCH: { tone: "safe", label: "Face matches" },
  NO_MATCH: { tone: "danger", label: "Face does not match" },
  REVIEW: { tone: "warn", label: "Face inconclusive" },
  NOT_CHECKED: { tone: "neutral", label: "Face not checked" },
};

export default function MrzResult({ ocr, verification, faceMatch }) {
  if (!ocr && !verification && !faceMatch) return null;

  const verdict = VERDICT[verification?.validationStatus] ?? VERDICT.REVIEW;
  const confidencePercent = ocr ? Math.round((ocr.confidence ?? 0) * 100) : null;

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs tracking-wide text-ink-muted uppercase">
            Machine-readable zone
          </div>
          <h3 className="text-base font-semibold mt-0.5">
            {formatValue(ocr?.fields?.passport_number)}
          </h3>
          {confidencePercent !== null && (
            <p className="text-xs text-ink-faint mt-1">
              Read confidence {confidencePercent}%
            </p>
          )}
        </div>
        <Badge tone={verdict.tone}>{verdict.label}</Badge>
      </div>

      {verification?.message && (
        <div
          className={`text-sm rounded-lg px-3 py-2 border ${
            verdict.tone === "danger"
              ? "bg-danger-soft/30 border-danger/30 text-danger"
              : verdict.tone === "warn"
                ? "bg-warn-soft/30 border-warn/30 text-warn"
                : "bg-safe-soft/30 border-safe/30 text-safe"
          }`}
        >
          {verification.message}
        </div>
      )}

      {/* Field comparison ------------------------------------------------ */}
      {verification?.comparisons?.length > 0 && (
        <div>
          <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-x-4 gap-y-2 text-xs">
            <div className="text-ink-faint uppercase tracking-wide">Field</div>
            <div className="text-ink-faint uppercase tracking-wide">On document</div>
            <div className="text-ink-faint uppercase tracking-wide">On record</div>
            <div className="text-ink-faint uppercase tracking-wide text-right">Result</div>

            {verification.comparisons.map((row) => {
              const style = STATUS_STYLE[row.status] ?? STATUS_STYLE.NOT_CHECKED;
              const Icon = style.icon;
              return (
                <div key={row.field} className="contents">
                  <div className="text-sm text-ink-muted py-1.5 border-t border-border-subtle">
                    {row.field}
                  </div>
                  <div className="text-sm mono py-1.5 border-t border-border-subtle">
                    {formatValue(row.extracted)}
                  </div>
                  <div className="text-sm mono py-1.5 border-t border-border-subtle text-ink-muted">
                    {formatValue(row.onRecord)}
                  </div>
                  <div className="py-1.5 border-t border-border-subtle flex items-center justify-end gap-1.5">
                    <Icon
                      size={14}
                      className={
                        style.tone === "safe"
                          ? "text-safe"
                          : style.tone === "danger"
                            ? "text-danger"
                            : style.tone === "warn"
                              ? "text-warn"
                              : "text-ink-faint"
                      }
                    />
                    <span className="text-xs text-ink-muted">{style.label}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {typeof verification.matchScore === "number" && (
            <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between">
              <span className="text-xs text-ink-muted">Overall field agreement</span>
              <span className="text-sm font-semibold mono">
                {verification.matchScore}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* Integrity checks ------------------------------------------------ */}
      {ocr?.checks && Object.keys(ocr.checks).length > 0 && (
        <div>
          <div className="text-xs tracking-wide text-ink-muted uppercase mb-2">
            ICAO check digits
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ocr.checks).map(([field, passed]) => (
              <Badge
                key={field}
                tone={passed === true ? "safe" : passed === false ? "danger" : "neutral"}
                className="text-[10px]"
              >
                {field.replace(/_/g, " ")}:{" "}
                {passed === true ? "valid" : passed === false ? "failed" : "not read"}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-ink-faint mt-2">
            Each MRZ field carries a digit computed from its own characters. A
            failure means the line was misread or altered after printing.
          </p>
        </div>
      )}

      {/* Face match ------------------------------------------------------ */}
      {faceMatch && (
        <div>
          <div className="text-xs tracking-wide text-ink-muted uppercase mb-2">
            Face on document vs live capture
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge tone={(FACE_STATUS[faceMatch.status] ?? FACE_STATUS.NOT_CHECKED).tone}>
              {(FACE_STATUS[faceMatch.status] ?? FACE_STATUS.NOT_CHECKED).label}
            </Badge>
            {typeof faceMatch.similarity === "number" && (
              <span className="text-sm mono text-ink-muted">
                similarity {faceMatch.similarity.toFixed(3)}
                {typeof faceMatch.threshold === "number" &&
                  ` / threshold ${faceMatch.threshold.toFixed(2)}`}
              </span>
            )}
          </div>
          <p className="text-sm text-ink-muted mt-2">{faceMatch.message}</p>
        </div>
      )}

      {/* Parser warnings -------------------------------------------------- */}
      {ocr?.issues?.length > 0 && (
        <div>
          <div className="text-xs tracking-wide text-ink-muted uppercase mb-2">
            Notes from the reader
          </div>
          <ul className="space-y-1">
            {ocr.issues.map((issue) => (
              <li key={issue} className="text-sm text-ink-muted flex gap-2">
                <AlertTriangle size={14} className="text-warn shrink-0 mt-0.5" />
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
