import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { initialActivity } from "../data/activity";

const AppContext = createContext(null);

const THEME_KEY = "bs.theme";
const LEGACY_SETTINGS_KEY = "bs.settings";
const ACTIVITY_KEY = "bs.activity";
const DECISIONS_KEY = "bs.decisions";

const THEMES = ["dark", "light"];
const DEFAULT_THEME = "dark";

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Resolve the theme to boot with.
 *
 * Order of preference:
 *   1. an explicit choice previously saved under `bs.theme`
 *   2. a migrated `appearance` value from the old settings blob, so officers
 *      who picked "Light" on the (now removed) Settings page keep their choice
 *   3. the OS-level preference
 *   4. dark
 */
function resolveInitialTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored && THEMES.includes(stored)) return stored;

    const legacy = load(LEGACY_SETTINGS_KEY, null);
    if (legacy?.appearance) {
      const migrated = String(legacy.appearance).toLowerCase();
      if (THEMES.includes(migrated)) return migrated;
    }

    if (window.matchMedia?.("(prefers-color-scheme: light)").matches) return "light";
  } catch {
    /* localStorage or matchMedia unavailable — fall through to the default */
  }
  return DEFAULT_THEME;
}

export function AppProvider({ children }) {
  const [theme, setThemeState] = useState(resolveInitialTheme);
  const [activity, setActivity] = useState(() => load(ACTIVITY_KEY, initialActivity));
  const [decisions, setDecisions] = useState(() => load(DECISIONS_KEY, {}));
  const [toast, setToast] = useState(null);

  // Single source of truth for the applied theme: the data-theme attribute on
  // <html>, which the token overrides in index.css key off. This effect is the
  // step that was missing before — the stored preference was never applied to
  // the document, so choosing "Light" changed nothing on screen.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* persistence is best-effort (private mode, quota) */
    }
  }, [theme]);

  const setTheme = useCallback((next) => {
    setThemeState(THEMES.includes(next) ? next : DEFAULT_THEME);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  useEffect(() => {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity));
  }, [activity]);

  useEffect(() => {
    localStorage.setItem(DECISIONS_KEY, JSON.stringify(decisions));
  }, [decisions]);

  const logActivity = useCallback((entry) => {
    setActivity((prev) => [
      {
        id: `act-${Date.now()}`,
        time: `Today ${new Date().toLocaleTimeString("en-GB", { hour12: false })}`,
        ...entry,
      },
      ...prev,
    ]);
  }, []);

  const recordDecision = useCallback(
    (caseId, decision) => {
      setDecisions((prev) => ({ ...prev, [caseId]: decision }));
      logActivity({
        title: `Decision recorded · ${caseId}`,
        description: `${decision} by Insp. R. Deshmukh, badge BOI-4471.`,
        badge: "Decision",
        tone: decision === "Cleared" ? "safe" : decision === "Flagged" ? "danger" : "warn",
      });
    },
    [logActivity]
  );

  const showToast = useCallback((message, tone = "safe") => {
    setToast({ message, tone, id: Date.now() });
    setTimeout(() => setToast(null), 3200);
  }, []);

  return (
    <AppContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        activity,
        logActivity,
        decisions,
        recordDecision,
        toast,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
