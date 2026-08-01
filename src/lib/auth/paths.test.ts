import { describe, expect, it } from "vitest";

import { roleHome, safeNextPath } from "./paths";

describe("authentication paths", () => {
  it("maps each role to its own interface", () => {
    expect(roleHome("coordinator")).toBe("/coordinator/dashboard");
    expect(roleHome("participant")).toBe("/participant/events");
  });

  it("accepts local paths and rejects open redirects", () => {
    expect(safeNextPath("/participant/pass")).toBe("/participant/pass");
    expect(safeNextPath("https://example.com")).toBeNull();
    expect(safeNextPath("//example.com/path")).toBeNull();
  });
});
