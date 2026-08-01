import { createHmac, timingSafeEqual } from "node:crypto";

import { getRequiredEnv } from "@/lib/config";
import { normaliseWhatsAppPhone } from "@/lib/outreach/whatsapp";

export interface WhatsAppTemplateInput {
  to: string;
  templateName: string;
  languageCode?: string;
  bodyParameters?: string[];
}

export function getWhatsAppConfiguration() {
  const sendMissing = [
    process.env.WHATSAPP_PROVIDER === "meta_cloud" ? null : "WHATSAPP_PROVIDER=meta_cloud",
    process.env.WHATSAPP_ACCESS_TOKEN ? null : "WHATSAPP_ACCESS_TOKEN",
    process.env.WHATSAPP_PHONE_NUMBER_ID ? null : "WHATSAPP_PHONE_NUMBER_ID",
  ].filter((value): value is string => Boolean(value));
  const webhookMissing = [
    process.env.WHATSAPP_VERIFY_TOKEN ? null : "WHATSAPP_VERIFY_TOKEN",
    process.env.WHATSAPP_APP_SECRET ? null : "WHATSAPP_APP_SECRET",
  ].filter((value): value is string => Boolean(value));
  const templateMissing = [
    process.env.WHATSAPP_ACK_TEMPLATE ? null : "WHATSAPP_ACK_TEMPLATE",
    process.env.WHATSAPP_REMINDER_TEMPLATE ? null : "WHATSAPP_REMINDER_TEMPLATE",
    process.env.WHATSAPP_REGISTRATION_TEMPLATE ? null : "WHATSAPP_REGISTRATION_TEMPLATE",
    process.env.WHATSAPP_BUSINESS_OUTREACH_TEMPLATE ? null : "WHATSAPP_BUSINESS_OUTREACH_TEMPLATE",
    process.env.WHATSAPP_VOLUNTEER_OUTREACH_TEMPLATE ? null : "WHATSAPP_VOLUNTEER_OUTREACH_TEMPLATE",
  ].filter((value): value is string => Boolean(value));
  return {
    sendReady: sendMissing.length === 0,
    webhookReady: webhookMissing.length === 0,
    automationReady: sendMissing.length === 0 && webhookMissing.length === 0 && templateMissing.length === 0,
    sendMissing,
    webhookMissing,
    templateMissing,
  };
}

export function isWhatsAppCloudConfigured() {
  return getWhatsAppConfiguration().sendReady;
}

export function verifyWhatsAppWebhookSignature(rawBody: string, signature: string | null) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret || !signature?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const supplied = signature.slice("sha256=".length);
  if (!/^[a-f0-9]{64}$/i.test(supplied) || supplied.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(supplied, "hex"), Buffer.from(expected, "hex"));
}

export async function sendWhatsAppTemplate(input: WhatsAppTemplateInput) {
  const token = getRequiredEnv("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = getRequiredEnv("WHATSAPP_PHONE_NUMBER_ID");
  const version = process.env.WHATSAPP_GRAPH_VERSION || "v23.0";
  const components = input.bodyParameters?.length ? [{
    type: "body",
    parameters: input.bodyParameters.map((text) => ({ type: "text", text })),
  }] : undefined;
  const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normaliseWhatsAppPhone(input.to),
      type: "template",
      template: { name: input.templateName, language: { code: input.languageCode || "en_US" }, components },
    }),
    cache: "no-store",
  });
  const payload = await response.json() as { messages?: Array<{ id?: string }>; error?: { message?: string } };
  if (!response.ok || !payload.messages?.[0]?.id) throw new Error(payload.error?.message || `WhatsApp delivery failed with status ${response.status}.`);
  return { messageId: payload.messages[0].id };
}
