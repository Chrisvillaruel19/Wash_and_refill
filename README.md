# WRLMS — Wash and Refill Laundry Management System

Monorepo containing both the frontend and backend for WRLMS.

```
.
├── frontend/    # Next.js app (TypeScript, Tailwind)
├── backend/      # Express API (TypeScript, Neon Postgres)
├── .gitignore
└── README.md
```

## Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

See [`frontend/README.md`](./frontend/README.md).

## Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in your Neon DATABASE_URL
npm run dev              # http://localhost:4000
```

See [`backend/README.md`](./backend/README.md).

### Email (Forgot Password) Setup — Resend

The Admin Forgot Password flow sends real reset-link emails via [Resend](https://resend.com)'s HTTPS API (plain `fetch`, no SDK dependency). If `RESEND_API_KEY` isn't configured, the backend automatically falls back to logging the reset link to the console instead — useful for local development, but not acceptable for production.

This replaced an earlier Gmail/Nodemailer SMTP transport: Render (and many PaaS hosts) restrict outbound SMTP ports, which caused `forgot-password` requests to hang for up to Nodemailer's ~2-minute default connection timeout before failing. An HTTPS API call has no such port restriction and now fails within a 10-second timeout instead.

Required environment variables in `backend/.env`:

| Variable | Example / Placeholder |
|---|---|
| `RESEND_API_KEY` | `re_your_resend_api_key` |
| `EMAIL_FROM` | an address on a domain verified with Resend (or `onboarding@resend.dev` for testing) |

**Setup steps:**

1. Create a Resend account and verify a sending domain (or use `onboarding@resend.dev` for testing before your domain is verified) at [resend.com](https://resend.com).
2. Generate an API key at [resend.com/api-keys](https://resend.com/api-keys).
3. Add the 2 variables above to `backend/.env`.
4. Restart the backend (`npm run dev` in `backend/`) so it picks up the new environment variables.

**`RESEND_API_KEY` is backend-only** — never exposed to the frontend, never prefixed `NEXT_PUBLIC_*`.

**`.env` must never be committed.** It's gitignored for exactly this reason — only `backend/.env.example` (placeholder values only, no real credentials) is tracked in version control.

**Known limitation — production readiness:** Forgot Password only delivers to `villaruelnino191@gmail.com` (dev owner's personal Resend account) due to Resend's no-domain sandbox restriction. Before any real client uses this system: (a) Admin's email must be updated to the client's real address, and (b) a domain must be purchased and verified in Resend. This is a Resend platform requirement, not something more code can work around.

### Database migrations — dev vs. production

- `npm run db:migrate` (`prisma migrate dev`) — **local development only.** Can prompt interactively and, on schema drift, offer to reset the database. Never run this against the production database.
- `npm run db:migrate:deploy` (`prisma migrate deploy`) — **production.** Non-interactive, applies pending migrations only, never resets or prompts. This is the only command that should ever touch the production database's schema.

### Refresh-token cookie topology (`COOKIE_SAMESITE`)

Optional, defaults to `lax` (correct for local dev and for a same-site production deployment, e.g. frontend/backend as subdomains of one root domain). Set `COOKIE_SAMESITE=none` in `backend/.env` only if frontend and backend are deployed on genuinely different registrable domains in production (e.g. two separate Vercel projects with default `*.vercel.app` domains) — this also automatically forces the cookie's `Secure` flag on, since browsers reject `SameSite=None` cookies that aren't `Secure`.

## Known Deployment Limitations

- **Expense receipts (`Expense.receiptUrl`)** — stores the frontend's base64 data URL directly, not a hosted file URL. There is no external file-storage service (S3, Cloudinary, etc.) integrated into this backend. This is an accepted tradeoff for capstone scale: it avoids extra infrastructure, but means receipt images live in the database as text rather than as separately hosted files. The Express JSON body limit was raised to 5MB (see `backend/src/app.ts`) to accommodate this. A future iteration targeting real production use should replace this with actual object storage and have `receiptUrl` hold a real URL.
