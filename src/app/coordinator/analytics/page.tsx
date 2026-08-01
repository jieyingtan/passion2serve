import { BarChart3 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export default function CoordinatorAnalyticsPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="text-3xl font-bold tracking-tight">Impact analytics</h1>
      <p className="mt-2 text-muted-foreground">Recharts visualisations will use authorised aggregate queries.</p>
      <Card className="mt-8 border-0">
        <CardContent className="grid min-h-[420px] place-items-center p-10 text-center">
          <div>
            <BarChart3 className="mx-auto size-12 text-primary" />
            <h2 className="mt-5 text-xl font-bold">Analytics scaffold ready</h2>
            <p className="mt-2 max-w-md text-muted-foreground">Attendance, retention, outreach, and social engagement charts will live here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
