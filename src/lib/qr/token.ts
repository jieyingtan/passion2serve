import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import { getRequiredEnv } from "@/lib/config";

const tokenSchema = z.object({
  v: z.literal(1),
  passId: z.string().uuid(),
  participantId: z.string().uuid(),
  tokenVersion: z.number().int().positive(),
});

export type MembershipTokenPayload = z.infer<typeof tokenSchema>;

function getSigningSecret(secret?: string) {
  const value = secret ?? getRequiredEnv("QR_SIGNING_SECRET");
  if (value.length < 32) {
    throw new Error("QR_SIGNING_SECRET must contain at least 32 characters.");
  }
  return value;
}

function signatureFor(encodedPayload: string, secret: string) {
  return createHmac("sha256", secret).update(`p2s1.${encodedPayload}`).digest("base64url");
}

export function signMembershipToken(payload: MembershipTokenPayload, secret?: string) {
  const validPayload = tokenSchema.parse(payload);
  const encodedPayload = Buffer.from(JSON.stringify(validPayload)).toString("base64url");
  const signature = signatureFor(encodedPayload, getSigningSecret(secret));
  return `p2s1.${encodedPayload}.${signature}`;
}

export function verifyMembershipToken(token: string, secret?: string): MembershipTokenPayload {
  const [prefix, encodedPayload, suppliedSignature, extra] = token.split(".");
  if (prefix !== "p2s1" || !encodedPayload || !suppliedSignature || extra) {
    throw new Error("Invalid membership pass format.");
  }

  const expectedSignature = signatureFor(encodedPayload, getSigningSecret(secret));
  const expectedBuffer = Buffer.from(expectedSignature);
  const suppliedBuffer = Buffer.from(suppliedSignature);

  if (
    expectedBuffer.length !== suppliedBuffer.length ||
    !timingSafeEqual(expectedBuffer, suppliedBuffer)
  ) {
    throw new Error("Invalid membership pass signature.");
  }

  try {
    return tokenSchema.parse(JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")));
  } catch {
    throw new Error("Invalid membership pass payload.");
  }
}
