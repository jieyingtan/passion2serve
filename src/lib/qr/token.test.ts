import { describe, expect, it } from "vitest";

import { signMembershipToken, verifyMembershipToken } from "./token";

const secret = "test-secret-that-is-at-least-thirty-two-characters-long";
const payload = {
  v: 1 as const,
  passId: "005dd352-12b0-4f79-94b3-a4097c156a2d",
  participantId: "3adeba76-61ff-45bb-b095-375862dd6968",
  tokenVersion: 2,
};

describe("membership QR tokens", () => {
  it("round-trips a signed membership payload", () => {
    const token = signMembershipToken(payload, secret);
    expect(verifyMembershipToken(token, secret)).toEqual(payload);
  });

  it("rejects a modified payload", () => {
    const token = signMembershipToken(payload, secret);
    const parts = token.split(".");
    parts[1] = `${parts[1]}a`;
    expect(() => verifyMembershipToken(parts.join("."), secret)).toThrow("signature");
  });

  it("rejects a token signed with a different secret", () => {
    const token = signMembershipToken(payload, secret);
    expect(() => verifyMembershipToken(token, "another-secret-that-is-at-least-thirty-two-characters")).toThrow("signature");
  });
});
