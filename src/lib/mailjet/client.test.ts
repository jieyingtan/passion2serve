import { afterEach, describe, expect, it, vi } from "vitest";

import { isMailjetConfigured, sendEmail } from "./client";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("Mailjet client", () => {
  it("requires non-empty credentials and a sender", () => {
    process.env.MAILJET_API_KEY = "key";
    process.env.MAILJET_SECRET_KEY = "  ";
    process.env.MAILJET_FROM_EMAIL = "sender@example.org";
    expect(isMailjetConfigured()).toBe(false);

    process.env.MAILJET_SECRET_KEY = "secret";
    expect(isMailjetConfigured()).toBe(true);
  });

  it("sends a transactional message with the configured sender", async () => {
    process.env.MAILJET_API_KEY = "key";
    process.env.MAILJET_SECRET_KEY = "secret";
    process.env.MAILJET_FROM_EMAIL = "sender@example.org";
    process.env.MAILJET_FROM_NAME = "Passion2Serve";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      Messages: [{ Status: "success", To: [{ MessageID: 123, MessageUUID: "message-uuid" }] }],
    }), { status: 200, headers: { "content-type": "application/json" } }));

    const result = await sendEmail({
      toEmail: "participant@example.org",
      toName: "Aisha Rahman",
      subject: "Registration confirmed",
      text: "Your registration is confirmed.",
      html: "<p>Your registration is confirmed.</p>",
    });

    expect(result).toEqual({ messageId: "123", messageUuid: "message-uuid" });
    const request = fetchMock.mock.calls[0];
    expect(request[0]).toBe("https://api.mailjet.com/v3.1/send");
    const body = JSON.parse((request[1] as RequestInit).body as string);
    expect(body.Messages[0]).toMatchObject({
      From: { Email: "sender@example.org", Name: "Passion2Serve" },
      To: [{ Email: "participant@example.org", Name: "Aisha Rahman" }],
    });
  });

  it("returns Mailjet's useful rejection reason", async () => {
    process.env.MAILJET_API_KEY = "key";
    process.env.MAILJET_SECRET_KEY = "secret";
    process.env.MAILJET_FROM_EMAIL = "unverified@example.org";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      ErrorMessage: "Sender address is not verified.",
    }), { status: 401, headers: { "content-type": "application/json" } }));

    await expect(sendEmail({
      toEmail: "participant@example.org",
      toName: "Aisha Rahman",
      subject: "Test",
      text: "Test",
      html: "<p>Test</p>",
    })).rejects.toThrow("Sender address is not verified.");
  });
});
