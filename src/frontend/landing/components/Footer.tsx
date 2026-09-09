import { ShieldCheck } from "lucide-react";

const COLUMNS = [
  {
    title: "Product",
    links: ["Verification", "Document Screening", "Risk Analysis"],
  },
  {
    title: "Resources",
    links: ["How It Works", "Technology"],
  },
  {
    title: "Project",
    links: ["About", "Contact"],
  },
];

export function Footer() {
  return (
    <footer className="section-divider border-t bg-void py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-accent-cyan" strokeWidth={2} />
              <span className="font-display text-lg font-semibold text-ink-primary">
                DASTAVEZ
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-ink-secondary">
              AI-Powered Identity &amp; Document Screening
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="font-mono text-xs uppercase tracking-widest text-ink-tertiary">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-ink-secondary transition-colors hover:text-ink-primary"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-surface-border pt-6 text-xs text-ink-tertiary sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 DASTAVEZ</span>
          <span>Smart India Hackathon 2026</span>
        </div>
      </div>
    </footer>
  );
}
