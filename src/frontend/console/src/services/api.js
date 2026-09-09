/**
 * Service layer — the only file in the console that knows the API exists.
 *
 * Every page calls these functions and gets back plain objects in the shape
 * it already renders. When a backend module changes, this file changes and
 * nothing else does. The mock modules in ../data are still imported, but now
 * only as fallbacks for when the backend is not running.
 */

import { request, upload, withFallback } from "./client";

import { mockCases, queueNow, officers as mockOfficers } from "../data/cases";
import { investigations as mockInvestigations } from "../data/investigations";
import {
  blacklistedPassports,
  fraudIdentities,
  travelAlerts,
  watchlistAlertBanner,
} from "../data/watchlist";
import { initialActivity } from "../data/activity";
import {
  summaryStats,
  weeklyForgery,
  accuracyBreakdown,
  casesByCountry,
  officerPerformance,
  riskDistribution,
  weeklyScreeningActivity,
} from "../data/analytics";

/* ---------------------------------------------------------------- auth -- */

export function getSession() {
  // No fallback: whether someone is signed in is not something to guess at.
  return request("/auth/me");
}

export function logout() {
  return request("/auth/logout", { method: "POST" });
}

export function getOfficers() {
  return withFallback(() => request("/auth/officers"), mockOfficers, "getOfficers");
}

/* --------------------------------------------------------------- cases -- */

export function getCases(filters = {}) {
  const query = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v && v !== "any")
  ).toString();
  return withFallback(
    () => request(`/cases${query ? `?${query}` : ""}`),
    mockCases,
    "getCases"
  );
}

export function getCaseById(caseId) {
  return withFallback(() => request(`/cases/${caseId}`), null, "getCaseById");
}

export function getFlaggedTravellers() {
  return withFallback(() => request("/cases/flagged"), [], "getFlaggedTravellers");
}

export function getInvestigations() {
  return withFallback(() => request("/cases/investigations"), mockInvestigations, "getInvestigations");
}

export function getQueue() {
  return withFallback(() => request("/cases/queue"), queueNow, "getQueue");
}

export function submitDecision(caseId, decision) {
  // No fallback on writes. Silently "succeeding" an unsaved decision would be
  // far worse than showing the officer an error.
  return request(`/cases/${caseId}/decision`, { method: "POST", body: { decision } });
}

/* ----------------------------------------------------------- watchlist -- */

export function getWatchlist() {
  return withFallback(
    () => request("/watchlist"),
    { blacklistedPassports, fraudIdentities, travelAlerts, watchlistAlertBanner },
    "getWatchlist"
  );
}

/* ----------------------------------------------------------- analytics -- */

export function getAnalytics() {
  return withFallback(
    () => request("/analytics"),
    {
      summaryStats,
      weeklyForgery,
      accuracyBreakdown,
      casesByCountry,
      officerPerformance,
      riskDistribution,
      weeklyScreeningActivity,
    },
    "getAnalytics"
  );
}

export function getOfficerActivity() {
  return withFallback(() => request("/activity"), initialActivity, "getOfficerActivity");
}

/* ----------------------------------------------------------- documents -- */

/** Which pipelines the backend can actually run right now. */
export function getCapabilities() {
  return withFallback(
    () => request("/documents/capabilities"),
    { passportOcr: false, tampering: false, faceMatch: false },
    "getCapabilities"
  );
}

/**
 * Send a document image for OCR and database verification.
 *
 * No fallback: an upload that silently "succeeded" without reaching the
 * server would be worse than an error the officer can see.
 */
export function uploadDocument(file, { caseId, documentType = "PASSPORT", side } = {}) {
  const form = new FormData();
  form.append("file", file);
  form.append("documentType", documentType);
  // Aadhaar carries different data on each side, so the backend needs to know
  // which one this is before it can cross-check the number between them.
  if (side) form.append("side", side);
  if (caseId && caseId !== "\u2014") form.append("caseId", caseId);
  return upload("/documents/upload", form);
}

/**
 * Send the three head-turn frames that prove a live person is present.
 *
 * Run once per traveller. On success the backend keeps the centre frame as
 * that case's live reference, and every document uploaded afterwards is
 * face-matched against it automatically.
 */
export function submitLiveness({ left, right, centre, caseId }) {
  const form = new FormData();
  form.append("frameLeft", left);
  form.append("frameRight", right);
  form.append("frameCentre", centre);
  if (caseId && caseId !== "\u2014") form.append("caseId", caseId);
  return upload("/documents/liveness", form);
}

/* ----------------------------------------------------------- screening -- */

export function getPipelineStages() {
  return withFallback(
    () => request("/screening/stages"),
    [
      { key: "extraction", label: "Reading document" },
      { key: "validation", label: "Checking rules" },
      { key: "tampering", label: "Scanning for tampering" },
      { key: "face", label: "Comparing face" },
      { key: "risk", label: "Calculating risk" },
    ],
    "getPipelineStages"
  );
}

/**
 * Run the pipeline for a case, calling `onStep` as each stage starts so the
 * progress list animates. The stages come from the server; the pacing is
 * cosmetic and lives here.
 */
export async function runScreening(onStep, caseId) {
  const stages = await getPipelineStages();

  const resultPromise = caseId
    ? request("/screening/run", { method: "POST", body: { caseId } }).catch((err) => {
        if (err.status === 401) throw err;
        console.warn("[api] runScreening failed:", err.message);
        return { risk: 0, riskLabel: "—", recommendation: "—", stages: {} };
      })
    : Promise.resolve({ risk: 0, riskLabel: "—", recommendation: "—", stages: {} });

  for (const stage of stages) {
    onStep?.(`${stage.label}...`);
    await new Promise((resolve) => setTimeout(resolve, 450));
  }

  return resultPromise;
}

export function verifyPassport(passportNumber) {
  return request(`/screening/verify/passport/${encodeURIComponent(passportNumber)}`);
}

export function verifyVisa(visaNumber, passportNumber) {
  const q = passportNumber ? `?passport=${encodeURIComponent(passportNumber)}` : "";
  return request(`/screening/verify/visa/${encodeURIComponent(visaNumber)}${q}`);
}
