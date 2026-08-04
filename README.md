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

## Known Deployment Limitations

- **Expense receipts (`Expense.receiptUrl`)** — stores the frontend's base64 data URL directly, not a hosted file URL. There is no external file-storage service (S3, Cloudinary, etc.) integrated into this backend. This is an accepted tradeoff for capstone scale: it avoids extra infrastructure, but means receipt images live in the database as text rather than as separately hosted files. The Express JSON body limit was raised to 5MB (see `backend/src/app.ts`) to accommodate this. A future iteration targeting real production use should replace this with actual object storage and have `receiptUrl` hold a real URL.
