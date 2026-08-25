# BridgeX — Railway Deployment Guide

This project deploys to Railway as **one app service + Postgres + an optional
Ollama AI service**. Existing data is never reset: deployments run
`prisma migrate deploy` (additive migrations only) and a seed step that only
upserts reference rows.

```
Railway project
├── businesscard-app   (this repo — Next.js)
├── Postgres           (Railway database plugin)
└── ollama-ai          (optional — AI profile generation)
```

---

## 1. App service (businesscard-app)

- **Builder:** NIXPACKS (see `railway.json`)
- **Start command:**
  `npx prisma migrate deploy && (npx prisma db seed || echo 'seed step skipped') && npx next start -p ${PORT:-3000}`
  Railway injects `PORT`; `next start` binds to it.
- **Migrations are safe:** `prisma migrate deploy` never resets or drops
  existing production data. Never run `prisma migrate reset` in production and
  never delete the Postgres volume.

### Required environment variables

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (reference the Postgres service) |
| `AUTH_SECRET` | Long random string (`node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`) |
| `APP_URL` / `NEXT_PUBLIC_APP_URL` | Public URL, e.g. `https://bridgex.up.railway.app` |
| `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` | Only used by the seed on first run; existing admin accounts are never clobbered |

### Optional environment variables

| Variable | Default | Notes |
| --- | --- | --- |
| `DAILY_CHECK_IN_TIMEZONE` | `Asia/Jakarta` | Check-in days, login streaks, membership days |
| `OLLAMA_BASE_URL` | *(empty)* | e.g. `http://ollama-ai.railway.internal:11434`. Empty ⇒ AI gracefully disabled |
| `OLLAMA_MODEL` | `kimi-k3:cloud` | Any model your Ollama service can serve |
| `OLLAMA_API_KEY` | *(empty)* | Sent as `Authorization: Bearer …` if set |
| `OLLAMA_TIMEOUT_MS` | `30000` | Per-request AI timeout |
| `AI_PROFILE_GENERATION_ENABLED` | `true` | Master kill-switch; also toggleable in `/admin/settings` |
| `S3_*`, `STORAGE_DRIVER`, `SMTP_*` | see `.env.example` | Object storage & email |

Do **not** commit real secrets — set them in the Railway dashboard.

---

## 2. Ollama AI service (optional)

> **Verified model availability:** [`kimi-k3`](https://ollama.com/library/kimi-k3)
> exists on the Ollama library with the `cloud` tag (2.81T parameters). The
> documented usage is:
>
> ```
> ollama run kimi-k3:cloud
> ```
>
> The command `ollama launch claude --model kimi-k3:cloud` shown on that page
> launches an **interactive coding CLI on a developer machine** — it is NOT how
> this application calls the model. BridgeX talks HTTP to a running Ollama
> server's standard `/api/chat` endpoint instead, so no per-request CLI process
> is ever spawned.

### Service setup

1. Create a new Railway service from the Docker image **`ollama/ollama`**
   (deploy a Docker image directly; no custom repo needed).
2. Set the environment variable:

   ```
   OLLAMA_HOST=0.0.0.0:11434
   ```

3. Attach a **volume** mounted at `/root/.ollama` so models and credentials
   persist across deploys.
4. Enable **private networking**. The internal hostname will look like
   `ollama-ai.railway.internal` — use it as `OLLAMA_BASE_URL` on the app
   service. Do not expose the service publicly unless you add your own auth.

### Cloud-model authentication

Cloud models (`kimi-k3:cloud`, `gpt-oss:120b-cloud`, `deepseek-v3.1:cloud`, …)
run on Ollama's infrastructure, so the **Ollama server itself must be signed
in to an Ollama account once**:

```bash
railway run --service ollama-ai sh     # or use `railway ssh`
ollama signin                          # follow the device-code prompt
curl -s http://localhost:11434/api/chat \
  -d '{"model":"kimi-k3:cloud","stream":false,"messages":[{"role":"user","content":"hi"}]}'
```

The signin writes credentials into the attached volume at `/root/.ollama`, so
they survive restarts. If you skip this step, `/api/chat` returns an HTTP error
mentioning authentication — BridgeX surfaces that message verbatim in
**Admin → Settings → AI profile generation** (reachability + detail line), and
the rest of the app keeps working.

If you prefer not to sign in, point `OLLAMA_MODEL` at any locally pulled model
(e.g. `qwen3:8b`) — everything else stays the same.

### Health check

The app probes `${OLLAMA_BASE_URL}/api/tags` when rendering
**Admin → Settings**. Green = reachable, red = unreachable/unconfigured, with a
plain-language detail line. No public health endpoint is exposed.

---

## 3. First deployment checklist

1. Provision Postgres first, then the app service, then (optionally) ollama-ai.
2. Set all required env vars above.
3. Deploy — the start command applies migrations and seeds point rules,
   categories, default feature settings and the initial admin.
4. Log in as the admin → you land on `/dashboard`.
5. Open `/admin/settings` to configure daily check-in points, activity
   thresholds, public-card ranking, AI availability, and login rate limits.

---

## 4. Operational notes

- **Login rate limiting** counts only *failed* attempts (10/account, 50/IP,
  15-minute window by default). Successful logins clear the account counter,
  so shared carrier NAT IPs (XL Axiata, Telkomsel, …) cannot lock out
  unrelated users. All values are editable in Admin → Settings.
- **Daily check-ins** write through the existing points ledger
  (`PointTransaction`) with a unique `(userId, localDate)` constraint — points
  can never double-award, even under concurrent taps.
- **AI generation** requires authentication, is rate limited per user
  (10 requests / 10 min), validates responses with Zod, and degrades to a
  friendly "not configured" message when Ollama is absent.
- **Tests:** `npm test` always runs unit tests; DB integration suites run when
  `TEST_DATABASE_URL` points at a disposable Postgres:
  `docker run -d -p 5433:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=bridgecard postgres:16-alpine`
