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
  return `Hi ${input.volunteerName}, your interests match our ${input.eventName} event on ${input.eventDate} at ${input.venue}. Would you like to volunteer? Please reply to confirm your availability.`;
}
