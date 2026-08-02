# Passion2Serve — Community Event Coordination Platform 🌱

Connecting people, coordinating service, and growing community impact.

Passion2Serve is an end-to-end event coordination and participant engagement platform built for Passion to Serve. It helps coordinators manage businesses, volunteers, beneficiaries, attendance, follow-ups, and impact reporting from one workspace, while giving participants a simple way to discover events, use a digital membership pass, and track their learning journey.

The platform intentionally has only two interfaces:

1. **Coordinator** — plans and delivers events.
2. **Participant** — discovers, registers for, and completes events.

Businesses and volunteers do not require separate accounts. Coordinators engage them through spreadsheet imports and personalised WhatsApp outreach.

Built for the Morgan Stanley Code to Give Hackathon in support of Passion to Serve.

## Demo

- **Coordinator guided demo:** [`/demo/coordinator`](http://localhost:3002/demo/coordinator)
- **Participant guided demo:** [`/demo/participant`](http://localhost:3002/demo/participant)
- **Local application:** [http://localhost:3002](http://localhost:3002)

The guided demos introduce the main workflows and show representative product screens without requiring coordinators or participants to understand the system beforehand.

## Problem & Solution

### The challenge

Community events often depend on disconnected spreadsheets, manual outreach, separate participant records, and repeated follow-up work. This makes it difficult to know whether business and volunteer targets are met, whether participants satisfy course prerequisites, and whether attendance, certificates, and impact figures are recorded consistently.

Participants may also struggle to understand which events they are invited to, which courses they can take next, and where to retrieve their membership pass or certificates.

### Our solution

Passion2Serve brings the full event and learning journey into one coordinated platform:

- **Unified event lifecycle:** Create → Ongoing → Upcoming → Awaiting Closure → Archived.
- **AI-powered matching:** Recommends suitable businesses and volunteers using event requirements, interests, skills, and capabilities.
- **Smart participant recruitment:** Imports beneficiary mailing lists, checks course prerequisites, and avoids duplicate invitations.
- **Digital membership pass:** Provides Apple Wallet, Google Wallet, and in-app QR access.
- **Camera-based attendance:** Scans the participant’s membership QR using a phone, tablet, or laptop camera.
- **Automated follow-up:** Records attendance, sends acknowledgement email, generates a named PDF certificate, and updates points and badges.
- **Learning retention:** Visual course pathways, achievements, rewards, multilingual content, and event reminders encourage continued participation.
- **Impact reporting:** Presents intuitive participation, retention, volunteer, partner, and beneficiary metrics across archived events.

## Quick Start

### Prerequisites

- Node.js 18 or newer
- npm
- Supabase project
- Mailjet account for transactional email
- WalletWallet API key for Apple and Google Wallet passes
- OpenAI API key for optional AI matching and translation

### Installation

1. Clone the repository and enter the project directory.

   ```bash
   git clone <repository-url>
   cd passion2serve
   ```

2. Install dependencies.

   ```bash
   npm install
   ```

3. Create the local environment file.

   ```bash
   cp .env.example .env.local
   ```

4. Add the required server variables to `.env.local`.

   ```env
   NEXT_PUBLIC_APP_URL=http://localhost:3002

   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   MAILJET_API_KEY=your_mailjet_api_key
   MAILJET_SECRET_KEY=your_mailjet_secret_key
   MAILJET_FROM_EMAIL=noreply@your-verified-domain.com
   MAILJET_FROM_NAME=Passion2Serve

   WALLETWALLET_API_KEY=your_walletwallet_api_key
   QR_SIGNING_SECRET=generate_a_long_random_secret

   OPENAI_API_KEY=your_optional_openai_api_key
   OPENAI_MODEL=gpt-4.1-mini

   WHATSAPP_PROVIDER=deeplink
   ```

5. Apply every SQL migration in `supabase/migrations` in filename order.

6. Start the development server.

   ```bash
   npm run dev
   ```

7. Open [http://localhost:3002](http://localhost:3002).

The visual scaffold can run without external services, but authentication, persisted workflows, invitations, email, and wallet passes require their corresponding integrations.

## 🛠️ Tech Stack

- **Frontend:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS
- **UI components:** shadcn/ui conventions, Radix UI primitives, Lucide icons
- **Backend:** Supabase PostgreSQL, Auth, Storage, Row Level Security, SSR clients
- **AI/ML:** OpenAI-assisted business and volunteer matching and multilingual translation
- **Publicity:** Category-aware AI-generated publicity workflow with approved poster templates and editable Instagram captions
- **Email:** Mailjet transactional invitations, confirmations, acknowledgements, and certificate attachments
- **Membership passes:** WalletWallet for Apple Wallet and Google Wallet
- **QR scanning:** ZXing browser camera scanner with signed QR verification
- **Certificates:** Personalised PDF certificate generation and secure Supabase Storage
- **Charts:** Recharts for impact and participation visualisation
- **WhatsApp:** Dynamic `wa.me` links containing personalised, pre-filled messages
- **Deployment:** Vercel-compatible production build and CI/CD workflow

## ✨ Key Features

### For Coordinators 🤝

- **Event workspace:** View Create, Ongoing, Upcoming, Awaiting Closure, and Archived events on dedicated pages.
- **Event planning:** Define event type, programme, beneficiary, schedule, venue, and volunteer/business targets.
- **AI matching:** Generate evidence-based business and volunteer shortlists from directory capabilities, skills, and interests.
- **Spreadsheet import:** Import volunteer and participant Excel or CSV records with validation and duplicate handling.
- **Smart outreach:** Open personalised WhatsApp messages for businesses, volunteers, and attendance acknowledgements.
- **Participant eligibility:** Check course prerequisites before invitations or self-registration are accepted.
- **Readiness tracking:** See whether business, volunteer, and participant-review requirements are complete before progressing an event.
- **Attendance scanner:** Record membership-pass attendance using an iPhone, iPad, Android device, laptop camera, or hardware scanner.
- **Automated certificates:** Email named PDF certificates and save them in participant profiles after attendance.
- **AI-generated publicity:** Select the correct poster for Items, Knowledge, or Peace to Serve and create an editable Instagram caption from verified impact figures.
- **Lifecycle audit:** Preserve event stage history, closure outcomes, participant feedback, and final reporting records.
- **Impact analytics:** Track participant attendance, drop-off, retention, volunteer target achievement, business confirmation, certificate coverage, points, and beneficiary reach.

### For Participants 🎓

- **Invite and self-registration:** Separate invited events from other discoverable opportunities.
- **Eligibility-aware registration:** Register only when the relevant course prerequisites have been completed.
- **Personal calendar:** View registered and upcoming events in an easy-to-read calendar.
- **Multilingual experience:** Use English, Chinese, Malay, or Tamil interface content.
- **Membership pass:** Add the pass to Apple Wallet or Google Wallet, or retrieve the same QR from the application profile.
- **Attendance confirmation:** Receive confirmation when the coordinator scans the membership QR.
- **Named certificates:** Receive certificates by email and download them again from the participant profile.
- **Learning pathway:** Follow Knowledge, Wellness, and Distribution course progress through a visual flow chart.
- **Achievements:** Unlock coloured milestone badges while unearned badges remain visible but inactive.
- **Points and rewards:** Earn 100 points for event attendance and 10 points for eligible feedback submissions.
- **Stories and feedback:** Share personal experiences that can appear as consented testimonials on the public landing page.

## ⚡ Platform Core Features

- Role-aware Supabase authentication and route protection
- Invite-only participant activation and backend-only coordinator provisioning
- Case-insensitive email identity and duplicate prevention
- Signed, participant-specific membership QR tokens
- Mobile-first responsive layouts for laptop, phone, and iPad
- Server-side service credentials that never enter the browser bundle
- Transactional email and certificate delivery with status tracking
- Event lifecycle transition checks and immutable stage history
- Coordinator approval before publicity is published or an event is archived

## 🔧 Implementation Highlights

### Evidence-based AI matching

The shortlist starts empty. When a coordinator generates recommendations, the system checks each candidate against the event category’s real skills or capabilities before adding them. Weak or unrelated candidates are excluded, and every recommendation includes a match score and explanation.

```ts
const match = getDirectoryMatch(eventType, event.name, candidateSkills)

if (match.eligible) {
  shortlist.push({
    score: match.score,
    explanation: match.matchedSkills.join(", "),
  })
}
```

### One scan, complete participant follow-up

Recording attendance triggers the participant follow-up pipeline:

```ts
await processAttendanceFollowUp({
  eventId,
  participantId,
})
```

The pipeline generates and stores the named PDF certificate, emails it through Mailjet, awards points, checks milestone badges, and prepares a personalised WhatsApp acknowledgement.

### Wallet and in-app QR access

Participants are never required to use a mobile wallet. The same signed membership credential can be presented from:

- Apple Wallet
- Google Wallet
- The participant’s in-app membership-pass page

### Safe, pre-filled WhatsApp outreach

WhatsApp messages are dynamic but remain under coordinator control. The application opens WhatsApp with the recipient, event information, and message already filled in; the coordinator reviews and sends it manually.

```ts
const whatsappUrl = buildWhatsAppUrl(phone, personalisedMessage)
```

### Auditable event progression

Events only progress when the required targets and review steps are complete. Each transition is recorded in `event_status_history`, while attendance and closure figures flow into later stages instead of being manually re-entered.

## 🎯 Challenges & Learnings

### Coordinating a multi-party workflow

**Challenge:** Businesses, volunteers, beneficiaries, participants, and coordinators all contribute to one event without needing five separate applications.

**Solution:** The platform uses only Coordinator and Participant interfaces. External partners remain directory contacts managed through imports and personalised outreach.

### Reliable mobile attendance scanning

**Challenge:** Wallet QR codes need to scan reliably across iPhone, iPad, Android, and laptop cameras under different lighting conditions.

**Solution:** The scanner requests the rear camera, applies continuous focus and exposure when available, uses a clear scanning frame, prevents duplicate submissions, and retains manual scanner input as a fallback.

### Preventing duplicate or ineligible invitations

**Challenge:** Re-imported spreadsheets and organisation mailing lists can repeatedly include the same people.

**Solution:** Email-based identity, event-level uniqueness constraints, prerequisite checks, and import deduplication ensure only newly eligible records are invited.

### Key learning

The most valuable automation keeps people in control. AI recommendations, pre-filled outreach, attendance follow-ups, and publicity drafts reduce repetitive work while preserving coordinator review and approval at important decision points.

## Deployment

The application is designed for deployment on Vercel with Supabase as its managed backend:

- **Frontend and server routes:** Vercel
- **Database and authentication:** Supabase PostgreSQL and Auth
- **Private certificate storage:** Supabase Storage
- **Transactional email:** Mailjet with a verified sender domain
- **Wallet pass generation:** WalletWallet
- **Production secrets:** Vercel encrypted environment variables

Before deploying:

1. Set `NEXT_PUBLIC_APP_URL` to the production HTTPS domain.
2. Add the production `/auth/confirm` URL to the Supabase Auth redirect allow list.
3. Configure Supabase custom SMTP for participant account invitations.
4. Verify the Mailjet sender domain.
5. Apply all Supabase migrations.
6. Run the complete quality suite.

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Team

Built by the Passion2Serve team:

- **Jie Ying** — Full-stack development, database management, UI/UX design, outreach automation, wallet pass
- **Si Ying** — Data visualisation, analytics dashboard
- **Ryan** — Translation, User experience 
- **Minn** — Story management, AI integration, content generation
- **Qi Xun** — Calendar views, WhatsApp integration

## 🗄️ Database Schema

The Supabase schema includes tables and policies for:

- User profiles, roles, coordinator assignments, and beneficiary organisations
- Events, stage history, business selections, and volunteer assignments
- Participant invitations, registrations, prerequisite eligibility, and attendance
- Membership passes and signed QR credentials
- Certificates, email delivery records, and WhatsApp delivery metadata
- Courses, course prerequisites, points, badges, rewards, and redemptions
- Participant feedback and consented personal stories
- Closure reports, publicity records, and impact analytics

All database changes are versioned in [`supabase/migrations`](./supabase/migrations).

## Security & Privacy

- **Authentication:** Supabase Auth manages passwords and sessions; plaintext passwords are never stored in application tables.
- **Authorisation:** Row Level Security and coordinator assignments limit access by role and beneficiary organisation.
- **Server secrets:** Service-role, Mailjet, wallet, and AI keys are used only in server-side code.
- **QR protection:** Membership QR payloads are signed and validated before attendance is recorded.
- **Duplicate protection:** Unique database constraints prevent repeated registrations, attendance, certificates, and point awards.
- **Participant consent:** Email, WhatsApp, publicity, and personal-story preferences are stored explicitly.
- **Private documents:** Certificates are stored in a private bucket and served only through authorised application flows.

## Operational Outcomes

Passion2Serve is designed to provide:

- One workspace across five event lifecycle stages
- One persistent membership QR per participant
- Automatic named certificates after verified attendance
- 100 points for each completed event
- 10 points for an eligible feedback submission
- Percentage-based participation, retention, volunteer, and partner reporting
- Reusable course dependency data that immediately unlocks eligible next steps


## Acknowledgements

Special thanks to:

- Passion to Serve for the opportunity to design around real community coordination needs
- Morgan Stanley for hosting the Code to Give Hackathon
- Our mentor, Daniel, for his invaluable guidance

> “Connect with purpose. Serve with heart. Grow through community.”

— Passion2Serve Team
