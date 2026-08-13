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

### Email (Forgot Password) Setup — Gmail SMTP

The Admin Forgot Password flow sends real reset-link emails via SMTP. If SMTP isn't configured, the backend automatically falls back to logging the reset link to the console instead — useful for local development, but not acceptable for production.

Required environment variables in `backend/.env`:

| Variable | Example / Placeholder |
|---|---|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `your-email@gmail.com` |
| `SMTP_PASS` | `your-16-character-gmail-app-password` |
| `EMAIL_FROM` | `your-email@gmail.com` |

**Setup steps (Gmail):**

1. Enable **2-Step Verification** on the Gmail account you want to send from, at [myaccount.google.com/security](https://myaccount.google.com/security).
2. Generate an **App Password** at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) (only available once 2-Step Verification is on). This 16-character password is used instead of your real Gmail password — Gmail blocks third-party SMTP logins with the real account password once 2-Step Verification is enabled, and an App Password can be revoked independently at any time without touching your main account credentials.
3. Add the 5 variables above to `backend/.env`, using your real Gmail address and the generated App Password.
4. Restart the backend (`npm run dev` in `backend/`) so it picks up the new environment variables.

**`.env` must never be committed.** It's gitignored for exactly this reason — only `backend/.env.example` (placeholder values only, no real credentials) is tracked in version control.

### Database migrations — dev vs. production

- `npm run db:migrate` (`prisma migrate dev`) — **local development only.** Can prompt interactively and, on schema drift, offer to reset the database. Never run this against the production database.
- `npm run db:migrate:deploy` (`prisma migrate deploy`) — **production.** Non-interactive, applies pending migrations only, never resets or prompts. This is the only command that should ever touch the production database's schema.

### Refresh-token cookie topology (`COOKIE_SAMESITE`)

Optional, defaults to `lax` (correct for local dev and for a same-site production deployment, e.g. frontend/backend as subdomains of one root domain). Set `COOKIE_SAMESITE=none` in `backend/.env` only if frontend and backend are deployed on genuinely different registrable domains in production (e.g. two separate Vercel projects with default `*.vercel.app` domains) — this also automatically forces the cookie's `Secure` flag on, since browsers reject `SameSite=None` cookies that aren't `Secure`.

## Known Deployment Limitations

- **Expense receipts (`Expense.receiptUrl`)** — stores the frontend's base64 data URL directly, not a hosted file URL. There is no external file-storage service (S3, Cloudinary, etc.) integrated into this backend. This is an accepted tradeoff for capstone scale: it avoids extra infrastructure, but means receipt images live in the database as text rather than as separately hosted files. The Express JSON body limit was raised to 5MB (see `backend/src/app.ts`) to accommodate this. A future iteration targeting real production use should replace this with actual object storage and have `receiptUrl` hold a real URL.
