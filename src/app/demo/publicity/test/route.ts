import { NextResponse } from "next/server";

import { generatePublicityDraft, generateVisualConcepts } from "@/server/ai/publicity";
import type { EventClosureMetadata } from "@/types/publicity";

const testMetadata: EventClosureMetadata = {
  eventId: "00000000-0000-4000-8000-000000000001",
  title: "Community Skills Workshop",
  category: "skills_training",
  beneficiaryName: "Migrant Community Learning Hub",
  volunteersAttended: 12,
  participantsAttended: 45,
  keyImpactMetric: "45 migrant workers gained digital literacy certifications",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const step = searchParams.get("step") ?? "concepts";
  const isDemo = !process.env.OPENAI_API_KEY;

  try {
    if (step === "concepts") {
      const concepts = await generateVisualConcepts(testMetadata);
      return NextResponse.json({
        mode: isDemo ? "mock" : "live",
        step: "concepts",
        success: true,
        conceptCount: concepts.length,
        concepts,
      });
    }

    if (step === "draft") {
      const concepts = await generateVisualConcepts(testMetadata);
      const draft = await generatePublicityDraft(concepts[0], testMetadata);
      return NextResponse.json({
        mode: isDemo ? "mock" : "live",
        step: "draft",
        success: true,
        imageUrl: draft.imageUrl,
        imagePromptLength: draft.imagePrompt.length,
        captionLength: draft.caption.length,
        imagePrompt: draft.imagePrompt,
        caption: draft.caption,
      });
    }

    return NextResponse.json(
      { error: "Use ?step=concepts or ?step=draft" },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        mode: isDemo ? "mock" : "live",
        step,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
