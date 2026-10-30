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

Authentication, rescheduling, payments, notifications, individual shifts/leave, and production deployment are intentionally outside this assessment scope.

## Documentation

- [Requirements / PRD](docs/PRD.md) — confirmed product scope and acceptance rules.
- [System Design](docs/system-design.md) — implemented architecture, data flow, concurrency, observability, trade-offs, and GenAI usage.
- [OpenAPI contract](docs/openapi.yaml) — implemented HTTP interface.
- [Implementation plan](docs/implementation-plan.md) — delivery status and remaining submission work.
- [AI collaboration evidence](docs/ai-collaboration.md) — human decisions, AI-assisted work, corrections, and actual verification.

## Architecture

```text
Browser :3000
  └─ Next.js App Router + TanStack Query
       └─ /api/* rewrite
            └─ NestJS API :8000
                 └─ Prisma
                      └─ PostgreSQL 17 :5432
```

The backend owns all scheduling decisions. Availability is advisory; booking revalidates ownership, qualification, time, and resource occupancy inside a serializable transaction. PostgreSQL exclusion constraints are the final double-booking guard.

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
- The seed is repeatable and creates multiple dealerships, resources, qualification combinations, customers, vehicles, and a refreshable future appointment.
- From `apps/server`, `docker compose down` keeps data; `docker compose down --volumes` intentionally deletes local database data.

## API summary

| Area               | Endpoints                                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Health             | `GET /health`                                                                                                    |
| Customers/vehicles | `GET/POST /customers`, `PATCH /customers/{id}`, `GET/POST /customers/{id}/vehicles`                              |
| Reference data     | `GET /dealerships`, `GET/POST /service-types`, `PATCH /service-types/{id}`                                       |
| Technicians        | `GET/POST /technicians`, `PATCH /technicians/{id}`, `PUT/DELETE /technicians/{id}/service-types/{serviceTypeId}` |
| Scheduling         | `GET /availability`, `GET/POST /appointments`, `GET /appointments/{id}`                                          |
| Lifecycle          | `POST /appointments/{id}/cancel`, `POST /appointments/{id}/complete`                                             |

See [OpenAPI](docs/openapi.yaml) for request/response schemas and errors.

## AI collaboration

GenAI assisted with requirements clarification, architecture alternatives, contract drafting, implementation, refactoring, tests, and documentation synchronization. The project owner selected the scenario, stack, and business rules; corrected proposals such as a separate Skill model and manual Start state; and approved the final behavior. Concrete examples and evidence boundaries are recorded in [AI collaboration evidence](docs/ai-collaboration.md).
