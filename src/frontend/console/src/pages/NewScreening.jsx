import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, User, CreditCard, IdCard, Car, FileCheck2, Loader2, CheckCircle2 } from "lucide-react";
import { Card, Button, Badge } from "../components/ui";
import { useData } from "../context/DataContext";
import { runScreening, uploadDocument } from "../services/api";
import MrzResult from "../components/MrzResult";
import LivenessCapture from "../components/LivenessCapture";
import { useApp } from "../context/AppContext";

// The console's short keys mapped to the enum values the database uses.
const DOCUMENT_TYPE = {
  passport: "PASSPORT",
  face: "FACE",
  visa: "VISA",
  nationalId: "NATIONAL_ID",
  licence: "DRIVING_LICENSE",
  permit: "PERMIT",
};

const docTypes = [
  { key: "passport", label: "Passport", icon: FileText, required: true, uploaded: false, meta: "No file yet" },
  { key: "face", label: "Live face capture", icon: User, required: true, uploaded: false, meta: "No file yet" },
  { key: "visa", label: "Visa", icon: CreditCard, required: false, uploaded: false, meta: "No file yet" },
  { key: "nationalId", label: "National ID card", icon: IdCard, required: false, uploaded: false, meta: "No file yet" },
  { key: "licence", label: "Driving licence", icon: Car, required: false, uploaded: false, meta: "No file yet" },
  { key: "permit", label: "Permit or clearance", icon: FileCheck2, required: false, uploaded: false, meta: "No file yet" },
];

export default function NewScreening() {
  const navigate = useNavigate();
  const { logActivity, showToast } = useApp();
  const { queue, cases, refresh } = useData();
  // Store only the *identity* of the selection, not the object. The queue is
  // re-fetched periodically, so holding a stale object would silently detach
  // the highlighted card from the list it came from.
  const [selectedName, setSelectedName] = useState(null);
  const [result, setResult] = useState(null);
  const [docs, setDocs] = useState(docTypes);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState("");
  const [done, setDone] = useState(false);
  const [scan, setScan] = useState(null);        // OCR + verification result
  const [uploadingKey, setUploadingKey] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [livenessDone, setLivenessDone] = useState(false);
  // Aadhaar is the only two-sided document, so the picker has to know which
  // side is being chosen before it opens.
  const [aadhaarSide, setAadhaarSide] = useState("front");

  // One hidden <input type="file"> reused by every card. Rendering six of them
  // would work too, but this keeps the DOM light and the handler in one place.
  const fileInputRef = useRef(null);
  const pendingKeyRef = useRef(null);

  // The queue arrives asynchronously. Deriving the selection during render
  // (rather than setting it from an effect) means there is never a frame where
  // the queue has loaded but nothing is selected — which would otherwise crash
  // the card list below on `selectedTraveller.name`.
  const selectedTraveller =
    queue.find((q) => q.name === selectedName) ?? queue[0] ?? null;

  const uploadedCount = docs.filter((d) => d.uploaded).length;
  // Screening needs both required documents AND a passed liveness check —
  // running identity checks on a traveller we have not confirmed is present
  // would defeat the point of capturing the frames at all.
  const readyForScreening =
    docs.filter((d) => d.required).every((d) => d.uploaded) && livenessDone;
  const caseData = (selectedTraveller && cases.find((c) => c.traveller === selectedTraveller.name)) ||
    cases[0] || {
      caseId: "—",
      traveller: selectedTraveller?.name || "—",
      nationality: selectedTraveller?.nationality || "—",
      dob: "—",
      visaType: "",
      risk: 0,
      riskLabel: "—",
      reason: "",
      status: "",
    };

  // Prefer the score the backend just computed; fall back to whatever the
  // case record already carried. `caseData` must exist first, hence the order.
  const riskScore = result?.risk ?? caseData?.risk ?? 0;

  function pickFile(key) {
    // The live capture is not a file the officer browses for — it comes from
    // the camera, handled by the LivenessCapture panel below.
    if (key === "face") {
      document.getElementById("liveness-panel")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    pendingKeyRef.current = key;
    setUploadError(null);
    fileInputRef.current?.click();
  }

  async function handleFileChosen(event) {
    const file = event.target.files?.[0];
    const key = pendingKeyRef.current;
    // Reset the input straight away, or picking the same file twice in a row
    // fires no change event and looks like the upload silently failed.
    event.target.value = "";
    if (!file || !key) return;

    setUploadingKey(key);
    setUploadError(null);

    try {
      const result = await uploadDocument(file, {
        caseId: caseData.caseId,
        documentType: DOCUMENT_TYPE[key] ?? "PASSPORT",
        side: key === "nationalId" ? aadhaarSide : undefined,
      });

      // Aadhaar takes two uploads; flip the side so the next pick is the back.
      if (key === "nationalId") {
        setAadhaarSide((current) => (current === "front" ? "back" : "front"));
      }

      setDocs((prev) =>
        prev.map((d) =>
          d.key === key ? { ...d, uploaded: true, meta: file.name } : d
        )
      );

      if (result.ocr || result.verification || result.faceMatch) {
        setScan(result);
        const status = result.verification?.validationStatus
          ?? (result.faceMatch?.status === "NO_MATCH" ? "INVALID" : "REVIEW");
        showToast(
          status === "VALID"
            ? "Passport verified against the record"
            : status === "INVALID"
              ? "Passport does not match the record"
              : "Passport read — manual review needed",
          status === "VALID" ? "safe" : status === "INVALID" ? "danger" : "warn"
        );
        logActivity({
          title: `Document read · ${result.ocr?.fields?.passport_number ?? file.name}`,
          description: result.verification?.message ?? "Document uploaded.",
          badge: "OCR",
          tone: status === "INVALID" ? "danger" : "info",
        });
      } else {
        showToast(`${file.name} uploaded`, "safe");
      }
      refresh();
    } catch (err) {
      setUploadError(err.message);
      showToast(err.message, "danger");
    } finally {
      setUploadingKey(null);
    }
  }

  async function startScreening() {
    setRunning(true);
    setDone(false);
    // The case number is what the backend needs; without one it runs the
    // stage animation and returns an empty result.
    const outcome = await runScreening((s) => setStep(s), caseData.caseId);
    setResult(outcome);
    setRunning(false);
    setDone(true);
    logActivity({
      title: `Screening run · ${caseData.caseId}`,
      description: `Checks completed. Risk score ${outcome?.risk ?? caseData.risk}.`,
      badge: "System",
      tone: "info",
    });
    showToast("Screening complete — result ready", "safe");
    refresh();
  }

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="text-xs tracking-wide text-ink-muted uppercase mb-3">In line now</div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {queue.map((q) => (
            <button
              key={q.name}
              onClick={() => setSelectedName(q.name)}
              className={`shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-colors ${
                selectedTraveller?.name === q.name
                  ? "bg-accent-soft/40 border-accent/40"
                  : "bg-surface-2 border-border-subtle hover:border-border-strong"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-surface border border-border-subtle flex items-center justify-center text-[11px] font-semibold">
                {q.initials}
              </div>
              <div>
                <div className="text-sm font-medium">{q.name}</div>
                <div className="text-xs text-ink-faint">{q.nationality} · {q.waiting}</div>
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className="text-xs tracking-wide text-ink-muted uppercase">Step 1</div>
            <h2 className="text-base font-semibold mt-0.5">Traveller document upload centre</h2>
            <p className="text-sm text-ink-muted mt-1">Passport and a live face capture are required. Everything else helps the checks but is optional.</p>
          </div>
          <Badge tone={readyForScreening ? "safe" : "neutral"}>
            {readyForScreening ? "Ready for screening" : `${uploadedCount}/${docs.length} uploaded`}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          {docs.map((d) => (
            <div key={d.key} className="bg-surface-2 border border-border-subtle rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-surface border border-border-subtle flex items-center justify-center">
                  <d.icon size={15} className="text-ink-muted" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{d.label}</div>
                </div>
                <Badge tone={d.required ? "info" : "neutral"} className="text-[10px]">
                  {d.required ? "Required" : "Optional"}
                </Badge>
              </div>
              <div className="text-xs text-ink-faint mb-3">
                {d.key === "nationalId" && !d.uploaded
                  ? `${d.meta} · next: ${aadhaarSide} side`
                  : d.meta}
              </div>
              <div className="flex items-center justify-between">
                {d.uploaded ? (
                  <Badge tone="safe" className="text-[10px]">Uploaded</Badge>
                ) : (
                  <span className="text-xs text-ink-faint">Waiting for file</span>
                )}
                <button
                  onClick={() => pickFile(d.key)}
                  disabled={uploadingKey === d.key}
                  className="text-xs text-info hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  {uploadingKey === d.key
                    ? "Reading…"
                    : d.uploaded
                      ? "Replace"
                      : "Upload a file"}
                </button>
              </div>
            </div>
          ))}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChosen}
          className="hidden"
        />

        {uploadError && (
          <div
            role="alert"
            className="mt-4 text-sm rounded-lg px-3 py-2 border bg-danger-soft/30 border-danger/30 text-danger"
          >
            {uploadError}
          </div>
        )}

        <div className="flex items-center justify-between mt-5 pt-5 border-t border-border-subtle">
          <div className="flex items-center gap-4 flex-wrap text-xs text-ink-muted">
            {docs.map((d) => (
              <label key={d.key} className="flex items-center gap-1.5">
                <input type="checkbox" readOnly checked={d.uploaded} className="accent-blue-500" />
                {d.label.replace("Live face capture", "Live face captured")}
                {d.key !== "face" && d.uploaded ? " uploaded" : ""}
              </label>
            ))}
          </div>
          <Button variant="primary" disabled={!readyForScreening || running} onClick={startScreening}>
            {running ? <Loader2 size={16} className="animate-spin" /> : null}
            {done ? "Run screening again" : "Start Screening"}
          </Button>
        </div>
      </Card>

      <div id="liveness-panel">
        <LivenessCapture
          caseId={caseData.caseId}
          onVerified={() => {
            setLivenessDone(true);
            setDocs((prev) =>
              prev.map((d) =>
                d.key === "face"
                  ? { ...d, uploaded: true, meta: "Live capture verified" }
                  : d
              )
            );
            showToast("Live person confirmed", "safe");
          }}
        />
      </div>

      {scan && (
        <MrzResult
          ocr={scan.ocr}
          verification={scan.verification}
          faceMatch={scan.faceMatch}
        />
      )}

      {(running || done) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 p-6">
            <div className="text-xs tracking-wide text-ink-muted uppercase mb-1">Step 2 · Traveller at the counter</div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold">{caseData.traveller}</h3>
              <Badge tone="info">Routine</Badge>
            </div>
            <p className="text-sm text-ink-muted mb-4">
              {caseData.nationality} · Passport {caseData.visaType ? "+ tourist visa" : ""} · born {caseData.dob}
            </p>

            {running && (
              <div className="flex items-center gap-3 py-8 justify-center text-ink-muted">
                <Loader2 size={18} className="animate-spin text-info" />
                <span className="text-sm">{step}</span>
              </div>
            )}

            {done && !running && (
              <div className="flex items-center gap-3 py-6 justify-center text-safe">
                <CheckCircle2 size={20} />
                <span className="text-sm font-medium">Screening complete — view full result</span>
              </div>
            )}

            {done && (
              <Button variant="default" onClick={() => navigate(`/screening/${caseData.caseId}`)}>
                Open full screening detail
              </Button>
            )}
          </Card>

          <Card className="p-6 flex flex-col items-center justify-center text-center">
            <div className="text-xs tracking-wide text-ink-muted uppercase mb-3">Step 3 · Overall risk score</div>
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" stroke="var(--color-border-subtle)" strokeWidth="8" fill="none" />
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  stroke="var(--color-safe)"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={2 * Math.PI * 44}
                  strokeDashoffset={2 * Math.PI * 44 * (1 - (done ? riskScore : 0) / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div>
                <div className="text-3xl font-semibold text-safe">{done ? riskScore : "–"}</div>
                <div className="text-[10px] text-ink-faint uppercase">Out of 100</div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
