import { describe, expect, it } from "vitest";

import { buildEventInvitationEmail } from "./invitation-email";

describe("event invitation email", () => {
  it("includes the beneficiary, event, venue, and both account paths", () => {
    const email = buildEventInvitationEmail({
      participantName: "Aisha Rahman",
      organisationName: "Bright Horizons",
      eventName: "Digital Skills Day",
      startsAt: "2026-08-18T01:00:00.000Z",
      venue: "Tampines Hub",
      signInUrl: "https://example.org/login?next=/participant/events",
      signUpUrl: "https://example.org/signup?event=123",
    });

    expect(email.subject).toContain("Bright Horizons");
    expect(email.text).toContain("Digital Skills Day");
    expect(email.text).toContain("Tampines Hub");
    expect(email.text).toContain("/login?");
    expect(email.text).toContain("/signup?");
  });
});
