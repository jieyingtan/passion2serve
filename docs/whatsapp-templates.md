# Passion2Serve WhatsApp templates

Create these templates as English (US), Utility templates in WhatsApp Manager. The placeholder order must remain unchanged because the application supplies values in this order.

## Registration confirmation

- Name: `passion2serve_registration_confirmation`
- Variables: participant name, event name, event date/time, venue
- Body: `Hi {{1}}, your registration for {{2}} is confirmed. Date: {{3}}. Venue: {{4}}. Open your Passion2Serve account to view event details and your membership QR.`

## Event reminder

- Name: `passion2serve_event_reminder`
- Variables: participant name, event name, event date/time, venue
- Body: `Hi {{1}}, this is a reminder for {{2}}. Date: {{3}}. Venue: {{4}}. Open your Passion2Serve account for event details and your membership QR.`

## Attendance acknowledgement

- Name: `passion2serve_attendance_acknowledgement`
- Variables: participant name, event name, certificate number
- Body: `Hi {{1}}, thank you for participating in {{2}}. Your attendance has been recorded. Certificate number: {{3}}. Your certificate is available in your Passion2Serve profile.`

## Business outreach

- Name: `passion2serve_business_outreach`
- Category: Marketing
- Variables: contact name, event name, beneficiary organisation, event date/time, venue
- Body: `Hi {{1}}, Passion2Serve is coordinating {{2}} with {{3}} on {{4}} at {{5}}. Based on your organisation's capabilities, we would like to invite your organisation to support this event. Please reply to confirm your interest.`

## Volunteer invitation

- Name: `passion2serve_volunteer_invitation`
- Category: Marketing
- Variables: volunteer name, event name, event date/time, venue
- Body: `Hi {{1}}, your interests and skills match our {{2}} event on {{3}} at {{4}}. We would like to invite you to volunteer. Please reply to confirm your availability.`

Templates can be submitted with `npm run whatsapp:templates` after `WHATSAPP_BUSINESS_ACCOUNT_ID` is added to `.env.local`. Meta must approve them before event automation can use them.
