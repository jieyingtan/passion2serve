import { describe, expect, it } from "vitest";
import { buildCertificatePdf } from "./pdf";

describe("certificate PDF", () => {
  it("creates a valid named PDF with the certificate number", () => {
    const pdf = buildCertificatePdf({ participantName: "Aisha Rahman", eventName: "Wellness Day", eventDate: "1 August 2026", certificateNumber: "P2S-2026-TEST" });
    expect(pdf.subarray(0, 8).toString()).toBe("%PDF-1.4");
    expect(pdf.toString()).toContain("Aisha Rahman");
    expect(pdf.toString()).toContain("P2S-2026-TEST");
    expect(pdf.toString()).toContain("%%EOF");
  });
});
