"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

const CHARS = "01ABCDEF#/*&%$@!?<>";

function randomLine(length: number) {
  return Array.from({ length }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
}

export function EvervaultCard({
  className,
  encryptedLines = 6,
}: {
  className?: string;
  encryptedLines?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [hovered, setHovered] = useState(false);
  const [lines] = useState(() =>
    Array.from({ length: encryptedLines }, () => randomLine(24))
  );

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-surface-border bg-surface",
        className
      )}
    >
      {/* base encrypted layer */}
      <div className="absolute inset-0 flex flex-col justify-center gap-2 p-6 font-mono text-[11px] leading-relaxed text-ink-tertiary/70">
        {lines.map((line, i) => (
          <p key={i} className="truncate">
            {line}
          </p>
        ))}
      </div>

      {/* decrypted reveal, masked to cursor position */}
      <div
        className="absolute inset-0 flex flex-col justify-center gap-3 p-6 font-mono text-[12px] text-ink-primary transition-opacity duration-200"
        style={{
          opacity: hovered ? 1 : 0,
          WebkitMaskImage: `radial-gradient(160px circle at ${pos.x}% ${pos.y}%, black 40%, transparent 100%)`,
          maskImage: `radial-gradient(160px circle at ${pos.x}% ${pos.y}%, black 40%, transparent 100%)`,
        }}
      >
        <Row label="NAME" value="VERIFIED" />
        <Row label="DATE OF BIRTH" value="VERIFIED" />
        <Row label="DOCUMENT NUMBER" value="CONSISTENT" />
        <Row label="EXPIRY" value="VALID" />
        <div className="mt-2 border-t border-surface-border pt-2 text-signal-verified">
          SCREENING STATUS — PASSED
        </div>
      </div>

      <div className="absolute left-4 top-4 rounded-full border border-surface-border bg-void/70 px-2.5 py-1 text-[10px] uppercase tracking-widest text-ink-secondary">
        {hovered ? "Decrypting" : "Encrypted"}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-ink-secondary">{label}</span>
      <span className="text-signal-verified">{value} ✓</span>
    </div>
  );
}
