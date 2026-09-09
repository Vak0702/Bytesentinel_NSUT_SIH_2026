import { Card, Badge } from "../components/ui";
import { useApp } from "../context/AppContext";
import { useData } from "../context/DataContext";

const dotTone = { danger: "bg-danger", warn: "bg-warn", safe: "bg-safe", info: "bg-info" };
const badgeTone = { Decision: "danger", System: "info", View: "info", Access: "safe" };

export default function OfficerActivity() {
  // Two sources, deliberately: `serverActivity` is the sealed audit trail from
  // the database, `localActivity` is what this browser tab has done since it
  // loaded but has not re-fetched yet. Server entries win on ties.
  const { activity: localActivity } = useApp();
  const { activity: serverActivity } = useData();

  const seen = new Set(serverActivity.map((a) => a.id));
  const activity = [...serverActivity, ...localActivity.filter((a) => !seen.has(a.id))];

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="text-base font-semibold mb-1">Officer activity log</h2>
        <p className="text-sm text-ink-muted">
          Every action taken at this counter, written as it happens and sealed. Entries cannot be edited or
          deleted — only added to.
        </p>
      </Card>

      <div className="space-y-3">
        {activity.map((a) => (
          <Card key={a.id} className="p-4 flex items-start gap-4">
            <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${dotTone[a.tone] || "bg-info"}`} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">{a.title}</div>
              <div className="text-sm text-ink-muted mt-0.5">{a.description}</div>
            </div>
            <div className="text-right shrink-0">
              <Badge tone={badgeTone[a.badge] || "neutral"}>{a.badge}</Badge>
              <div className="text-xs text-ink-faint mt-1.5 mono">{a.time}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
