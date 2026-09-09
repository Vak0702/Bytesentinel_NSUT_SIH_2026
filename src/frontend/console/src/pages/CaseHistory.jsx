import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ArrowUpDown } from "lucide-react";
import { Card, RiskBadge, DecisionBadge } from "../components/ui";
import { useData } from "../context/DataContext";

const filterDefs = [
  { key: "date", label: "Date", options: ["last 7 days", "last 30 days", "all time"] },
  { key: "nationality", label: "Nationality", options: ["any", "Vietnam", "Pakistan", "Russia", "Nigeria", "Brazil", "Bangladesh"] },
  { key: "risk", label: "Risk", options: ["any", "0-40", "41-70", "71-100"] },
  { key: "officer", label: "Officer", options: ["any", "Insp. R. Deshmukh", "SI A. Kaur", "SI M. Iqbal", "ASI P. Nair"] },
  { key: "decision", label: "Decision", options: ["any", "Cleared", "Flagged", "Manual review", "Secondary inspection"] },
  { key: "document", label: "Document", options: ["any", "Passport", "Passport + visa"] },
];

export default function CaseHistory() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    date: "last 7 days", nationality: "any", risk: "any", officer: "any", decision: "any", document: "any",
  });
  const [sort, setSort] = useState({ key: "date", dir: "desc" });

  const { cases: allCases } = useData();
  const cases = useMemo(() => allCases.filter((c) => c.decision), [allCases]);

  const filtered = useMemo(() => {
    let rows = [...cases];
    if (filters.nationality !== "any") rows = rows.filter((c) => c.nationality === filters.nationality);
    if (filters.officer !== "any") rows = rows.filter((c) => c.officer === filters.officer);
    if (filters.decision !== "any") rows = rows.filter((c) => c.decision === filters.decision);
    if (filters.risk !== "any") {
      const [lo, hi] = filters.risk.split("-").map(Number);
      rows = rows.filter((c) => c.risk >= lo && c.risk <= hi);
    }
    rows.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      if (sort.key === "risk") return (a.risk - b.risk) * dir;
      if (sort.key === "traveller") return a.traveller.localeCompare(b.traveller) * dir;
      return a.caseId.localeCompare(b.caseId) * dir;
    });
    return rows;
  }, [filters, sort, cases]);

  function toggleSort(key) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  return (
    <div className="space-y-4">
      <Card className="p-3 flex flex-wrap items-center gap-2">
        {filterDefs.map((f) => (
          <div key={f.key} className="relative">
            <select
              value={filters[f.key]}
              onChange={(e) => setFilters((prev) => ({ ...prev, [f.key]: e.target.value }))}
              className="appearance-none bg-surface-2 border border-border-subtle rounded-lg pl-3 pr-8 py-1.5 text-xs text-ink-muted focus:outline-none focus:border-accent/50 cursor-pointer"
            >
              {f.options.map((o) => (
                <option key={o} value={o}>{f.label}: {o}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
          </div>
        ))}
        <div className="ml-auto text-xs text-ink-faint">{filtered.length} cases in this period</div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-[11px] tracking-wide text-ink-faint uppercase">
                {[
                  ["caseId", "Case"], ["traveller", "Traveller"], ["passport", "Passport"],
                  ["nationality", "Nationality"], ["risk", "Risk"], ["decision", "Decision"],
                  ["officer", "Officer"], ["date", "Date"],
                ].map(([key, label]) => (
                  <th key={key} className="px-4 py-3 font-medium">
                    <button onClick={() => toggleSort(key)} className="flex items-center gap-1 hover:text-ink transition-colors">
                      {label} <ArrowUpDown size={10} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.caseId}
                  onClick={() => navigate(`/screening/${c.caseId}`)}
                  className="border-b border-border-subtle last:border-0 hover:bg-overlay cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 mono text-info">{c.caseId}</td>
                  <td className="px-4 py-3 font-medium">{c.traveller}</td>
                  <td className="px-4 py-3 mono text-ink-muted">{c.passport}</td>
                  <td className="px-4 py-3 text-ink-muted">{c.nationality}</td>
                  <td className="px-4 py-3"><RiskBadge risk={c.risk} /></td>
                  <td className="px-4 py-3 text-ink-muted">{c.decision}</td>
                  <td className="px-4 py-3 text-ink-muted">{c.officer}</td>
                  <td className="px-4 py-3"><DecisionBadge decision={c.decision} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
