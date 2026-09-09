/**
 * Thin wrapper around fetch for talking to the Flask API.
 *
 * Two things matter here:
 *
 * 1. `credentials: "include"` — without it the browser will not attach the
 *    session cookie, and every authenticated call silently comes back 401.
 *    This is the single most common cause of "it works in Postman but not in
 *    my app".
 *
 * 2. The API always answers `{ok, data}` or `{ok, error}`, so unwrapping
 *    happens once, here, instead of in every component.
 */

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code = "error") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type Options = { method?: string; body?: unknown };

export async function api<T = unknown>(path: string, options: Options = {}): Promise<T> {
  const { method = "GET", body } = options;

  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    // Network-level failure: Flask is not running, or the rewrite target is wrong.
    throw new ApiError(
      "Cannot reach the verification service. Is the backend running on port 5000?",
      0,
      "network_error"
    );
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.ok) {
    throw new ApiError(
      payload?.error?.message || `Request failed (${response.status}).`,
      response.status,
      payload?.error?.code || "error"
    );
  }

  return payload.data as T;
}

export type Officer = {
  officerId: number;
  name: string;
  email: string;
  badgeNumber: string | null;
  department: string | null;
  role: string | null;
  initials: string;
};

export function login(officerId: string, password: string, remember: boolean) {
  return api<{ officer: Officer; redirectTo: string }>("/auth/login", {
    method: "POST",
    body: { officerId, password, remember },
  });
}
