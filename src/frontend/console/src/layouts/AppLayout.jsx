import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { useApp } from "../context/AppContext";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

const titles = {
  "/dashboard": "Dashboard",
  "/screening": "New Screening",
  "/cases": "Case History",
  "/reports": "Reports & Analytics",
  "/flagged": "Flagged Travellers",
  "/investigations": "Investigations",
  "/watchlist": "Watchlist Database",
  "/activity": "Officer Activity",
};

function pageTitle(pathname) {
  if (titles[pathname]) return titles[pathname];
  if (pathname.startsWith("/screening/")) return "Screening Detail";
  return "Border Screening";
}

const toastIcon = { safe: CheckCircle2, warn: AlertTriangle, danger: XCircle };
const toastTone = {
  safe: "border-safe/30 bg-safe-soft text-safe",
  warn: "border-warn/30 bg-warn-soft text-warn",
  danger: "border-danger/30 bg-danger-soft text-danger",
};

export default function AppLayout() {
  const location = useLocation();
  const { toast } = useApp();
  const Icon = toast ? toastIcon[toast.tone] : null;

  return (
    <div className="h-screen w-screen flex bg-base text-ink overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={pageTitle(location.pathname)} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg border shadow-2xl animate-toast-in ${toastTone[toast.tone]}`}
        >
          {Icon && <Icon size={17} />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
