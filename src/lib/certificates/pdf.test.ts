import { describe, expect, it } from "vitest";
import { buildCertificatePdf } from "./pdf";

describe("certificate PDF", () => {
  it("creates a valid named PDF with the certificate number", () => {
    const pdf = buildCertificatePdf({ participantName: "Aisha Rahman", eventName: "Wellness Day", eventDate: "1 August 2026", certificateNumber: "P2S-2026-TEST" });
    const contents = pdf.toString("latin1");
    expect(pdf.subarray(0, 8).toString()).toBe("%PDF-1.4");
    expect(contents).toContain("Aisha Rahman");
    expect(contents).toContain("Wellness Day");
    expect(contents).toContain("1 August 2026");
    expect(contents).toContain("P2S-2026-TEST");
    expect(contents).not.toContain("<EVENT NAME>");
    expect(contents).not.toContain("<DATE>");
    expect(contents).toContain("%%EOF");
  });
});
