import { Card, Button, StatCard } from "../components/ui";
import { useData } from "../context/DataContext";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { useApp } from "../context/AppContext";

export default function Reports() {
  const { showToast } = useApp();
  const { analytics } = useData();
  const {
    summaryStats = [],
    weeklyForgery = [],
    casesByCountry = [],
    officerPerformance = [],
    accuracyBreakdown = { overall: 0, segments: [] },
  } = analytics ?? {};

  const maxCountry = Math.max(...casesByCountry.map((c) => c.count), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">Period shown: 01 Aug – 05 Sep 2026 · Attari Integrated Check Post · all counters</p>
        <div className="flex gap-2">
          <Button onClick={() => showToast("Exporting PDF report...", "safe")}>Export PDF</Button>
          <Button onClick={() => showToast("Exporting Excel report...", "safe")}>Export Excel</Button>
          <Button onClick={() => showToast("Exporting CSV report...", "safe")}>Export CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryStats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Forgery and tampering found, week by week</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={weeklyForgery} barGap={4}>
              <XAxis dataKey="week" stroke="var(--color-ink-faint)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-ink-faint)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "var(--color-overlay)" }}
                contentStyle={{
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border-strong)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--color-ink)",
                }}
                labelStyle={{ color: "var(--color-ink)" }}
              />
              <Bar dataKey="forged" name="Forged documents" fill="var(--color-danger)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="tampering" name="Tampering found" fill="var(--color-warn)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 text-xs text-ink-muted">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-danger" /> Forged documents</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-warn" /> Tampering found</span>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">How accurate the system has been</h3>
          <div className="flex items-center gap-6">
            <div className="relative w-40 h-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[{ v: accuracyBreakdown.overall }, { v: 100 - accuracyBreakdown.overall }]}
                    dataKey="v"
                    innerRadius={55}
                    outerRadius={75}
                    startAngle={90}
                    endAngle={-270}
                    stroke="none"
                  >
                    <Cell fill="var(--color-safe)" />
                    <Cell fill="var(--color-border-subtle)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-2xl font-semibold text-safe">{accuracyBreakdown.overall}%</span>
              </div>
            </div>
            <div className="space-y-2.5 text-xs flex-1">
              {accuracyBreakdown.segments.map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="font-semibold" style={{ color: s.color }}>{s.value}%</span>
                  <span className="text-ink-muted">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-ink-faint mt-4">
            Measured against officer decisions after secondary inspection. Every reversal is fed back for retraining each Sunday.
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Cases by country of document</h3>
          <div className="space-y-3">
            {casesByCountry.map((c) => (
              <div key={c.country} className="flex items-center gap-3">
                <div className="w-24 text-xs text-ink-muted shrink-0">{c.country}</div>
                <div className="flex-1 h-2.5 bg-overlay rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-info to-accent"
                    style={{ width: `${(c.count / maxCountry) * 100}%` }}
                  />
                </div>
                <div className="w-10 text-xs text-ink-muted text-right mono">{c.count}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 overflow-hidden">
          <h3 className="text-sm font-semibold mb-4">Officer performance this month</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] tracking-wide text-ink-faint uppercase border-b border-border-subtle">
                <th className="pb-2 font-medium">Officer</th>
                <th className="pb-2 font-medium">Screened</th>
                <th className="pb-2 font-medium">Flagged</th>
                <th className="pb-2 font-medium">Avg. time</th>
                <th className="pb-2 font-medium">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {officerPerformance.map((o) => (
                <tr key={o.officer} className="border-b border-border-subtle last:border-0">
                  <td className="py-2.5">{o.officer}</td>
                  <td className="py-2.5 text-ink-muted mono">{o.screened.toLocaleString()}</td>
                  <td className="py-2.5 text-ink-muted mono">{o.flagged}</td>
                  <td className="py-2.5 text-ink-muted mono">{o.avgTime}</td>
                  <td className="py-2.5 text-safe font-medium">{o.accuracy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
