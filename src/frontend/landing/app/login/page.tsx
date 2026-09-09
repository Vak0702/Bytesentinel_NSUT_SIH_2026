"use client";

import { useState, type FormEvent } from "react";
import "./login.css";
import { ApiError, login } from "../../lib/api";

// Where to send an officer once the session cookie is set. In dev this is the
// Vite console on :5173; after a production build it becomes /console, served
// by Flask itself. Read from the environment so neither is hardcoded.
const CONSOLE_URL = process.env.NEXT_PUBLIC_CONSOLE_URL || "http://localhost:5173";

export default function LoginPage() {
  // Controlled inputs: React state is the single source of truth for what is
  // in the boxes. That is what lets us disable the button while a request is
  // in flight and clear the error the moment the officer starts retyping.
  const [officerId, setOfficerId] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Stops the browser's default full-page form POST. Without it the page
    // reloads and the fetch below never finishes.
    event.preventDefault();
    if (submitting) return;

    setError(null);
    setSubmitting(true);

    try {
      const result = await login(officerId.trim(), passphrase, remember);

      // The session cookie is already set by the response headers at this
      // point. `redirectTo` comes from the backend config, so the deployment
      // decides the destination rather than this page.
      window.location.href = result.redirectTo || CONSOLE_URL;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign-in failed. Try again.");
      setPassphrase("");
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-glow login-glow-left" />
      <div className="login-glow login-glow-right" />

      <a href="/" className="login-close" aria-label="Back to site">
        ×
      </a>

      <div className="login-container">
        <section className="login-left">
          <div className="login-brand">
            <div className="brand-icon">◇</div>
            <div>
              <div className="brand-name">DASTAVEZ</div>
              <div className="brand-subtitle">OFFICER CONSOLE</div>
            </div>
          </div>

          <div className="login-left-content">
            <div className="restricted-badge">
              <span className="badge-dot" />
              RESTRICTED ACCESS
            </div>

            <h1>
              Where Every
              <br />
              Document
              <br />
              Tells the Truth.
            </h1>

            <p className="login-description">
              This console is limited to authorised verification officers.
              Every session is signed, logged and attributable.
            </p>

            <div className="security-points">
              <div className="security-point">
                <span className="security-icon">♢</span>
                <span>Credentials never leave the departmental perimeter.</span>
              </div>
              <div className="security-point">
                <span className="security-icon">⌑</span>
                <span>Second-factor challenge on every new device.</span>
              </div>
              <div className="security-point">
                <span className="security-icon">◷</span>
                <span>Sessions expire after 15 minutes at the counter.</span>
              </div>
            </div>
          </div>

          <div className="login-left-footer">
            <span>Concept prototype · Smart India Hackathon 2026</span>
            <a href="/">Back to site</a>
          </div>
        </section>

        <section className="login-right">
          <div className="duty-status">
            <span className="status-dot" />
            On duty. Your session is protected.
          </div>

          <div className="login-illustration">
            <div className="illustration-ring" />
            <div className="illustration-card">
              <div className="mini-doc">
                <span />
                <span />
                <span />
              </div>
              <div className="doc-check">✓</div>
            </div>
            <div className="illustration-shield">◇</div>
          </div>

          <div className="login-card">
            <div className="card-header">
              <h2>Officer sign-in</h2>
              <p>Use the credentials issued by your station supervisor.</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="officerId">OFFICER ID</label>
                <input
                  id="officerId"
                  name="officerId"
                  type="text"
                  placeholder="DL001"
                  autoComplete="username"
                  value={officerId}
                  onChange={(e) => {
                    setOfficerId(e.target.value);
                    setError(null);
                  }}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="form-group">
                <div className="password-label-row">
                  <label htmlFor="passphrase">PASSPHRASE</label>
                  <button type="button" className="forgot-button">Forgot?</button>
                </div>
                <input
                  id="passphrase"
                  name="passphrase"
                  type="password"
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  value={passphrase}
                  onChange={(e) => {
                    setPassphrase(e.target.value);
                    setError(null);
                  }}
                  disabled={submitting}
                  required
                />
              </div>

              {error && (
                <div className="login-error" role="alert" aria-live="assertive">
                  {error}
                </div>
              )}

              <label className="trust-device">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  disabled={submitting}
                />
                <span className="custom-checkbox" />
                <span>Trust this terminal for 8 hours</span>
              </label>

              <button type="submit" className="secure-button" disabled={submitting}>
                <span>{submitting ? "Verifying…" : "Secure sign-in"}</span>
                <span className="arrow">{submitting ? "◌" : "→"}</span>
              </button>
            </form>

            <div className="card-security">
              <span>⌑</span>
              <span>
                Unauthorised access is an offence under departmental IT policy.
              </span>
            </div>
          </div>

          <div className="account-request">
            Need an account?
            <span>Requests are raised by your station supervisor.</span>
          </div>
        </section>
      </div>
    </main>
  );
}
