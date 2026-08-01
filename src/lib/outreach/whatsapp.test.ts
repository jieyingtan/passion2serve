import { describe, expect, it } from "vitest";

import { buildWhatsAppUrl, normaliseWhatsAppPhone } from "./whatsapp";

describe("WhatsApp outreach", () => {
  it("normalises Singapore phone numbers and encodes the message", () => {
    expect(normaliseWhatsAppPhone("+65 9123 4567")).toBe("6591234567");
    expect(buildWhatsAppUrl("+65 9123 4567", "Hello & welcome")).toBe("https://wa.me/6591234567?text=Hello%20%26%20welcome");
  });
});
