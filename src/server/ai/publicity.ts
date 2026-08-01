import { fal } from "@fal-ai/client";
import OpenAI from "openai";
import { z } from "zod";

import {
  visualConceptSchema,
  type EventClosureMetadata,
  type PublicityDraft,
  type VisualConcept,
} from "@/types/publicity";

const model = process.env.OPENAI_MODEL || "gpt-4o";

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const demoConcepts: VisualConcept[] = [
  {
    id: "demo-1",
    conceptName: "Hands That Build Together",
    headlineHook: "When hands meet, communities rise.",
    visualFocus: "Close-up of diverse hands assembling care packages, golden hour light streaming through a community centre window.",
    lightingMood: "Warm golden hour",
    targetAudienceNote: "Corporate donors and recurring volunteers who value tangible impact stories.",
  },
  {
    id: "demo-2",
    conceptName: "Faces of Gratitude",
    headlineHook: "Every smile tells a story of connection.",
    visualFocus: "Candid portrait of a participant and volunteer sharing a genuine laugh during the event, shallow depth of field.",
    lightingMood: "Soft natural daylight",
    targetAudienceNote: "General public and potential new volunteers motivated by human connection.",
  },
  {
    id: "demo-3",
    conceptName: "The Ripple Effect",
    headlineHook: "One event. Countless lives changed.",
    visualFocus: "Wide establishing shot of the full event space with participants in motion, overhead banners visible, conveying energy and scale.",
    lightingMood: "Bright and energetic",
    targetAudienceNote: "Institutional stakeholders and grant bodies interested in reach and scale metrics.",
  },
];

const demoDraft: PublicityDraft = {
  imageUrl: "https://placehold.co/1024x1024/f97316/white?text=FLUX.1+Poster+Preview",
  imagePrompt: "35mm documentary-style photograph of volunteers and migrant workers sharing a meal together at a community centre, soft warm lighting from overhead pendant lamps, shallow depth of field with bokeh background, negative space in upper third for text overlay, photorealistic, warm color palette with amber and teal accents. Generated via FLUX.1 [schnell] on fal.ai.",
  caption: "What happens when a community shows up for each other? Last Saturday, 24 volunteers joined hands with migrant workers at Bright Horizons Centre for an afternoon of skills-sharing and connection. The smiles you see aren't staged — they're the real thing.\n\nThank you to every volunteer, participant, and partner who made this possible. Together we served 85 individuals, shared 3 skill workshops, and planted seeds of friendship that will outlast any single event. This is what Passion to Serve looks like in action.",
};

const visualConceptsResponseSchema = z.object({
  concepts: z.array(visualConceptSchema).length(3),
});

export async function generateVisualConcepts(
  metadata: EventClosureMetadata,
): Promise<VisualConcept[]> {
  if (!process.env.OPENAI_API_KEY) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return demoConcepts;
  }

  const openai = getOpenAI();
  const response = await openai.responses.create({
    model,
    input: [
      {
        role: "system",
        content:
          "You are a Creative Director for 'Passion to Serve', a Singapore non-profit supporting migrant workers. " +
          "Propose 3 distinct visual directions for a publicity poster based on event impact. " +
          "Focus on warmth, dignity, and community empowerment. Avoid patronizing tropes or stock photo clichés.",
      },
      {
        role: "user",
        content: JSON.stringify({
          task: "Generate 3 distinct visual concepts for a post-event publicity poster.",
          event: {
            title: metadata.title,
            category: metadata.category,
            beneficiary: metadata.beneficiaryName,
            volunteersAttended: metadata.volunteersAttended,
            participantsAttended: metadata.participantsAttended,
            keyImpactMetric: metadata.keyImpactMetric,
          },
        }),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "visual_concepts",
        strict: true,
        schema: {
          type: "object",
          properties: {
            concepts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  conceptName: { type: "string" },
                  headlineHook: { type: "string" },
                  visualFocus: { type: "string" },
                  lightingMood: { type: "string" },
                  targetAudienceNote: { type: "string" },
                },
                required: [
                  "id",
                  "conceptName",
                  "headlineHook",
                  "visualFocus",
                  "lightingMood",
                  "targetAudienceNote",
                ],
                additionalProperties: false,
              },
            },
          },
          required: ["concepts"],
          additionalProperties: false,
        },
      },
    },
  });

  const parsed = visualConceptsResponseSchema.parse(
    JSON.parse(response.output_text),
  );
  return parsed.concepts;
}

export async function generatePublicityDraft(
  concept: VisualConcept,
  metadata: EventClosureMetadata,
): Promise<PublicityDraft> {
  if (!process.env.OPENAI_API_KEY) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return demoDraft;
  }

  const openai = getOpenAI();
  const copyResponse = await openai.responses.create({
    model,
    input: [
      {
        role: "system",
        content:
          "You are a Designer for 'Passion to Serve', a Singapore non-profit supporting migrant workers. " +
          "Generate an image generation prompt and a social media caption for a post-event publicity poster.",
      },
      {
        role: "user",
        content: JSON.stringify({
          task: "Generate an image prompt suitable for FLUX.1 image generation and a 2-paragraph social media caption.",
          imagePromptGuidelines:
            "Include: camera style (e.g. 35mm documentary), soft warm lighting, " +
            "framed negative space for text overlay, photorealistic style. " +
            "Reflect the chosen visual concept's focus and mood.",
          concept,
          event: {
            title: metadata.title,
            category: metadata.category,
            beneficiary: metadata.beneficiaryName,
            volunteersAttended: metadata.volunteersAttended,
            participantsAttended: metadata.participantsAttended,
            keyImpactMetric: metadata.keyImpactMetric,
          },
        }),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "publicity_copy",
        strict: true,
        schema: {
          type: "object",
          properties: {
            imagePrompt: { type: "string" },
            caption: { type: "string" },
          },
          required: ["imagePrompt", "caption"],
          additionalProperties: false,
        },
      },
    },
  });

  const copy = z
    .object({ imagePrompt: z.string(), caption: z.string() })
    .parse(JSON.parse(copyResponse.output_text));

  fal.config({ credentials: process.env.FAL_KEY });

  const imageResponse = await fal.subscribe("fal-ai/flux/schnell", {
    input: {
      prompt: copy.imagePrompt,
      image_size: "square_hd",
      num_images: 1,
    },
  });

  const imageUrl = imageResponse.data?.images?.[0]?.url;
  if (!imageUrl) {
    throw new Error("Image generation did not return a URL.");
  }

  return {
    imageUrl,
    imagePrompt: copy.imagePrompt,
    caption: copy.caption,
  };
}
