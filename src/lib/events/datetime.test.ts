import { describe, expect, it } from "vitest";

import { singaporeLocalToIso } from "./datetime";

describe("Singapore event date conversion", () => {
  it("converts Singapore local time to UTC consistently", () => {
    expect(singaporeLocalToIso("2026-08-18T09:00")).toBe("2026-08-18T01:00:00.000Z");
  });

  it("rejects impossible calendar dates", () => {
    expect(() => singaporeLocalToIso("2026-02-30T09:00")).toThrow("calendar date");
  });
});
