"use client";

import { useState } from "react";
import { ShieldCheck, Menu, X } from "lucide-react";

const LINKS = [
  { label: "Home", href: "#home" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Capabilities", href: "#capabilities" },
  { label: "Technology", href: "#technology" },
  { label: "About", href: "#about" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-surface-border/80 bg-void/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#home" className="flex items-center gap-2 focus-ring rounded-md">
          <ShieldCheck className="h-5 w-5 text-accent-cyan" strokeWidth={2} />
          <span className="font-display text-lg font-semibold tracking-tight text-ink-primary">
            DASTAVEZ
          </span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm text-ink-secondary transition-colors hover:text-ink-primary focus-ring rounded-md"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:block">
          <a
            href="/login"
            className="rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 px-4 py-2 text-sm font-semibold text-accent-cyan transition-colors hover:bg-accent-cyan/20 focus-ring"
          >
            Login / Sign In
          </a>
        </div>

        <button
          className="text-ink-primary md:hidden focus-ring rounded-md"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle navigation menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-surface-border bg-void px-6 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            {LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-sm text-ink-secondary hover:text-ink-primary"
              >
                {link.label}
              </a>
            ))}
            <a
              href="/login"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 px-4 py-2 text-center text-sm font-semibold text-accent-cyan"
            >
              Login / Sign In
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
