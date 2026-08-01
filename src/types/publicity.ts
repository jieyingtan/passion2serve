import { z } from "zod";

export const eventClosureMetadataSchema = z.object({
  eventId: z.string().uuid(),
  title: z.string().min(1),
  category: z.string().min(1),
  beneficiaryName: z.string().min(1),
  volunteersAttended: z.number().int().nonnegative(),
  participantsAttended: z.number().int().nonnegative(),
  keyImpactMetric: z.string().min(1),
});

export type EventClosureMetadata = z.infer<typeof eventClosureMetadataSchema>;

export const visualConceptSchema = z.object({
  id: z.string(),
  conceptName: z.string(),
  headlineHook: z.string(),
  visualFocus: z.string(),
  lightingMood: z.string(),
  targetAudienceNote: z.string(),
});

export type VisualConcept = z.infer<typeof visualConceptSchema>;

export const publicityDraftSchema = z.object({
  imageUrl: z.string().url(),
  imagePrompt: z.string(),
  caption: z.string(),
});

export type PublicityDraft = z.infer<typeof publicityDraftSchema>;
