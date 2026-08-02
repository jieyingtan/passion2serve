import Link from "next/link";
import Image from "next/image";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="inline-flex items-center gap-3" href="/">
      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-white shadow-soft ring-1 ring-border/60">
        <Image alt="Passion To Serve" className="size-9 object-contain" height={36} priority src="/icon.svg" width={36} />
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
