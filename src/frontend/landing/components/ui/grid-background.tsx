import { cn } from "@/lib/utils";

export function GridBackground({
  className,
  variant = "grid",
}: {
  className?: string;
  variant?: "grid" | "dot";
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_40%,transparent_100%)]",
        variant === "grid" ? "bg-grid-pattern bg-grid" : "bg-dot-grid",
        className
      )}
    />
  );
}
