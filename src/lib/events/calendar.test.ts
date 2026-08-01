import { describe, expect, it } from "vitest";

import { dateKeyInSingapore, eventDateRange, monthGridKeys, readinessLabel, startOfWeekKey } from "@/lib/events/calendar";

describe("coordinator calendar dates", () => {
  it("uses the Singapore calendar day", () => {
    expect(dateKeyInSingapore("2026-08-01T17:00:00.000Z")).toBe("2026-08-02");
  });

  it("starts calendar weeks on Sunday", () => {
    expect(startOfWeekKey("2026-08-05")).toBe("2026-08-02");
  });

  it("builds a complete month grid", () => {
    const keys = monthGridKeys("2026-08-14");
    expect(keys).toHaveLength(42);
    expect(keys[0]).toBe("2026-07-26");
    expect(keys.at(-1)).toBe("2026-09-05");
  });

  it("treats a midnight end as the end of the previous day", () => {
    expect(eventDateRange({ startsAt: "2026-08-01T01:00:00.000Z", endsAt: "2026-08-02T16:00:00.000Z" })).toEqual({
      startKey: "2026-08-01",
      endKey: "2026-08-02",
    });
  });
});

describe("calendar readiness", () => {
  it("counts unmet ongoing requirements", () => {
    expect(readinessLabel({
      id: "event-id",
      name: "Community event",
      eventType: "Workshop",
      startsAt: "2026-08-01T01:00:00.000Z",
      endsAt: null,
      venue: "Community Hub",
      status: "ongoing",
      organisationName: "Example organisation",
      participantCapacity: 25,
      registrationCount: 12,
      volunteerTarget: 3,
      volunteerConfirmed: 2,
      businessTarget: 1,
      businessConfirmed: 1,
      participantReviewed: false,
    })).toBe("2 outstanding actions");
  });
});
