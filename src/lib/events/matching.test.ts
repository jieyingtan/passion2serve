import { describe, expect, it } from "vitest";

import { eventTypes, getDirectoryMatch, getEventMatchPreview, scoreDirectoryMatch } from "./matching";

describe("event matching", () => {
  it("offers the three programme types", () => {
    expect(eventTypes).toEqual(["Items to Serve", "Knowledge to Serve", "Peace to Serve"]);
  });

  it("prioritises matching directory capabilities using the event name", () => {
    const preview = getEventMatchPreview("Items to Serve", "Warehouse support day");

    expect(preview.partners[0].capabilities).toContain("Warehouse");
    expect(preview.partnerNeeds).toContain("Transport");
  });

  it("does not recommend a volunteer without a relevant skill or interest", () => {
    expect(scoreDirectoryMatch("Knowledge to Serve", "Digital confidence", ["Yoga", "Mindfulness"])).toBe(0);
    expect(getDirectoryMatch("Knowledge to Serve", "Digital confidence", ["Yoga"]).eligible).toBe(false);
  });

  it("returns the matching evidence for eligible recommendations", () => {
    const result = getDirectoryMatch("Knowledge to Serve", "Digital confidence", ["Computer literacy", "Teaching seniors"]);

    expect(result.eligible).toBe(true);
    expect(result.score).toBeGreaterThan(70);
    expect(result.matchedSkills).toEqual(expect.arrayContaining(["computer and digital literacy", "teaching and facilitation"]));
  });
});
