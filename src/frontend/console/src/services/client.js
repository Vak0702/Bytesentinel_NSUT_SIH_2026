/**
 * Low-level fetch wrapper. Everything in api.js goes through this.
 *
 * Responsibilities, deliberately kept to three:
 *   1. attach the session cookie (`credentials: "include"`)
 *   2. unwrap the API's {ok, data} / {ok, error} envelope
 *   3. turn a 401 into a redirect back to the login page
 *
 * Anything more (caching, retries) belongs a layer up, not here.
 */

const LOGIN_URL = import.meta.env.VITE_LOGIN_URL || "http://localhost:3000/login";

export class ApiError extends Error {
  constructor(message, status, code = "error") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

let redirecting = false;

function bounceToLogin() {
  // Guard against a burst of parallel 401s each firing its own redirect.
  if (redirecting) return;
  redirecting = true;
  window.location.href = LOGIN_URL;
}

/**
 * Upload a file as multipart/form-data.
 *
 * Note there is NO Content-Type header set here. That looks like an omission
 * but is required: the browser must generate the header itself, because
 * multipart needs a boundary string only it knows. Setting it by hand produces
 * a request the server cannot parse.
 */
export async function upload(path, formData, { signal } = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method: "POST",
      signal,
      credentials: "include",
      body: formData,
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new ApiError("Cannot reach the verification service.", 0, "network_error");
  }

  if (response.status === 401) {
    bounceToLogin();
    throw new ApiError("Session expired.", 401, "unauthenticated");
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.ok) {
    throw new ApiError(
      payload?.error?.message || `Upload failed (${response.status}).`,
      response.status,
      payload?.error?.code || "error"
    );
  }

  return payload.data;
}

export async function request(path, { method = "GET", body, signal } = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      signal,
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new ApiError("Cannot reach the verification service.", 0, "network_error");
  }

  if (response.status === 401) {
    bounceToLogin();
    throw new ApiError("Session expired.", 401, "unauthenticated");
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.ok) {
    throw new ApiError(
      payload?.error?.message || `Request failed (${response.status}).`,
      response.status,
      payload?.error?.code || "error"
    );
  }

  return payload.data;
}

/**
 * Call the API, but fall back to a local default if the backend is
 * unreachable or errors.
 *
 * This exists so a demo never shows a white screen because Flask was not
 * started. It deliberately does NOT swallow 401s — an expired session must
 * still bounce to login rather than quietly render stale data.
 */
export async function withFallback(fn, fallback, label = "request") {
  try {
    return await fn();
  } catch (err) {
    if (err.status === 401 || err.name === "AbortError") throw err;
    console.warn(`[api] ${label} failed, using local fallback:`, err.message);
    return fallback;
  }
}
