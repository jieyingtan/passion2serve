import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function PageHeader({ eyebrow, title, description, actions, className }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <header className={cn("overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/15 via-accent to-secondary/20 p-5 shadow-sm sm:p-7", className)}>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="min-w-0">
          {eyebrow && <div className="text-xs font-black uppercase tracking-[0.2em] text-primary">{eyebrow}</div>}
          <h1 className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">{title}</h1>
          {description && <p className="mt-2 max-w-3xl leading-6 text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </header>
  );
}

export function WorkflowStepHeader({ step, title, description, icon, className }: { step: number; title: ReactNode; description?: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-primary/15 bg-gradient-to-r from-primary/15 via-accent to-transparent px-5 py-4", className)}>
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-black text-primary-foreground shadow-sm">{step}</span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Step {step}</p>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-black sm:text-2xl">{icon}{title}</h2>
          {description && <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{description}</p>}
        </div>
      </div>
    </div>
  );
}

export function SectionHeader({ title, description, icon, action, className }: { title: ReactNode; description?: ReactNode; icon?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4 flex flex-col justify-between gap-3 rounded-xl border border-primary/10 bg-accent/70 px-4 py-3 sm:flex-row sm:items-center", className)}>
      <div className="flex items-start gap-3">
        {icon && <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">{icon}</span>}
        <div><h2 className="text-lg font-black sm:text-xl">{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
