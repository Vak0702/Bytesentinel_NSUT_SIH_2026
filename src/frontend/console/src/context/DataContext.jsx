/**
 * Loads the shared datasets the console reads on many pages — cases, queue,
 * analytics, watchlist, investigations, activity — once, and hands them to
 * every page through one hook.
 *
 * Why not let each page fetch for itself: the Dashboard, Case History,
 * Flagged Travellers and the header search all need the case list. Four
 * independent fetches means four round-trips and four chances for them to
 * disagree with each other on screen. One load, one source of truth.
 *
 * `refresh()` is exposed so a page that changes something (recording a
 * decision) can pull the updated data rather than patching local state and
 * hoping it matches what the database now says.
 */

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  getAnalytics,
  getCases,
  getInvestigations,
  getOfficerActivity,
  getOfficers,
  getQueue,
  getWatchlist,
} from "../services/api";

const DataContext = createContext(null);

const EMPTY = {
  cases: [],
  queue: [],
  officers: [],
  investigations: [],
  activity: [],
  analytics: null,
  watchlist: null,
};

export function DataProvider({ children }) {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    // Promise.all, not five awaits in a row: the requests are independent, so
    // running them in parallel turns 5 x latency into 1 x latency.
    const [cases, queue, officers, investigations, activity, analytics, watchlist] =
      await Promise.all([
        getCases(),
        getQueue(),
        getOfficers(),
        getInvestigations(),
        getOfficerActivity(),
        getAnalytics(),
        getWatchlist(),
      ]);

    setData({ cases, queue, officers, investigations, activity, analytics, watchlist });
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh().catch((err) => {
      console.error("[data] initial load failed:", err);
      setLoading(false);
    });
  }, [refresh]);

  return (
    <DataContext.Provider value={{ ...data, loading, refresh }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}

/** Convenience hooks so pages read like prose. */
export const useCases = () => useData().cases;
export const useAnalytics = () => useData().analytics;
