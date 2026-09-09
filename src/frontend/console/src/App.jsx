import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { AuthProvider } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import RequireAuth from "./components/RequireAuth";
import AppLayout from "./layouts/AppLayout";

import Dashboard from "./pages/Dashboard";
import NewScreening from "./pages/NewScreening";
import CaseHistory from "./pages/CaseHistory";
import Reports from "./pages/Reports";
import FlaggedTravellers from "./pages/FlaggedTravellers";
import Investigations from "./pages/Investigations";
import Watchlist from "./pages/Watchlist";
import OfficerActivity from "./pages/OfficerActivity";
import ScreeningDetail from "./pages/ScreeningDetail";

// Matches `base` in vite.config.js. In dev this is "/", in production
// "/console/", and React Router needs to know so its links line up with the
// path Flask actually serves the app on.
const BASENAME = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function App() {
  return (
    // Provider order matters and reads outside-in:
    //   AuthProvider   — who is signed in
    //   RequireAuth    — do not render anything below until we know
    //   DataProvider   — fetch the officer's data (needs the session)
    //   AppProvider    — theme, toasts, local UI state
    <AuthProvider>
      <RequireAuth>
        <DataProvider>
          <AppProvider>
            <BrowserRouter basename={BASENAME}>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/screening" element={<NewScreening />} />
                  <Route path="/cases" element={<CaseHistory />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/flagged" element={<FlaggedTravellers />} />
                  <Route path="/investigations" element={<Investigations />} />
                  <Route path="/watchlist" element={<Watchlist />} />
                  <Route path="/activity" element={<OfficerActivity />} />
                  <Route path="/screening/:caseId" element={<ScreeningDetail />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </AppProvider>
        </DataProvider>
      </RequireAuth>
    </AuthProvider>
  );
}
