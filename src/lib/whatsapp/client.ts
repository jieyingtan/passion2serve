import { getRequiredEnv } from "@/lib/config";
import { normaliseWhatsAppPhone } from "@/lib/outreach/whatsapp";

export interface WhatsAppTemplateInput {
  to: string;
  templateName: string;
  languageCode?: string;
  bodyParameters?: string[];
}

export function isWhatsAppCloudConfigured() {
  return process.env.WHATSAPP_PROVIDER === "meta_cloud" && Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
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
