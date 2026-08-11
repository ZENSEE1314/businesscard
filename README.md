# Konnect — Business Networking & Digital Name Card Platform

A mobile-first business social platform: social feed, digital name cards (with
vCard/QR/WhatsApp sharing), business awards, real-time chat, a points engine,
rewards, and a full admin dashboard.

**Roles:** Normal User · Business Owner · Admin.

> Platform name is configurable via `NEXT_PUBLIC_APP_NAME` (default "Konnect").

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 (design tokens) |
| Database | PostgreSQL |
| ORM | Prisma 6 |
| Auth | Custom secure auth — bcrypt + JWT (jose) in httpOnly cookies, DB-backed revocable sessions |
| Validation | Zod + React Hook Form |
| Real-time | Socket.IO (chat phase) |
| Storage | S3-compatible object storage (Railway bucket) with local-disk fallback for dev |
| Images | sharp (compress + thumbnails) |
| QR / vCard | qrcode + standards-compliant VCF generation |
| Testing | Vitest (unit/integration), Playwright (E2E) |
| Deploy | Railway (app + PostgreSQL) |

## Local development

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env
#    - set DATABASE_URL to a Postgres instance
#    - set AUTH_SECRET:  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
#    - set INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD

# 3. Database
npm run prisma:migrate      # apply migrations
npm run db:seed             # point rules, categories, settings, admin
npm run db:seed:demo        # + demo users/businesses/posts/awards/rewards

# 4. Run
npm run dev                 # http://localhost:3000
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run format` | Prettier write |
| `npm run prisma:migrate` | `prisma migrate deploy` |
| `npm run db:seed` | Seed core data (idempotent) |
| `npm run db:seed:demo` | Seed core + demo content |
| `npm test` | Unit/integration tests (Vitest) |
| `npm run test:e2e` | Playwright E2E |

## Environment variables

See [`.env.example`](.env.example) for the full list. Summary:

- **Core:** `APP_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_NAME`, `PORT`
- **Database:** `DATABASE_URL`
- **Auth:** `AUTH_SECRET`
- **Storage:** `STORAGE_DRIVER` (`local`|`s3`), `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL`
- **Admin bootstrap:** `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD`
- **Email (optional):** `SMTP_*`

Never commit `.env`. Only `.env.example` is tracked.

## Admin setup

The initial admin is created by the seed from `INITIAL_ADMIN_EMAIL` /
`INITIAL_ADMIN_PASSWORD` (never hardcoded). Admin dashboard lives at `/admin`.

## Deployment (Railway)

1. Create a Railway project with **PostgreSQL** + an **app service** from this repo.
2. Set env vars (above). `DATABASE_URL` is provided by the Railway Postgres plugin.
3. Provision a Railway object-storage bucket; set the `S3_*` vars and
   `STORAGE_DRIVER=s3`.
4. Build runs `next build`; release runs `prisma migrate deploy` then the server.
5. The app binds to Railway's `PORT`.

### Database backups (Railway)

- Use Railway's PostgreSQL backup feature (scheduled snapshots) or
  `pg_dump "$DATABASE_URL" > backup.sql`.
- Restore with `psql "$DATABASE_URL" < backup.sql`.
- Migrations are versioned in `prisma/migrations/` and applied with
  `prisma migrate deploy` (never `db push` in production).

## Project structure

```
prisma/            schema, migrations, seed
src/app/           routes (App Router): (auth), (app), api, legal, public cards
src/components/    UI primitives + shared components
src/features/      feature modules (feed, …)
src/lib/           auth, db, points, storage, security, validation, permissions
tests/             unit + e2e
```

## Security

Authorization is enforced on the backend (never by hiding UI). bcrypt password
hashing, DB-backed revocable sessions, httpOnly cookies, rate limiting on auth,
Zod validation, atomic/idempotent point & reward transactions, and IDOR-safe
scoping on all resource queries.
