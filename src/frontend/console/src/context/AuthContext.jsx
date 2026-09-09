/**
 * Who is signed in, for the whole console.
 *
 * On mount it asks the backend `GET /api/auth/me`. Three outcomes:
 *   - 200  -> render the app with the officer's real name and badge
 *   - 401  -> the API client redirects to the landing page's /login
 *   - down -> show a clear "backend unreachable" screen, not a blank page
 *
 * Note that the console never *decides* whether you are authorised — the
 * server does, on every single request. This context only controls what to
 * paint. A guard that lives only in the browser is decoration, not security:
 * anyone can edit React state in devtools, but nobody can forge the signed
 * session cookie.
 */

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getSession, logout as apiLogout } from "../services/api";

const AuthContext = createContext(null);
const LOGIN_URL = import.meta.env.VITE_LOGIN_URL || "http://localhost:3000/login";

export function AuthProvider({ children }) {
  const [officer, setOfficer] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getSession()
      .then((data) => {
        if (cancelled) return;
        setOfficer(data.officer);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        // 401 already triggered a redirect inside the API client.
        if (err.status === 401) return;
        setError(err.message);
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      window.location.href = LOGIN_URL;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ officer, status, error, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
