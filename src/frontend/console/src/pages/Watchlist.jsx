import { useNavigate } from "react-router-dom";
import { Card, Button } from "../components/ui";
import { useData } from "../context/DataContext";

const dotTone = { danger: "bg-danger", warn: "bg-warn", info: "bg-info" };

function EntryList({ entries, showCountry }) {
  return (
    <div className="space-y-2">
      {entries.map((e) => (
        <div key={e.id} className="bg-surface-2 border border-border-subtle rounded-lg px-4 py-3 flex items-start gap-3">
          <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${dotTone[e.severity]}`} />
          <div>
            <div className="text-sm font-semibold mono">
              {e.id}{showCountry && e.country ? ` · ${e.country}` : ""}
            </div>
            <div className="text-xs text-ink-muted mt-0.5">{e.note}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

const EMPTY_WATCHLIST = {
  watchlistAlertBanner: null,
  blacklistedPassports: { total: 0, entries: [] },
  fraudIdentities: { total: 0, entries: [] },
  travelAlerts: { total: 0, entries: [] },
};

export default function Watchlist() {
  const { watchlist } = useData();
  const { watchlistAlertBanner, blacklistedPassports, fraudIdentities, travelAlerts } =
    watchlist ?? EMPTY_WATCHLIST;

  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      {watchlistAlertBanner && (
        <Card className="p-4 bg-danger-soft border-danger/30 flex items-center gap-4">
          <span className="w-2 h-2 rounded-full bg-danger shrink-0" />
          <p className="text-sm flex-1 text-ink">{watchlistAlertBanner.message}</p>
          <Button variant="danger" onClick={() => navigate(`/screening/${watchlistAlertBanner.caseId}`)}>
            Open the screening
          </Button>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Blacklisted passports</h3>
            <span className="text-xs text-ink-faint mono">{blacklistedPassports.total.toLocaleString()}</span>
          </div>
          <EntryList entries={blacklistedPassports.entries} showCountry />
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Known fraud identities</h3>
            <span className="text-xs text-ink-faint mono">{fraudIdentities.total}</span>
          </div>
          <EntryList entries={fraudIdentities.entries} />
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Travel alerts</h3>
            <span className="text-xs text-ink-faint mono">{travelAlerts.total}</span>
          </div>
          <EntryList entries={travelAlerts.entries} />
        </Card>
      </div>
    </div>
  );
}
