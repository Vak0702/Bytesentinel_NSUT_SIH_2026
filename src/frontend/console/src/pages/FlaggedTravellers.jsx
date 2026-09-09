import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { Card, RiskBadge, Badge } from "../components/ui";
import { useData } from "../context/DataContext";

const filterDefs = [
  { key: "status", label: "Status", options: ["all", "Under investigation"] },
  { key: "risk", label: "Risk", options: ["61-100", "any"] },
  { key: "reason", label: "Reason", options: ["any", "Photo replaced", "Stamp forgery", "Date written over", "Forged entry stamp", "Photo replacement"] },
  { key: "officer", label: "Officer", options: ["any", "Insp. R. Deshmukh", "SI M. Iqbal"] },
  { key: "date", label: "Date", options: ["this week", "last 30 days", "all time"] },
];

export default function FlaggedTravellers() {
  const navigate = useNavigate();
  const { cases } = useData();
  const flagged = useMemo(
    () => cases.filter((c) => c.status === "Flagged" || c.status === "Under investigation"),
    [cases]
  );
  const [filters, setFilters] = useState({ status: "all", risk: "61-100", reason: "any", officer: "any", date: "this week" });

  const rows = useMemo(() => {
    let r = [...flagged];
    if (filters.reason !== "any") r = r.filter((c) => c.reason === filters.reason);
    if (filters.officer !== "any") r = r.filter((c) => c.officer === filters.officer);
    return r;
  }, [filters, flagged]);

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
        <div className="ml-auto text-xs text-ink-faint">{rows.length} travellers flagged</div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-[11px] tracking-wide text-ink-faint uppercase">
                <th className="px-4 py-3 font-medium">Case</th>
                <th className="px-4 py-3 font-medium">Traveller</th>
                <th className="px-4 py-3 font-medium">Passport</th>
                <th className="px-4 py-3 font-medium">Nationality</th>
                <th className="px-4 py-3 font-medium">Risk</th>
                <th className="px-4 py-3 font-medium">Reason for flagging</th>
                <th className="px-4 py-3 font-medium">Officer</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
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
                  <td className="px-4 py-3 text-ink-muted">{c.reason}</td>
                  <td className="px-4 py-3 text-ink-muted">{c.officer}</td>
                  <td className="px-4 py-3"><Badge tone="danger">{c.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
