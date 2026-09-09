import { NavLink } from "react-router-dom";
import {
  ShieldCheck,
  LayoutGrid,
  ScanLine,
  History,
  BarChart3,
  Flag,
  FolderSearch,
  ListChecks,
  Activity,
  ChevronLeft,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/screening", label: "New Screening", icon: ScanLine },
  { to: "/cases", label: "Case History", icon: History },
  { to: "/reports", label: "Reports & Analytics", icon: BarChart3 },
  { to: "/flagged", label: "Flagged Travellers", icon: Flag, badgeKey: "flagged" },
  { to: "/investigations", label: "Investigations", icon: FolderSearch, badgeKey: "investigations" },
  { to: "/watchlist", label: "Watchlist Database", icon: ListChecks },
  { to: "/activity", label: "Officer Activity", icon: Activity },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { signOut } = useAuth();
  const { cases, investigations } = useData();

  // Counts come from the loaded data rather than being hardcoded, so the
  // sidebar can never disagree with the page it links to.
  const badges = {
    flagged: cases.filter((c) => c.status === "Flagged" || c.status === "Under investigation").length,
    investigations: investigations.length,
  };

  return (
    <aside
      className={`${
        collapsed ? "w-[76px]" : "w-64"
      } shrink-0 border-r border-border-subtle bg-base flex flex-col transition-all duration-200`}
    >
      <div className="px-5 py-5 flex items-center gap-2.5 border-b border-border-subtle">
        <div className="w-8 h-8 rounded-lg bg-info-soft border border-info/30 flex items-center justify-center shrink-0">
          <ShieldCheck size={18} className="text-info" />
        </div>
        {!collapsed && (
          <div className="leading-tight">
            <div className="text-sm font-semibold text-ink">DASTAVEZ</div>
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, badgeKey }) => {
          const badge = badgeKey ? badges[badgeKey] : 0;
          return (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors border ${
                isActive
                  ? "bg-accent-soft/40 border-accent/30 text-info"
                  : "border-transparent text-ink-muted hover:bg-overlay hover:text-ink"
              }`
            }
          >
            <Icon size={17} className="shrink-0" />
            {!collapsed && <span className="flex-1 truncate">{label}</span>}
            {!collapsed && badge && (
              <span className="text-[10px] font-semibold bg-danger-soft text-danger px-1.5 py-0.5 rounded-full">
                {badge}
              </span>
            )}
          </NavLink>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-border-subtle space-y-1">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-ink-muted hover:text-ink hover:bg-overlay transition-colors"
        >
          <ChevronLeft size={16} className={collapsed ? "rotate-180" : ""} />
          {!collapsed && <span>Collapse menu</span>}
        </button>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-ink-muted hover:text-ink hover:bg-overlay transition-colors"
        >
          <LogOut size={16} />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
