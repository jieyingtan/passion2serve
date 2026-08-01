import { escapeEmailHtml } from "@/lib/mailjet/client";

export interface EventInvitationEmailInput {
  participantName: string;
  organisationName: string;
  eventName: string;
  startsAt: string;
  venue: string;
  signInUrl: string;
  signUpUrl: string;
}

export function formatEventDate(startsAt: string) {
  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Singapore",
  }).format(new Date(startsAt));
}

export function buildEventInvitationEmail(input: EventInvitationEmailInput) {
  const eventDate = formatEventDate(input.startsAt);
  const subject = `Passion2Serve invited you to ${input.eventName}`;
  const text = [
    `Hello ${input.participantName},`,
    "",
    `Passion2Serve has invited you to ${input.eventName} on ${eventDate} at ${input.venue}.`,
    "Please sign in to confirm your attendance:",
    input.signInUrl,
    "",
    "New to Passion2Serve? Create your participant account:",
    input.signUpUrl,
    "",
    "After creating your account, your Passion2Serve membership wallet pass will be sent to this email address.",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#173b37;line-height:1.6">
      <p style="font-size:13px;font-weight:700;letter-spacing:.12em;color:#237266">PASSION2SERVE</p>
      <h1 style="font-size:28px;line-height:1.2">You’re invited to ${escapeEmailHtml(input.eventName)}</h1>
      <p>Hello ${escapeEmailHtml(input.participantName)},</p>
      <p><strong>Passion2Serve</strong> has invited you to take part in this event.</p>
      <div style="background:#f1f7f5;border-radius:14px;padding:18px 20px;margin:22px 0">
        <p style="margin:0 0 8px"><strong>Event:</strong> ${escapeEmailHtml(input.eventName)}</p>
        <p style="margin:0 0 8px"><strong>Date:</strong> ${escapeEmailHtml(eventDate)}</p>
        <p style="margin:0"><strong>Venue:</strong> ${escapeEmailHtml(input.venue)}</p>
      </div>
      <p>Please sign in to your participant account and confirm your attendance.</p>
      <p><a href="${escapeEmailHtml(input.signInUrl)}" style="display:inline-block;background:#1d7065;color:white;text-decoration:none;padding:12px 18px;border-radius:9px;font-weight:700">Respond to invitation</a></p>
      <p style="margin-top:28px">Don’t have an account yet?</p>
      <p><a href="${escapeEmailHtml(input.signUpUrl)}" style="font-weight:700;color:#1d7065">Create a participant account</a></p>
      <p style="font-size:14px;color:#617773">Once your account is created, we’ll send your Apple Wallet and Google Wallet membership pass to this email. Your QR pass will also remain available in your profile.</p>
    </div>`;

  return { subject, text, html };
}
