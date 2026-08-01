import { createHmac } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import { getWhatsAppConfiguration, sendWhatsAppTemplate, verifyWhatsAppWebhookSignature } from "./client";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("WhatsApp Cloud API client", () => {
  it("reports sending, webhook, and template readiness separately", () => {
    process.env.WHATSAPP_PROVIDER = "meta_cloud";
    process.env.WHATSAPP_ACCESS_TOKEN = "token";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "123";
    process.env.WHATSAPP_VERIFY_TOKEN = "verify";
    process.env.WHATSAPP_APP_SECRET = "secret";
    delete process.env.WHATSAPP_ACK_TEMPLATE;

    const status = getWhatsAppConfiguration();
    expect(status.sendReady).toBe(true);
    expect(status.webhookReady).toBe(true);
    expect(status.automationReady).toBe(false);
    expect(status.templateMissing).toContain("WHATSAPP_ACK_TEMPLATE");
  });

  it("validates signed webhook payloads", () => {
    process.env.WHATSAPP_APP_SECRET = "app-secret";
    const body = JSON.stringify({ object: "whatsapp_business_account" });
    const signature = `sha256=${createHmac("sha256", "app-secret").update(body).digest("hex")}`;
    expect(verifyWhatsAppWebhookSignature(body, signature)).toBe(true);
    expect(verifyWhatsAppWebhookSignature(`${body}changed`, signature)).toBe(false);
    expect(verifyWhatsAppWebhookSignature(body, "sha256=invalid")).toBe(false);
  });

  it("sends the configured template to a normalised international number", async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = "token";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "123456";
    process.env.WHATSAPP_GRAPH_VERSION = "v23.0";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ messages: [{ id: "wamid.test" }] }), { status: 200 }));

    await expect(sendWhatsAppTemplate({ to: "+65 9123 4567", templateName: "hello_world" })).resolves.toEqual({ messageId: "wamid.test" });
    expect(fetchMock).toHaveBeenCalledWith("https://graph.facebook.com/v23.0/123456/messages", expect.objectContaining({ method: "POST" }));
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toMatchObject({ to: "6591234567", type: "template", template: { name: "hello_world" } });
  });
});
