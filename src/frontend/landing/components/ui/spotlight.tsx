"use client";

import { cn } from "@/lib/utils";

export function Spotlight({ className }: { className?: string }) {
  return (
    <svg
      className={cn(
        "pointer-events-none absolute z-0 h-[60rem] w-[110rem] opacity-70 mix-blend-screen",
        className
      )}
      viewBox="0 0 1600 900"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g filter="url(#veridex-spotlight-blur)">
        <ellipse
          cx="760"
          cy="60"
          rx="520"
          ry="260"
          fill="url(#veridex-spotlight-gradient)"
          fillOpacity="0.55"
        />
      </g>
      <defs>
        <filter
          id="veridex-spotlight-blur"
          x="-200"
          y="-400"
          width="2000"
          height="1500"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="120" />
        </filter>
        <radialGradient
          id="veridex-spotlight-gradient"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(760 60) rotate(90) scale(260 520)"
        >
          <stop stopColor="#3B82F6" />
          <stop offset="0.55" stopColor="#22D3EE" stopOpacity="0.4" />
          <stop offset="1" stopColor="#0A0F1A" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}
