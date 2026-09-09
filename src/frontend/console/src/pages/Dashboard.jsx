import { useNavigate } from "react-router-dom";
import { Plus, ArrowUpRight, ShieldAlert, Cpu } from "lucide-react";
import { Card, Badge, RiskBadge, DecisionBadge, Button } from "../components/ui";
import { useData } from "../context/DataContext";
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from "recharts";

const recentAlerts = [];

const EMPTY_ANALYTICS = {
  summaryStats: [],
  riskDistribution: [],
  weeklyScreeningActivity: [],
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { cases, analytics } = useData();

  // `analytics` is null until the first API response lands, so fall back to
  // empty arrays rather than letting `.map()` run on undefined.
  const { summaryStats, riskDistribution, weeklyScreeningActivity } =
    analytics ?? EMPTY_ANALYTICS;

  const recent = cases.slice(0, 5);

  // Maps the short axis label back to the full weekday name for the tooltip.
  const dayNameByLabel = Object.fromEntries(
    weeklyScreeningActivity.map((d) => [d.label, d.day])
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Overview</h2>
          <p className="text-sm text-ink-muted mt-0.5">Attari Integrated Check Post · all counters · last 24 hours</p>
        </div>
        <Button variant="primary" onClick={() => navigate("/screening")}>
          <Plus size={16} /> New Screening
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryStats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="text-xs tracking-wide text-ink-muted uppercase">{s.label}</div>
            <div
              className={`mt-2 text-2xl font-semibold ${
                s.tone === "danger" ? "text-danger" : s.tone === "warn" ? "text-warn" : s.tone === "safe" ? "text-safe" : "text-ink"
              }`}
            >
              {s.value}
            </div>
            <div className="mt-1 text-xs text-ink-faint">{s.sub}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Screening activity, this week</h3>
            <Badge tone="info">Live</Badge>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={weeklyScreeningActivity}
              margin={{ top: 5, right: 12, bottom: 0, left: 12 }}
            >
              <defs>
                <linearGradient id="fillActivity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-info)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-info)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                stroke="var(--color-ink-faint)"
                tickLine={false}
                axisLine={false}
                fontSize={12}
                interval={0}
                padding={{ left: 12, right: 12 }}
              />
              <Tooltip
                cursor={{ stroke: "var(--color-border-strong)" }}
                labelFormatter={(label) => dayNameByLabel[label] ?? label}
                formatter={(value) => [value, "Screenings"]}
                contentStyle={{
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border-strong)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--color-ink)",
                }}
                labelStyle={{ color: "var(--color-ink)" }}
                itemStyle={{ color: "var(--color-ink-muted)" }}
              />
              <Area
                type="monotone"
                dataKey="count"
                name="Screenings"
                stroke="var(--color-info)"
                strokeWidth={2}
                fill="url(#fillActivity)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Risk distribution</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie
                  data={riskDistribution}
                  dataKey="value"
                  innerRadius={38}
                  outerRadius={56}
                  paddingAngle={2}
                >
                  {riskDistribution.map((s, i) => (
                    <Cell key={i} fill={s.color} stroke="none" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 text-xs">
              {riskDistribution.map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-ink-muted">{s.label}</span>
                  <span className="ml-auto font-medium">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Recent screening cases</h3>
            <button
              onClick={() => navigate("/cases")}
              className="text-xs text-info hover:underline flex items-center gap-1"
            >
              View all <ArrowUpRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-border-subtle">
            {recent.map((c) => (
              <button
                key={c.caseId}
                onClick={() => navigate(`/screening/${c.caseId}`)}
                className="w-full flex items-center gap-4 py-3 text-left hover:bg-overlay px-2 -mx-2 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-surface-2 border border-border-subtle flex items-center justify-center text-[11px] font-semibold shrink-0">
                  {c.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{c.traveller}</div>
                  <div className="text-xs text-ink-faint mono">{c.caseId} · {c.nationality}</div>
                </div>
                <RiskBadge risk={c.risk} />
                <DecisionBadge decision={c.decision} />
              </button>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert size={16} className="text-warn" />
              <h3 className="text-sm font-semibold">Recent alerts</h3>
            </div>
            <div className="space-y-3">
              {recentAlerts.map((a, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span
                    className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${
                      a.tone === "danger" ? "bg-danger" : "bg-warn"
                    }`}
                  />
                  <span className="flex-1 text-ink-muted">{a.text}</span>
                  <span className="text-ink-faint mono shrink-0">{a.time}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Cpu size={16} className="text-safe" />
              <h3 className="text-sm font-semibold">System status</h3>
            </div>
            <div className="space-y-2 text-xs">
              {[
                ["OCR extraction service", "Operational"],
                ["Forensic analysis engine", "Operational"],
                ["Biometric match service", "Operational"],
                ["Watchlist sync", "Operational · 2m ago"],
              ].map(([label, status]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-ink-muted">{label}</span>
                  <span className="text-safe flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-safe" /> {status}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
