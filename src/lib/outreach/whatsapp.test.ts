import { describe, expect, it } from "vitest";

import {
  attendanceAcknowledgementMessage,
  buildWhatsAppUrl,
  businessOutreachMessage,
  eventReminderMessage,
  normaliseWhatsAppPhone,
  registrationConfirmationMessage,
  volunteerOutreachMessage,
} from "./whatsapp";

describe("WhatsApp outreach", () => {
  it("normalises Singapore phone numbers and encodes the message", () => {
    expect(normaliseWhatsAppPhone("+65 9123 4567")).toBe("6591234567");
    expect(buildWhatsAppUrl("+65 9123 4567", "Hello & welcome")).toBe("https://wa.me/6591234567?text=Hello%20%26%20welcome");
  });

  it("builds personalised outreach and participant messages", () => {
    expect(businessOutreachMessage({ contactName: "Alex", eventName: "Digital Day", organisationName: "Hope Centre", eventDate: "8 Aug 2026", venue: "Skills Lab" })).toContain("Hi Alex");
    expect(volunteerOutreachMessage({ volunteerName: "Jane", eventName: "Digital Day", eventDate: "8 Aug 2026", venue: "Skills Lab" })).toContain("interests and skills");
    expect(registrationConfirmationMessage({ participantName: "Jane", eventName: "Digital Day", eventDate: "8 Aug 2026", venue: "Skills Lab" })).toContain("registration");
    expect(eventReminderMessage({ participantName: "Jane", eventName: "Digital Day", eventDate: "8 Aug 2026", venue: "Skills Lab" })).toContain("membership QR");
    expect(attendanceAcknowledgementMessage({ participantName: "Jane", eventName: "Digital Day" })).toContain("100 points");
  });
});
