import { CalendarDays } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export default function CoordinatorCalendarPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="text-3xl font-bold tracking-tight">Upcoming calendar</h1>
      <p className="mt-2 text-muted-foreground">Month, week, and day views will be connected to Supabase events.</p>
      <Card className="mt-8 border-0">
        <CardContent className="grid min-h-[420px] place-items-center p-10 text-center">
          <div>
            <CalendarDays className="mx-auto size-12 text-primary" />
            <h2 className="mt-5 text-xl font-bold">Calendar scaffold ready</h2>
            <p className="mt-2 max-w-md text-muted-foreground">Event filters and readiness indicators are the next implementation slice.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
