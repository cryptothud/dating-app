# Crush

A location-first dating app where the map is the product. Profiles surface in real time as
people move, so the question stops being who matched last week and becomes who is close
enough to meet tonight. Presence, matching and chat all run over a live connection rather
than a refresh cycle.

**Live:** [crush-web-pi.vercel.app](https://crush-web-pi.vercel.app/)

## Stack

| Layer | Choice |
|---|---|
| Web | Next.js (App Router), React, TypeScript, Tailwind, MapLibre GL |
| API | NestJS, TypeScript |
| Data | PostgreSQL via Prisma; Redis for query caching and rate-limit counters |
| Realtime | Socket.IO for map updates and chat |
| Media | Cloudinary for photo storage and transforms |
| Auth | JWT with phone verification via Twilio, Turnstile on public forms |
| Tooling | pnpm workspaces, Turborepo, ESLint, Prettier, Husky, commitlint |

## Structure

```
apps/
  web/            Next.js client
  api/            NestJS server
packages/
  db/             Prisma schema, migrations, seed
  types/          Shared DTOs and domain types
  ui/             Shared component library
  config/         Shared ESLint / TS config
load-tests/       k6 scripts for the realtime path
```

The API is split by domain rather than by technical layer:

```
auth  identity  profile  photos  location  chat  events  push
billing  moderation  safety  admin  seen-in-wild  email  twilio  redis
```

## Getting started

Requires Node 22+, pnpm 11+, and Docker for Postgres and Redis.

```bash
pnpm install
docker compose up -d              # postgres + redis
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm --filter @dating-app/db db:migrate
pnpm --filter @dating-app/db db:seed
pnpm dev                          # web on :3000, api on :4000
```

In development the web app proxies to the API, so `NEXT_PUBLIC_API_URL` and
`NEXT_PUBLIC_SOCKET_URL` are left blank — cookies stay same-origin and no CORS
configuration is needed locally. They are set explicitly in production.

## Scripts

Run from the repo root; Turborepo fans them out across the workspace.

| Command | Description |
|---|---|
| `pnpm dev` | Web and API in watch mode |
| `pnpm build` | Build every package in dependency order |
| `pnpm typecheck` | `tsc --noEmit` across the workspace |
| `pnpm lint` | ESLint across the workspace |
| `pnpm test` | Test suites |
| `pnpm format` | Prettier |

## How the live map works

**Coordinates are fuzzed before they leave the server.** Clients never receive an exact
position — only a point offset within each user's configured radius. Two details make that
hold up:

```ts
const { angle, ratio } = userId
  ? this.stableFuzz(userId)                                   // deterministic per user
  : { angle: Math.random() * 2 * Math.PI, ratio: Math.sqrt(Math.random()) }
```

- The offset is **derived from the user id, not random per request.** Re-rolling it on every
  read would be the obvious implementation and the wrong one: an observer could sample the
  same person repeatedly and average the results back to their true location. A stable offset
  gives nothing away no matter how often it is polled.
- The fallback path uses `sqrt(random())` for the radius rather than `random()`. Sampling the
  radius uniformly concentrates points near the centre; the square root spreads them evenly
  across the disc, which is what makes the radius mean what it claims.

**Presence is derived, not stored.** Online status comes from `last_active` — under five
minutes reads as online, older as away — so a client that vanishes without disconnecting
decays on its own rather than lingering until a cleanup job notices.

**Redis carries the hot paths, Postgres stays the source of truth.** Map queries are cached
for 15 seconds, and per-user quotas are counters with TTLs. Nothing about a user's position
lives only in Redis, so a cache flush costs latency rather than data.

**Chat shares the map's socket connection**, so a conversation opened from a pin needs no
second transport and no second auth handshake.

## Safety and moderation

Dating products carry obligations that ordinary CRUD apps do not, so these are first-class
modules rather than afterthoughts:

- `safety/` — blocking, reporting, and the flows that follow a report
- `moderation/` — content review queues
- `photos/` — upload validation before anything reaches storage
- `identity/` — phone verification, so an account costs something to create
- Location fuzzing (above) — the map never reveals where someone actually is

## Deployment

The web app deploys to Vercel and the API to Railway; `railway.toml` holds the API service
definition. Shared packages build to `dist/` so the API's Docker build can resolve their
type declarations.

## License

MIT
