import { describe, expect, it } from "vitest";

import {
  buildAttendanceWalletPassPayload,
  buildWalletPassPayload,
} from "@/lib/walletwallet/client";

function pngDimensions(dataUrl: string) {
  const png = Buffer.from(dataUrl.split(",")[1], "base64");
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

describe("WalletWallet pass format", () => {
  it("uses the approved Passion2Serve branding and participant fields", () => {
    const payload = buildWalletPassPayload({
      barcodeValue: "p2s1.signed-token",
      fullName: "Jane Tan",
    });

    expect(payload).toMatchObject({
      barcodeValue: "p2s1.signed-token",
      barcodeFormat: "QR",
      logoText: "Passion2Serve",
      organizationName: "Passion2Serve",
      colorPreset: "blue",
      color: "#c8e8ee",
      primaryFields: [{ label: "PARTICIPANT", value: "Jane Tan" }],
      secondaryFields: [{ label: "STATUS", value: "Active" }],
      backFields: [
        { label: "USE", value: "Present this pass after completing an event to record attendance." },
      ],
    });
    expect(payload.logoURL).toMatch(/^data:image\/png;base64,/);
    expect(payload.iconURL).toMatch(/^data:image\/png;base64,/);
    expect(payload.thumbnailURL).toMatch(/^data:image\/png;base64,/);
    expect(pngDimensions(payload.logoURL)).toEqual({ width: 160, height: 50 });
    expect(pngDimensions(payload.iconURL)).toEqual({ width: 29, height: 29 });
    expect(pngDimensions(payload.thumbnailURL)).toEqual({ width: 90, height: 90 });
  });

  it("preserves the clean membership pass face while adding an attendance notification", () => {
    const payload = buildAttendanceWalletPassPayload({
      barcodeValue: "p2s1.signed-token",
      fullName: "Jane Tan",
      eventName: "Digital Skills Workshop",
      eventDate: "2 August 2026",
    });

    expect(payload).toMatchObject({
      barcodeValue: "p2s1.signed-token",
      primaryFields: [{ label: "PARTICIPANT", value: "Jane Tan" }],
      secondaryFields: [{ label: "STATUS", value: "Active" }],
    });
    expect(payload).not.toHaveProperty("headerFields");
    expect(payload.secondaryFields).not.toContainEqual(
      expect.objectContaining({ label: "EVENT DATE" }),
    );
    expect(payload.backFields.at(-1)).toMatchObject({
      label: "LATEST ATTENDANCE",
      value: "Digital Skills Workshop",
      changeMessage: "Attendance confirmed for %@. Thank you for participating!",
    });
  });
});
