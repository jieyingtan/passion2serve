import { z } from "zod";

const emailSchema = z.string().trim().email();

export function normalizeParticipantEmail(value: string) {
  return emailSchema.parse(value).toLowerCase();
}

