# FieldSprout

Field sales & seed distribution management platform — built for agri companies to manage their sales reps, distributors, orders, stock, and dues in one place.

## What's inside

| App / Package | Description |
|---|---|
| `apps/api` | NestJS REST API — auth, orders, stock, GPS, reports, notifications |
| `apps/web` | Next.js 14 web portal — Admin & Warehouse Manager dashboards |
| `apps/mobile` | React Native + Expo app — Sales Rep mobile client |
| `packages/types` | Shared TypeScript types across all apps |
| `packages/validation` | Shared Zod validation schemas |

## Tech stack

- **API** — NestJS, Prisma ORM, PostgreSQL, Redis, BullMQ, Swagger
- **Web** — Next.js 14, TailwindCSS, React Query, shadcn/ui
- **Mobile** — React Native, Expo, Zustand
- **Auth** — JWT (access + refresh tokens), OTP via Twilio / MSG91
- **Notifications** — Firebase FCM (push), Gupshup (WhatsApp), MSG91 (SMS)
- **Infrastructure** — Docker Compose for local Postgres + Redis

## Prerequisites

- Node.js >= 20
- Docker & Docker Compose
- npm >= 10

## Getting started

### 1. Clone & install

```bash
git clone https://github.com/harshavardhanpalvatla/fieldsprout.git
cd fieldsprout
npm install
```

### 2. Configure environment

```bash
cp .env.example apps/api/.env
```

Edit `apps/api/.env`. For local development the defaults work out of the box — OTP is set to `fake` mode so any phone number authenticates with code `000000`.

### 3. Start infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL on port **5433** and Redis on port **6380**.

### 4. Run database migrations & seed

```bash
npm run migrate --workspace=apps/api   # applies Prisma migrations
npm run seed --workspace=apps/api      # seeds demo users, products, warehouses
```

### 5. Start the API

```bash
npm run dev --workspace=apps/api
# → http://localhost:3000
# → Swagger docs: http://localhost:3000/api
```

### 6. Start the web portal

```bash
npm run dev --workspace=apps/web
# → http://localhost:3001
```

### 7. Start the mobile app

```bash
npm run start --workspace=apps/mobile
# → scan QR with Expo Go, or press i/a for iOS/Android simulator
```

## Default roles & demo credentials

After seeding, the following phone numbers are available (OTP: `000000` in fake mode):

| Role | Description |
|---|---|
| Admin | Full platform access — users, products, reports, settings |
| Warehouse Manager | Stock management, order dispatch, warehouse ops |
| Sales Rep | Mobile app — place orders, log visits, GPS check-in |

Exact phone numbers are printed by the seed script on first run.

## Project structure

```
fieldsprout/
├── apps/
│   ├── api/
│   │   ├── prisma/          # Schema & seed
│   │   └── src/
│   │       ├── auth/        # JWT + OTP auth
│   │       ├── orders/      # Order lifecycle
│   │       ├── stock/       # Inventory & movements
│   │       ├── distributors/
│   │       ├── dues/        # Dues tracking + Tally sync
│   │       ├── gps/         # Location tracking
│   │       ├── reports/     # Aggregated reports
│   │       ├── notifications/
│   │       └── users/
│   ├── web/
│   │   └── src/
│   │       ├── app/
│   │       │   ├── admin/   # Admin portal pages
│   │       │   └── warehouse/ # Warehouse portal pages
│   │       ├── components/
│   │       └── lib/
│   └── mobile/
│       └── src/
│           ├── screens/     # Auth, orders, visits, profile
│           ├── stores/      # Zustand state
│           ├── api/         # API client hooks
│           └── navigation/
└── packages/
    ├── types/               # Shared TS types
    └── validation/          # Shared Zod schemas
```

## Key API endpoints

Full interactive docs available at `http://localhost:3000/api` (Swagger UI) once the API is running.

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/send-otp` | Send OTP to phone |
| `POST` | `/auth/verify-otp` | Verify OTP, get tokens |
| `POST` | `/auth/refresh` | Refresh access token |
| `GET` | `/orders` | List orders (filtered by role) |
| `POST` | `/orders` | Create order |
| `PATCH` | `/orders/:id/status` | Approve / dispatch / deliver |
| `GET` | `/stock` | Current stock levels |
| `POST` | `/stock/adjust` | Manual stock adjustment |
| `GET` | `/reports/sales` | Sales summary report |
| `GET` | `/distributors` | List distributors |
| `GET` | `/dues` | Outstanding dues |

## Environment variables

See [`.env.example`](.env.example) for the full list. Key variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Secret for signing JWTs — **change in production** |
| `OTP_PROVIDER` | `fake` (dev) or `twilio` (prod) |
| `STOCK_LOW_THRESHOLD` | Units below which low-stock alerts fire |

## Scripts

Run from the repo root using `--workspace`:

```bash
npm run dev --workspace=apps/api        # API dev server (watch mode)
npm run build --workspace=apps/api      # Production build
npm run migrate --workspace=apps/api    # Apply DB migrations
npm run seed --workspace=apps/api       # Seed demo data
npm run studio --workspace=apps/api     # Open Prisma Studio
npm run test --workspace=apps/api       # Run tests
npm run dev --workspace=apps/web        # Web portal dev server
npm run start --workspace=apps/mobile   # Expo dev server
```

## License

MIT
