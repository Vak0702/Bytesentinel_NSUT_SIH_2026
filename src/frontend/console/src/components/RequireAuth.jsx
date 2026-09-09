/**
 * Renders its children only once the session check has come back clean.
 *
 * This is a UX gate, not a security boundary — the real gate is
 * @login_required on the Flask side. Its job is to stop the console flashing
 * a half-populated dashboard before bouncing an unauthenticated visitor.
 */

import { ShieldCheck, WifiOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function RequireAuth({ children }) {
  const { status, error } = useAuth();

  if (status === "loading") {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center gap-3 bg-base text-ink">
        <ShieldCheck size={28} className="text-info animate-pulse" />
        <div className="text-sm text-ink-muted">Verifying your session…</div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center gap-3 bg-base text-ink px-6 text-center">
        <WifiOff size={28} className="text-danger" />
        <div className="text-base font-semibold">Verification service unreachable</div>
        <div className="text-sm text-ink-muted max-w-md">{error}</div>
        <div className="text-xs text-ink-faint mt-2">
          Start the backend with <span className="mono">python app.py</span> in
          <span className="mono"> backend/</span>, then reload.
        </div>
      </div>
    );
  }

  return children;
}
