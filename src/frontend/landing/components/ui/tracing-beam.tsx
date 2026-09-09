"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function TracingBeam({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function onScroll() {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const total = rect.height;
      const seen = Math.min(Math.max(viewportH * 0.5 - rect.top, 0), total);
      setProgress(total > 0 ? seen / total : 0);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div className="absolute left-[7px] top-0 h-full w-px bg-surface-border md:left-[11px]">
        <div
          className="w-px bg-gradient-to-b from-accent-cyan to-accent transition-[height] duration-150 ease-out"
          style={{ height: `${progress * 100}%` }}
        />
      </div>
      {children}
    </div>
  );
}
