"use client";

import React from "react";
import { cn } from "@/lib/utils";

export function MovingBorderButton({
  children,
  className,
  containerClassName,
  as: Component = "button",
  duration = 3500,
  ...otherProps
}: {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  as?: React.ElementType;
  duration?: number;
  [key: string]: any;
}) {
  return (
    <Component
      className={cn(
        "relative overflow-hidden rounded-lg p-[1.5px] focus-ring",
        containerClassName
      )}
      {...otherProps}
    >
      <div
        className="absolute inset-[-1000%] animate-spin-slow"
        style={{
          animationDuration: `${duration}ms`,
          background:
            "conic-gradient(from 90deg at 50% 50%, #22D3EE 0%, #3B82F6 35%, transparent 60%, #22D3EE 100%)",
        }}
      />
      <span
        className={cn(
          "relative flex h-full w-full items-center justify-center gap-2 rounded-[7px] bg-void px-6 py-3 text-sm font-semibold tracking-wide text-ink-primary transition-colors hover:bg-surface-raised",
          className
        )}
      >
        {children}
      </span>
    </Component>
  );
}
