import { useEffect, useState } from "react";
import { Search, Moon, Sun, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function Header({ title }) {
  const now = useClock();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useApp();
  const { officer } = useAuth();
  const { cases } = useData();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  const time = now.toLocaleTimeString("en-GB", { hour12: false });
  const date = now
    .toLocaleDateString("en-US", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();

  function onSearch(e) {
    const v = e.target.value;
    setQuery(v);
    if (v.trim().length < 2) {
      setResults([]);
      return;
    }
    const q = v.toLowerCase();
    setResults(
      cases
        .filter(
          (c) =>
            c.caseId.toLowerCase().includes(q) ||
            c.traveller.toLowerCase().includes(q) ||
            c.passport.toLowerCase().includes(q) ||
            c.nationality.toLowerCase().includes(q)
        )
        .slice(0, 6)
    );
  }

  function selectResult(caseId) {
    setQuery("");
    setResults([]);
    navigate(`/screening/${caseId}`);
  }

  return (
    <header className="h-[73px] shrink-0 border-b border-border-subtle bg-base px-6 flex items-center gap-6">
      <div className="shrink-0 min-w-[180px]">
        <h1 className="text-[15px] font-semibold text-ink">{title}</h1>
        <div className="flex items-center gap-1.5 text-xs text-ink-faint mt-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-safe inline-block" />
          Attari Integrated Check Post · Counter 04 · systems online
        </div>
      </div>

      <div className="flex-1 relative max-w-xl">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          value={query}
          onChange={onSearch}
          placeholder="Search passport, visa, name, national ID or case number"
          className="w-full bg-surface border border-border-subtle rounded-lg pl-9 pr-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent/50"
        />
        {results.length > 0 && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-surface-2 border border-border-strong rounded-lg overflow-hidden z-30 shadow-xl">
            {results.map((r) => (
              <button
                key={r.caseId}
                onClick={() => selectResult(r.caseId)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-overlay flex items-center justify-between"
              >
                <span>
                  <span className="mono text-ink-faint mr-2">{r.caseId}</span>
                  {r.traveller}
                </span>
                <span className="text-ink-faint text-xs">{r.nationality}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="text-right hidden md:block">
          <div className="mono text-sm font-medium text-ink leading-tight">{time}</div>
          <div className="text-[10px] text-ink-faint tracking-wide leading-tight">
            {date.replace(",", " ·")}
          </div>
        </div>
        <button
          onClick={toggleTheme}
          type="button"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="w-9 h-9 rounded-lg border border-border-subtle bg-surface flex items-center justify-center text-ink-muted hover:text-ink transition-colors"
        >
          {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
        </button>
        <button className="w-9 h-9 rounded-lg border border-border-subtle bg-surface flex items-center justify-center text-ink-muted hover:text-ink transition-colors relative">
          <Bell size={16} />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger text-[10px] font-semibold flex items-center justify-center text-white">
            0
          </span>
        </button>
        <div className="flex items-center gap-2.5 pl-3 border-l border-border-subtle">
          <div className="text-right leading-tight hidden sm:block">
            <div className="text-sm font-medium text-ink">{officer?.name ?? "—"}</div>
            <div className="text-[10px] text-ink-faint mono">
              Badge {officer?.badgeNumber ?? "—"} · {officer?.role ?? "Officer"}
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-info-soft border border-info/30 flex items-center justify-center text-xs font-semibold text-info">
            {officer?.initials ?? "··"}
          </div>
        </div>
      </div>
    </header>
  );
}
