# WRLMS Backend

Express + TypeScript API for the Wash and Refill Laundry Management System, using [Neon](https://neon.tech) (serverless Postgres) as the database.

## Stack

- Node.js + Express
- TypeScript
- Neon Postgres via `@neondatabase/serverless`

## Getting started

```bash
cd backend
npm install
cp .env.example .env   # then fill in your own Neon DATABASE_URL
npm run dev
```

The API starts on `http://localhost:4000` by default (see `PORT` in `.env`).

- `GET /api/health` — basic liveness check, no DB required
- `GET /api/health/db` — runs `SELECT 1` against Neon to confirm the DB connection works

## Environment variables

See `.env.example`. At minimum you need:

- `DATABASE_URL` — your Neon connection string (Neon dashboard → Connection Details)
- `PORT` — defaults to `4000`
- `CORS_ORIGIN` — the frontend origin allowed to call this API (defaults to `http://localhost:3000`)

Never commit `.env` — it's gitignored.

## Project structure

```
backend/
├── src/
│   ├── app.ts              # express app: middleware + route mounting
│   ├── server.ts           # entry point, starts the HTTP server
│   ├── config/
│   │   ├── env.ts          # reads/validates process.env
│   │   └── db.ts           # Neon connection pool (lazy init)
│   ├── routes/              # route definitions, mounted under /api
│   ├── controllers/         # request handlers
│   ├── middleware/          # express middleware (error handling, etc.)
│   └── utils/                # shared helpers
├── .env.example
├── package.json
└── tsconfig.json
```

Add new features as `routes/<feature>.route.ts` + `controllers/<feature>.controller.ts`, then mount the router in `src/routes/index.ts`.

## Scripts

- `npm run dev` — start with hot reload (tsx watch)
- `npm run build` — compile TypeScript to `dist/`
- `npm start` — run the compiled build
- `npm run typecheck` — type-check without emitting
