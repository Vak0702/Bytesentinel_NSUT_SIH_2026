import { useNavigate } from "react-router-dom";
import { Card, Badge } from "../components/ui";
import { useData } from "../context/DataContext";

const statusTone = { Active: "danger", "With prosecutor": "warn", Intelligence: "info" };
const dotTone = { danger: "bg-danger", warn: "bg-warn", info: "bg-info" };

export default function Investigations() {
  const { investigations } = useData();
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="text-base font-semibold mb-1">Open investigations</h2>
        <p className="text-sm text-ink-muted max-w-3xl">
          Cases raised from the counter that are now with the investigation team. Each one carries the full
          evidence pack — scans, heat maps, register responses and the officer note that opened it.
        </p>
      </Card>

      <div className="space-y-3">
        {investigations.map((inv) => (
          <Card
            key={inv.caseId}
            onClick={() => navigate(`/screening/${inv.caseId}`)}
            className="p-4 flex items-center gap-4 cursor-pointer hover:border-border-strong transition-colors"
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${dotTone[inv.severity]}`} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">{inv.title}</div>
              <div className="text-sm text-ink-muted mt-0.5">{inv.description}</div>
            </div>
            <div className="text-right shrink-0">
              <Badge tone={statusTone[inv.status]}>{inv.status}</Badge>
              <div className="text-xs text-ink-faint mt-1.5">{inv.opened}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
