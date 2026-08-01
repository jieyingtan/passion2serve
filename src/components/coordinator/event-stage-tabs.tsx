import Link from "next/link";

import { eventStages, type EventStage } from "@/lib/events/stages";
import { cn } from "@/lib/utils";

export function EventStageTabs({ active }: { active: EventStage }) {
  return (
    <nav aria-label="Event stages" className="scrollbar-subtle -mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      <div className="inline-flex min-w-max gap-1.5 rounded-xl border bg-background p-1.5 sm:min-w-full">
        {eventStages.map((stage) => (
          <Link
            aria-current={stage.status === active ? "page" : undefined}
            className={cn(
              "min-h-10 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:flex-1 sm:px-4 sm:text-center",
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
