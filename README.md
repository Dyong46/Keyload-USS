# Unified Service Scheduler

Keyloop Technical Assessment — Scenario A.

USS is a dealership-staff application for booking vehicle service appointments. It checks that one qualified technician and one service bay are available for the full combined duration of the selected services, then persists the confirmed allocation atomically.

## What is implemented

- Staff booking workspace with customer/vehicle lookup and creation.
- Multiple fixed-duration services per appointment.
- 30-minute availability choices during 08:00–17:00 Vietnam time.
- Stable technician/bay suggestions with eligible manual alternatives.
- Atomic booking, full-interval revalidation, PostgreSQL overlap constraints, and idempotent request replay.
- Appointment list/detail, search, filters, pagination, cancellation, and completion.
- Customer, service-type, and technician management pages.
- Technician–service qualification attach/detach operations.
- Structured NestJS domain-event logs and correlation IDs.

## Documentation

- [Requirements / PRD](docs/PRD.md) — confirmed product scope and acceptance rules.
- [System Design](docs/system-design.md) — architecture, data model, flows, concurrency, observability, and technology trade-offs.
- [OpenAPI contract](docs/openapi.yaml) — implemented HTTP interface.
- [Implementation plan](docs/implementation-plan.md) — delivery status and remaining submission work.
- [AI collaboration evidence](docs/ai-collaboration.md) — how GenAI was used, human decisions, corrections, and verification boundaries.

## Repository structure

```text
USS/
├── apps/
│   ├── client/       Next.js staff application
│   └── server/       NestJS API, Prisma schema, migrations, and Compose
└── docs/              Requirements, system design, OpenAPI, and AI evidence
```

The backend owns all scheduling decisions. See [System Design](docs/system-design.md) for architecture and booking-correctness details.

## Quick start

Prerequisites: Node.js, npm, Docker, and Docker Compose.

From `USS`:

```bash
cd apps/server
cp -n .env.example .env
cp -n .env.test.example .env.test

docker compose up -d --wait postgres

npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npm run start:dev
```

In another terminal:

```bash
cd apps/client
npm ci
npm run dev
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- Readiness: `GET http://localhost:8000/health`

The frontend proxies `/api/*` to `BACKEND_API_URL`, which defaults to `http://127.0.0.1:8000`.

## Demo flow

1. Open **Customers** to find/create a customer, or create one inline during booking.
2. Open **Service types** to maintain service names and fixed durations.
3. Open **Technicians** to create technicians and maintain qualifications.
4. Open **Appointments → New appointment**.
5. Select customer, vehicle, services, dealership, date, available start, technician, and bay.
6. Confirm the appointment; a loading toast becomes a success/error result.
7. Use the appointment table to search, cancel, or complete service.

## Verification

Start the isolated PostgreSQL test service before integration tests:

```bash
cd apps/server
npm run db:test:up
npm run db:test:migrate
npm run db:test:seed
npm run test
npm run test:e2e
npm run test:integration
npm run lint
npm run typecheck
npm run build
```

Frontend checks:

```bash
cd apps/client
npm run lint
npm run typecheck
npm run build -- --webpack
```

Current recorded evidence (31 October 2026):

- Backend unit tests: 18 passing.
- Backend HTTP e2e tests: 2 passing.
- PostgreSQL integration tests: 32 passing, including concurrent booking/replay and cancel-versus-complete races.
- Backend and frontend lint, type checks, and production builds: passing.
- OpenAPI YAML parsing: passing.

Not yet claimed: automated frontend component/E2E coverage, a fresh-checkout rehearsal on another machine, or measured load/performance results.

## Database notes

- Development PostgreSQL uses a named volume and loopback port `5432` by default.
- The isolated test database uses `uss_test` on loopback port `5433`; guarded scripts reject other targets.
- Docker Compose configuration and its `.env` file live in `apps/server`; run Compose commands from that directory.
- Prisma migrations own the schema. No `init.sql` duplicates table creation.
- The repeatable seed creates 20 customers, 20 vehicles, 15 service types, 20 technicians, four dealerships with five technicians and four bays each, and qualification combinations. Appointments are created through the application flow rather than seeded.
- From `apps/server`, `docker compose down` keeps data; `docker compose down --volumes` intentionally deletes local database data.

## Known limitations

- Authentication and authorization are intentionally omitted for this local assessment demo.
- Rescheduling, payments, notifications, individual shifts/leave, reporting, and production deployment are outside scope.
- Automated browser/component tests and measured load results are not claimed.

For endpoint schemas and errors, use the checked-in [OpenAPI contract](docs/openapi.yaml) or runtime Swagger UI. The required GenAI disclosure and concrete collaboration evidence are documented separately in [AI Collaboration Evidence](docs/ai-collaboration.md).
