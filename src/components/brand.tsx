import Link from "next/link";
import { HeartHandshake } from "lucide-react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="inline-flex items-center gap-3" href="/">
      <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-soft">
        <HeartHandshake aria-hidden="true" className="size-5" />
      </span>
      {!compact && (
        <span>
          <span className="block text-lg font-bold leading-none tracking-tight">Passion2Serve</span>
          <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Connect. Serve. Grow.
          </span>
        </span>
      )}
    </Link>
  );
}
