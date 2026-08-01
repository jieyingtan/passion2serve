import fs from "node:fs";

function loadLocalEnv() {
  const raw = fs.readFileSync(".env.local", "utf8");
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const separator = line.indexOf("=");
    const key = line.slice(0, separator);
    const value = line.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadLocalEnv();

const token = process.env.WHATSAPP_ACCESS_TOKEN;
const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
const version = process.env.WHATSAPP_GRAPH_VERSION || "v25.0";
if (!token || !wabaId) throw new Error("WHATSAPP_ACCESS_TOKEN and WHATSAPP_BUSINESS_ACCOUNT_ID are required.");

const templates = [
  {
    env: "WHATSAPP_REGISTRATION_TEMPLATE",
    fallbackName: "passion2serve_registration_confirmation",
    body: "Hi {{1}}, your registration for {{2}} is confirmed. Date: {{3}}. Venue: {{4}}. Open your Passion2Serve account to view event details and your membership QR.",
    examples: ["Jane Tan", "Digital Foundations Workshop", "1 August 2026, 10:00 am", "Community Hub"],
  },
  {
    env: "WHATSAPP_REMINDER_TEMPLATE",
    fallbackName: "passion2serve_event_reminder",
    body: "Hi {{1}}, this is a reminder for {{2}}. Date: {{3}}. Venue: {{4}}. Open your Passion2Serve account for event details and your membership QR.",
    examples: ["Jane Tan", "Digital Foundations Workshop", "1 August 2026, 10:00 am", "Community Hub"],
  },
  {
    env: "WHATSAPP_ACK_TEMPLATE",
    fallbackName: "passion2serve_attendance_acknowledgement",
    body: "Hi {{1}}, thank you for participating in {{2}}. Your attendance has been recorded. Certificate number: {{3}}. Your certificate is available in your Passion2Serve profile.",
    examples: ["Jane Tan", "Digital Foundations Workshop", "P2S-2026-DEMO-001"],
  },
  {
    env: "WHATSAPP_BUSINESS_OUTREACH_TEMPLATE",
    fallbackName: "passion2serve_business_outreach",
    category: "MARKETING",
    body: "Hi {{1}}, Passion2Serve is coordinating {{2}} with {{3}} on {{4}} at {{5}}. Based on your organisation's capabilities, we would like to invite your organisation to support this event. Please reply to confirm your interest.",
    examples: ["Melvin Koh", "Digital Foundations Workshop", "Silver Community Centre", "1 August 2026, 10:00 am", "Community Hub"],
  },
  {
    env: "WHATSAPP_VOLUNTEER_OUTREACH_TEMPLATE",
    fallbackName: "passion2serve_volunteer_invitation",
    category: "MARKETING",
    body: "Hi {{1}}, your interests and skills match our {{2}} event on {{3}} at {{4}}. We would like to invite you to volunteer. Please reply to confirm your availability.",
    examples: ["Arjun Nair", "Digital Foundations Workshop", "1 August 2026, 10:00 am", "Community Hub"],
  },
];

const existingResponse = await fetch(`https://graph.facebook.com/${version}/${wabaId}/message_templates?fields=name,status&limit=100`, {
  headers: { Authorization: `Bearer ${token}` },
});
const existingPayload = await existingResponse.json();
if (!existingResponse.ok) throw new Error(existingPayload.error?.message || "Could not fetch existing WhatsApp templates.");
const existingTemplates = new Map((existingPayload.data || []).map((template) => [template.name, template.status]));

const results = [];
for (const template of templates) {
  const name = process.env[template.env] || template.fallbackName;
  if (existingTemplates.has(name)) {
    results.push({ name, submitted: false, skipped: true, status: existingTemplates.get(name) });
    continue;
  }
  const response = await fetch(`https://graph.facebook.com/${version}/${wabaId}/message_templates`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      language: "en_US",
      category: template.category || "UTILITY",
      components: [{ type: "BODY", text: template.body, example: { body_text: [template.examples] } }],
    }),
  });
  const payload = await response.json();
  results.push(response.ok
    ? { name, submitted: true, id: payload.id, status: payload.status }
    : { name, submitted: false, error: payload.error?.message || `Meta returned ${response.status}` });
}

console.log(JSON.stringify(results, null, 2));
