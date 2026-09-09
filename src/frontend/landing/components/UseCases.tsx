import { Landmark, Building2, Wallet, Umbrella, Briefcase, Plane } from "lucide-react";

const USE_CASES = [
  {
    icon: Landmark,
    title: "Banking & KYC",
    description:
      "Screen customer identity documents during onboarding to reduce fraudulent account openings.",
  },
  {
    icon: Building2,
    title: "Government Services",
    description:
      "Verify citizen-submitted documents before granting access to public services.",
  },
  {
    icon: Wallet,
    title: "Fintech",
    description:
      "Check identity consistency and document authenticity during digital account creation.",
  },
  {
    icon: Umbrella,
    title: "Insurance",
    description:
      "Validate identity documents submitted during policy issuance and claims.",
  },
  {
    icon: Briefcase,
    title: "Recruitment",
    description:
      "Screen candidate-submitted identity documents before onboarding.",
  },
    {
    icon: Plane,
    title: "Airports & Aviation",
    description:
      "Verify passenger identity documents and detect fraudulent identities during secure travel and access checks.",
  },
];

export function UseCases() {
  return (
    <section className="section-divider border-t py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14 max-w-2xl">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-accent-cyan">
            Use Cases
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink-primary sm:text-4xl">
            Where identity screening matters
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {USE_CASES.map((u) => (
            <div
              key={u.title}
              className="rounded-2xl border border-surface-border bg-surface/50 p-6 transition-colors hover:border-accent-cyan/30"
            >
              <u.icon className="h-6 w-6 text-accent-cyan" strokeWidth={1.75} />
              <h3 className="mt-4 font-display text-base font-semibold text-ink-primary">
                {u.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                {u.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
