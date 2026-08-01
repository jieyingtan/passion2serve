import Link from "next/link";

import { eventStages, type EventStage } from "@/lib/events/stages";
import { cn } from "@/lib/utils";

export function EventStageTabs({ active }: { active: EventStage }) {
  return (
    <nav aria-label="Event stages" className="overflow-x-auto">
      <div className="inline-flex min-w-full gap-2 rounded-xl border bg-background p-1.5 sm:min-w-0">
        {eventStages.map((stage) => (
          <Link
            aria-current={stage.status === active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              stage.status === active && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
            )}
            href={stage.href}
            key={stage.status}
          >
            {stage.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

