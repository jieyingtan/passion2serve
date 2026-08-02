export function normaliseWhatsAppPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export function buildWhatsAppUrl(phone: string, message: string) {
  return `https://wa.me/${normaliseWhatsAppPhone(phone)}?text=${encodeURIComponent(message)}`;
}

export function businessOutreachMessage(input: { contactName: string; eventName: string; organisationName: string; eventDate: string; venue: string }) {
  return `Hi ${input.contactName}, Passion2Serve is coordinating ${input.eventName} with ${input.organisationName} on ${input.eventDate} at ${input.venue}. We believe your organisation would be a strong partner. May we discuss how you could support this event?`;
}

export function volunteerOutreachMessage(input: { volunteerName: string; eventName: string; eventDate: string; venue: string }) {
  return `Hi ${input.volunteerName}, Passion2Serve is inviting you to volunteer at ${input.eventName} on ${input.eventDate} at ${input.venue}. Your interests and skills are a good match for this event. Please reply to confirm your availability. Thank you!`;
}

export function registrationConfirmationMessage(input: { participantName: string; eventName: string; eventDate: string; venue: string }) {
  return `Hi ${input.participantName}, your registration for ${input.eventName} on ${input.eventDate} at ${input.venue} is confirmed. Open your Passion2Serve account for event details and your membership QR. We look forward to seeing you!`;
}

export function eventReminderMessage(input: { participantName: string; eventName: string; eventDate: string; venue: string }) {
  return `Hi ${input.participantName}, this is a reminder from Passion2Serve about ${input.eventName} on ${input.eventDate} at ${input.venue}. Please have your membership QR ready. See you there!`;
}

export function attendanceAcknowledgementMessage(input: { participantName: string; eventName: string }) {
  return `Hi ${input.participantName}, thank you for completing ${input.eventName} with Passion2Serve. Your attendance has been recorded, 100 points have been awarded, and your named certificate is available in your profile.`;
}
