# Passion2Serve

Passion2Serve is a two-interface event coordination and participant engagement platform.

## Current scaffold

- Next.js 15 App Router with React and TypeScript
- Tailwind CSS with shadcn/ui conventions and Radix primitives
- Coordinator and Participant route groups
- Responsive application shell and initial product screens
- Supabase SSR client utilities
- Initial PostgreSQL schema and Row Level Security migration
- Supabase password authentication, role-aware routing, and sign-out
- Backend-only Coordinator account creation and invite-only Participant activation
- WalletWallet membership pass issuance with Mailjet delivery after activation
- Transactional Coordinator event creation
- Signed in-app membership QR generation and attendance API
- Environment placeholders for OpenAI, Mailjet, WalletWallet, Postiz, and WhatsApp

The product and implementation requirements are in [`spec.md`](./spec.md).

## Local setup

1. Copy `.env.example` to `.env.local` and fill the required values.
2. Install dependencies with `npm install`.
3. Start the development server with `npm run dev`.
4. Open `http://localhost:3000`.

The UI scaffold renders without Supabase credentials. Authentication and persisted data require a Supabase project and the included migration.

## Invite-only account setup

Apply every SQL file in `supabase/migrations` in filename order before creating test accounts.

- Coordinators are created only through the Supabase Dashboard or server-side Admin API. There is no public Coordinator signup page.
- Participants are created only when an authorised Coordinator invites them to an event.
- A new Participant receives a Supabase invitation, completes `/activate`, and is then issued a WalletWallet pass. Mailjet sends the hosted Apple/Google Wallet install link.
- Existing Participants are linked directly to the event without creating a duplicate Auth user.
- Passwords are owned by Supabase Auth and are never stored in `public.profiles` or application logs.
- `profiles.id` remains the Auth UUID primary key. `profiles_email_unique_idx` makes email the case-insensitive unique person identifier.

Backend-only Coordinator provisioning is available through `npm run coordinator:create`. Temporarily set `COORDINATOR_BOOTSTRAP_PASSWORD` in `.env.local`, run the command with `--email`, `--name`, and `--phone`, then remove the temporary password variable. The script creates or updates the Auth account and its Coordinator profile without exposing a signup page.

For server-side invite links, add `http://localhost:3000/auth/confirm` and the deployed equivalent to the Supabase Auth redirect allow list. Customize the Supabase **Invite user** email template link to:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/activate">
  Accept invitation
</a>
```

Configure custom SMTP in Supabase Auth for real recipient delivery. The built-in test SMTP service only delivers to authorised project-team addresses.

## Current API routes

- `GET /api/membership-pass/qr` returns the authenticated Participant's signed QR as SVG.
- `POST /api/attendance/scan` verifies a QR and records attendance for an authorised Coordinator.

Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` before merging changes.
