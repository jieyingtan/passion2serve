import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number;
  className?: string;
  label?: string;
}

export function Progress({ value, className, label = "Progress" }: ProgressProps) {
  const safeValue = Math.min(100, Math.max(0, value));
  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={safeValue}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-secondary", className)}
      role="progressbar"
    >
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${safeValue}%` }} />
    </div>
  );
}
