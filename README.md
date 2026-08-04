# vinext-starter

A clean full-stack starter running on
[vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and
Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

This starter does not use `wrangler.jsonc`.

## Included Shape

- edit site code under `app/`
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from
`oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Cal.com hosted booking (KO Fighters)

The public route `/online-lessons` uses a hosted Cal.com Event Type as the
availability, Google Calendar and video-meeting engine. KO never generates a
slot locally for this route.

Set these deployment variables in Netlify (and locally when testing):

```text
NEXT_PUBLIC_CAL_BOOKING_URL=https://cal.com/<team-or-coach>/<event-type>
CAL_WEBHOOK_SECRET=<the webhook secret configured in Cal.com>
CAL_API_KEY=<optional server-only key for future Cal API actions>
SUPABASE_URL=<project URL>
SUPABASE_SECRET_KEY=<server-only Supabase secret>
```

1. In Cal.com, create one Event Type for each service/duration (for example
   `online-training-30` and `online-training-60`) and enable its hosted Embed.
2. Each coach connects Google Calendar and enables Google Meet in their Cal.com
   availability/event settings. Configure the club timezone and session buffer
   there: Cal.com is the source of truth for conflicts and double-booking.
3. Add custom booking questions for WhatsApp/mobile, booking goal, notes and
   consent. Mark mandatory questions as required in Cal.com.
4. Create a Cal.com webhook to `https://<your-domain>/api/webhooks/cal`, add the
   same `CAL_WEBHOOK_SECRET`, and subscribe to `BOOKING_CREATED`,
   `BOOKING_RESCHEDULED`, `BOOKING_CANCELLED`, `BOOKING_REJECTED` and
   `BOOKING_NO_SHOW_UPDATED`.
5. Run the full `supabase/schema.sql` in the Supabase SQL editor before enabling
   the webhook. It creates `cal_booking_sync`, protects it with RLS, and merges
   hosted appointments into `/dashboard/today`.

The webhook validates Cal.com's `x-cal-signature-256` HMAC before any write.
It mirrors the Cal booking UID, attendee contact details, coach mapping (by
coach staff email), date/time, status, meeting URL and cancellation history.
Webhook retries are safe because `cal_uid` is unique and writes are upserts.

## KO Finance Center

Run `supabase/schema.sql` first, then run `supabase/finance-center.sql` in the
Supabase SQL editor. The migration is additive and rerunnable: it preserves the
existing invoices, payments, finance movements, payouts, and distributions.

The Finance Center is available at `/dashboard/finance`, with sections for
transactions, accounts, courses, coaches, partners, reports, rules, and
printable vouchers. Server routes enforce admin, coach, and investor scopes;
only an admin can create, reverse, or pay a financial obligation.

For a development or demo database only, run the guarded seed in the same SQL
session:

```sql
set app.ko_demo_seed = 'true';
-- then run supabase/finance-demo.sql
```

The seed intentionally refuses to run without that flag. It creates 90 days of
course payments, an example refund, operating expenses, a partner-paid expense,
and a closed cash day. Never enable this setting in production.

Financial formula: `gross income - refunds - accrued coach commissions - approved
operating expenses = positive distributable net profit`. The active partner
rules allocate that final positive amount as 45% Dr Abdul Hakim, 10% Zaher, and
45% Coach Fahd. Coach commissions are stored independently at the payment-time
percentage snapshot (50% by default), so Fahd's coaching income is never mixed
with his partner distribution.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build the starter and verify its rendered loading skeleton
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
