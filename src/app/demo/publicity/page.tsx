import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicityGenerator } from "@/app/coordinator/events/[eventId]/lifecycle/publicity-generator";

const DEMO_EVENT_ID = "00000000-0000-4000-8000-000000000001";

export default function PublicityDemoPage() {
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const hasFal = Boolean(process.env.FAL_KEY);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold">AI Publicity Generator</h1>
        <p className="mt-2 text-muted-foreground">
          Test the full AI pipeline: concept and caption generation (Gemini) and image
          generation (FLUX.1 schnell via fal.ai).
        </p>
      </div>

      <Card className="border-0">
        <CardHeader>
          <CardTitle className="text-base">Environment status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Badge variant={hasGemini ? "success" : "warning"}>
              GEMINI_API_KEY: {hasGemini ? "configured" : "missing (using mock)"}
            </Badge>
            <Badge variant={hasFal ? "success" : "warning"}>
              FAL_KEY: {hasFal ? "configured" : "missing (using mock)"}
            </Badge>
            <Badge variant="outline">
              Mode: {hasGemini && hasFal ? "Live AI" : "Demo / Mock"}
            </Badge>
          </div>
          {(!hasGemini || !hasFal) && (
            <p className="mt-3 text-sm text-muted-foreground">
              Add <code className="rounded bg-muted px-1">GEMINI_API_KEY</code> and{" "}
              <code className="rounded bg-muted px-1">FAL_KEY</code> to{" "}
              <code className="rounded bg-muted px-1">.env.local</code> for live
              generation. Without them, the UI runs with realistic mock data and
              simulated delays.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-0">
        <CardHeader>
          <CardTitle>Publicity Generator</CardTitle>
          <p className="text-sm text-muted-foreground">
            Generate a photorealistic poster and social copy from event impact
            data. Click the button below to start.
          </p>
        </CardHeader>
        <CardContent>
          <PublicityGenerator eventId={DEMO_EVENT_ID} />
        </CardContent>
      </Card>

      <Card className="border-0">
        <CardHeader>
          <CardTitle className="text-base">How it works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>1. Concept generation</strong> — Gemini Flash proposes 3
            visual directions based on event metadata (title, category, attendance,
            impact).
          </p>
          <p>
            <strong>2. Image + caption</strong> — Gemini generates a FLUX.1-optimized
            image prompt and social caption, then fal.ai renders the image in
            sub-second time using FLUX.1 [schnell] at $0.003/megapixel.
          </p>
          <p>
            <strong>3. Human review</strong> — You edit the caption, download the
            image, or regenerate. Approve to publish and archive the event.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
