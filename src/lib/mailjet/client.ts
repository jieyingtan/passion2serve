import { getRequiredEnv } from "@/lib/config";

interface SendEmailInput {
  toEmail: string;
  toName: string;
  subject: string;
  html: string;
  text: string;
  customId?: string;
  eventPayload?: string;
  attachments?: Array<{ filename: string; contentType: string; base64Content: string }>;
}

export interface SendEmailResult { messageId: string | null; messageUuid: string | null }

export function escapeEmailHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export function isMailjetConfigured() {
  return Boolean(
    process.env.MAILJET_API_KEY &&
      process.env.MAILJET_SECRET_KEY &&
      process.env.MAILJET_FROM_EMAIL,
  );
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = getRequiredEnv("MAILJET_API_KEY");
  const secretKey = getRequiredEnv("MAILJET_SECRET_KEY");
  const fromEmail = getRequiredEnv("MAILJET_FROM_EMAIL");
  const fromName = process.env.MAILJET_FROM_NAME || "Passion2Serve";

  const response = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiKey}:${secretKey}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      Messages: [
        {
          From: { Email: fromEmail, Name: fromName },
          To: [{ Email: input.toEmail, Name: input.toName }],
          Subject: input.subject,
          TextPart: input.text,
          HTMLPart: input.html,
          CustomID: input.customId,
          EventPayload: input.eventPayload,
          Attachments: input.attachments?.map((attachment) => ({
            Filename: attachment.filename,
            ContentType: attachment.contentType,
            Base64Content: attachment.base64Content,
          })),
        },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Mailjet delivery failed with status ${response.status}.`);
  }
  const payload = await response.json() as { Messages?: Array<{ Status?: string; Errors?: Array<{ ErrorMessage?: string }>; To?: Array<{ MessageID?: number; MessageUUID?: string }> }> };
  const message = payload.Messages?.[0];
  if (message?.Status !== "success") {
    throw new Error(message?.Errors?.[0]?.ErrorMessage || "Mailjet did not accept the email.");
  }
  const recipient = message.To?.[0];
  return { messageId: recipient?.MessageID ? String(recipient.MessageID) : null, messageUuid: recipient?.MessageUUID ?? null };
}
