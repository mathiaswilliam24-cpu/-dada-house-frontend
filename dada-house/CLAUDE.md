# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # start dev server
npm run build        # production build (also type-checks)
npm run start        # run production build

# After any schema change:
npx prisma db push   # apply schema to DB
npx prisma generate  # regenerate client (outputs to lib/generated/prisma/)

# To seed/inspect DB:
npx prisma studio
```

There is no test suite configured.

## Architecture

**DADA HOUSE** is a Next.js 16 App Router platform for a Houston home-services company (plumbing, AC, heating, remodeling). It uses four route groups:

| Group | Path | Auth |
|-------|------|------|
| `(public)` | `/`, `/services/*`, `/booking`, `/reviews`, `/about`, `/contact`, `/store` | None |
| `(auth)` | `/auth/login`, `/auth/register` | Guests only |
| `(client)` | `/dashboard`, `/dashboard/appointments/[id]`, `/dashboard/profile` | `CLIENT` or `ADMIN` |
| `(admin)` | `/admin`, `/admin/appointments`, `/admin/customers`, `/admin/reviews`, `/admin/settings` | `ADMIN` only |

Route protection is handled in **`proxy.ts`** (the Next.js 16 middleware file — not `middleware.ts`, which is gone). Auth is **NextAuth v5 beta** with JWT strategy + Credentials provider only. Session user always has `id` and `role` (`CLIENT` | `ADMIN`).

## Critical Patterns

### Prisma 7
Never use bare `new PrismaClient()`. The adapter is mandatory:
```ts
// lib/db.ts — already configured; import { db } from "@/lib/db"
Pool → PrismaPg → PrismaClient({ adapter })
```
Schema connection URL goes in `prisma.config.ts` under `datasource.url`, **not** in `prisma/schema.prisma`. The generated client is at `@/lib/generated/prisma/client`.

### Lazy singletons (build safety)
Twilio and Resend must never be initialised at module level — build will fail. Both are already wrapped:
- `lib/resend.ts` — exports `resend` proxy object + `FROM_EMAIL`
- `lib/twilio.ts` — exports `sendSMS()` helper

### Button / Link pattern
`Button` has no `asChild` prop. For a link styled as a button use:
```tsx
import { buttonVariants } from "@/components/ui/button";
<Link href="/booking" className={buttonVariants({ variant: "default" })}>Book</Link>
```

### Form validation types
Zod schemas with `.default()` fields (e.g. `city`, `photos`) require `z.input<typeof schema>` for the `useForm<>` generic and `zodResolver`, not `z.infer`. The `validations.ts` exports the correct `AppointmentInput` / `ReviewInput` as input types already.

### `useSearchParams` in client components
Must be wrapped in `<Suspense>`. See `booking/page.tsx` and `auth/login/page.tsx` for the pattern (inner component reads params, outer exports the `<Suspense>` wrapper).

### Server pages that call `auth()` or `db.*`
Must export `export const dynamic = "force-dynamic"` to prevent static generation failures.

## Env Variables

```
DATABASE_URL          # PostgreSQL (Supabase) connection string
NEXTAUTH_SECRET       # random secret for JWT signing
RESEND_API_KEY        # email sending
RESEND_FROM_EMAIL     # from address (default: service@mydadahouse.com)
TWILIO_ACCOUNT_SID    # SMS
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER
ADMIN_PHONE           # receives SMS on every new appointment booking
UPLOADTHING_TOKEN     # file uploads
```

## Key Data Flow

**New booking**: `BookingForm` → `POST /api/appointments` → DB record + confirmation email (Resend) + admin SMS (Twilio).

**Status update**: `AppointmentActions` (admin UI) → `PATCH /api/admin/appointments/[id]` → DB update + customer email + customer SMS.

**Invoice**: `AppointmentActions` → `POST /api/admin/appointments/[id]/invoice` → `db.invoice.upsert` + invoice email to customer.

**Reviews**: submitted unapproved; admin approves/rejects at `/admin/reviews` via `PATCH /api/admin/reviews/[id]`.
