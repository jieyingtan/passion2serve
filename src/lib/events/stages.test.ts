import { describe, expect, it } from "vitest";

import { eventStages, formatEventDate, getEventStage } from "./stages";

describe("event stage definitions", () => {
  it("provides a distinct route for every event stage", () => {
    expect(eventStages.map((stage) => stage.href)).toEqual([
      "/coordinator/events/new",
      "/coordinator/events/ongoing",
      "/coordinator/events/upcoming",
      "/coordinator/events/awaiting-closure",
      "/coordinator/events/archived",
    ]);
  });

  it("finds the requested stage", () => {
    expect(getEventStage("awaiting_closure").label).toBe("Awaiting Closure");
  });

  it("formats timestamps in Singapore time", () => {
    expect(formatEventDate("2026-08-18T01:00:00.000Z")).toContain("18 Aug 2026");
  });
});

