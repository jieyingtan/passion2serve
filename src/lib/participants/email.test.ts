import { describe, expect, it } from "vitest";

import { normalizeParticipantEmail } from "./email";

describe("participant email normalization", () => {
  it("trims and lowercases a valid address", () => {
    expect(normalizeParticipantEmail("  New.Person@Example.ORG ")).toBe("new.person@example.org");
  });

  it("rejects invalid addresses", () => {
    expect(() => normalizeParticipantEmail("not-an-email")).toThrow();
  });
});

