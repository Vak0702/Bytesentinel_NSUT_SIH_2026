import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { Card, Button, Badge } from "./ui";
import { submitLiveness } from "../services/api";

/**
 * Liveness capture — three frames, one per head position.
 *
 * Why three and not one: a single photo proves nothing, because a photo of a
 * photo looks identical to the camera. Asking the traveller to turn left, then
 * right, then face forward, and checking that each frame actually shows that
 * pose, is a cheap way to establish a real person is present. Someone holding
 * up a printed photo cannot produce all three.
 *
 * This runs ONCE per traveller. The centre frame is kept by the backend as the
 * live reference, and every document uploaded afterwards is matched against
 * it — so the officer never has to repeat this per document.
 */

const STEPS = [
  { key: "left", label: "Turn your head LEFT", hint: "Look over your left shoulder" },
  { key: "right", label: "Turn your head RIGHT", hint: "Look over your right shoulder" },
  { key: "centre", label: "Face the camera", hint: "Look straight ahead" },
];

export default function LivenessCapture({ caseId, onVerified }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [stepIndex, setStepIndex] = useState(0);
  const [frames, setFrames] = useState({});
  const [cameraError, setCameraError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setCameraError(
        err.name === "NotAllowedError"
          ? "Camera permission was denied. Allow it in the browser's address bar and try again."
          : `Could not open the camera: ${err.message}`
      );
    }
  }, []);

  useEffect(() => {
    startCamera();
    // Releasing the camera on unmount matters: without this the webcam light
    // stays on after the officer navigates away, which is both alarming and a
    // genuine privacy problem at a counter.
    return stopCamera;
  }, [startCamera, stopCamera]);

  function captureFrame() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        const step = STEPS[stepIndex];
        setFrames((prev) => ({ ...prev, [step.key]: blob }));
        setStepIndex((index) => index + 1);
      },
      "image/jpeg",
      0.92
    );
  }

  async function submit() {
    setSubmitting(true);
    setResult(null);
    try {
      const outcome = await submitLiveness({ ...frames, caseId });
      setResult(outcome);
      if (outcome.passed) {
        stopCamera();
        onVerified?.(outcome);
      }
    } catch (err) {
      setResult({ passed: false, message: err.message, detected: {} });
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setFrames({});
    setStepIndex(0);
    setResult(null);
    startCamera();
  }

  const allCaptured = stepIndex >= STEPS.length;
  const currentStep = STEPS[stepIndex];

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs tracking-wide text-ink-muted uppercase">
            Liveness check
          </div>
          <h3 className="text-base font-semibold mt-0.5">
            Confirm a live person is present
          </h3>
          <p className="text-sm text-ink-muted mt-1">
            Three frames, once per traveller. Every document uploaded afterwards
            is matched against this capture automatically.
          </p>
        </div>
        {result?.passed && <Badge tone="safe">Verified</Badge>}
      </div>

      {cameraError ? (
        <div
          role="alert"
          className="text-sm rounded-lg px-3 py-2 border bg-danger-soft/30 border-danger/30 text-danger"
        >
          {cameraError}
        </div>
      ) : (
        <div className="relative rounded-lg overflow-hidden bg-surface-2 border border-border-subtle">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-h-72 object-cover"
          />
          {!allCaptured && currentStep && (
            <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white px-4 py-3">
              <div className="text-sm font-semibold">{currentStep.label}</div>
              <div className="text-xs opacity-80">{currentStep.hint}</div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        {STEPS.map((step, index) => (
          <Badge
            key={step.key}
            tone={frames[step.key] ? "safe" : index === stepIndex ? "info" : "neutral"}
            className="text-[10px]"
          >
            {frames[step.key] ? "✓ " : ""}
            {step.key}
          </Badge>
        ))}
      </div>

      {result && (
        <div
          role="alert"
          className={`text-sm rounded-lg px-3 py-2 border flex items-start gap-2 ${
            result.passed
              ? "bg-safe-soft/30 border-safe/30 text-safe"
              : "bg-danger-soft/30 border-danger/30 text-danger"
          }`}
        >
          {result.passed ? (
            <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
          ) : (
            <XCircle size={15} className="shrink-0 mt-0.5" />
          )}
          <span>{result.message}</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        {!allCaptured ? (
          <Button variant="primary" onClick={captureFrame} disabled={!!cameraError}>
            <Camera size={16} />
            Capture {currentStep?.key}
          </Button>
        ) : (
          <Button variant="primary" onClick={submit} disabled={submitting || result?.passed}>
            {submitting ? "Checking…" : result?.passed ? "Verified" : "Check liveness"}
          </Button>
        )}
        {(allCaptured || Object.keys(frames).length > 0) && !result?.passed && (
          <Button variant="ghost" onClick={reset}>
            <RotateCcw size={15} />
            Start over
          </Button>
        )}
      </div>
    </Card>
  );
}
