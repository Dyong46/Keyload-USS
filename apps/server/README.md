# USS backend

NestJS API for the Unified Service Scheduler. The backend uses PostgreSQL through Prisma migrations and exposes reference-data management, availability, booking, reads, cancellation, and completion.

## Setup

Run these commands from `apps/server`; `compose.yaml` and the Compose environment values are colocated here:

```bash
cp -n .env.example .env
cp -n .env.test.example .env.test
docker compose up -d --wait postgres
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npm run start:dev
```

- API: `http://localhost:8000`
- Readiness: `GET http://localhost:8000/health`
- Swagger UI: `http://localhost:8000/docs`

Customer lookup is capped and server-side: `GET /customers?search=...&limit=10` matches name, normalized phone, or normalized registration. Customers support `POST /customers` and `PATCH /customers/{id}`; vehicles use `POST /customers/{id}/vehicles`. Service types support `GET`, `POST`, and `PATCH /service-types/{id}`.

Technician management uses `GET /technicians`, transactional `POST /technicians` with optional initial qualifications, `PATCH /technicians/{id}`, and idempotent `PUT`/`DELETE /technicians/{id}/service-types/{serviceTypeId}` qualification operations. Qualification changes affect future allocation; existing confirmed appointments remain unchanged.

`GET /availability` returns non-reserving 30-minute starts plus eligible technician/bay alternatives. `POST /appointments` requires an `Idempotency-Key`, revalidates the full interval in a serializable transaction, and relies on PostgreSQL exclusion constraints as the final double-booking guard. Appointment reads, cancellation, and completion are also implemented; lifecycle changes shorten effective occupancy without deleting history.

## Quality checks

```bash
npm run format
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run test:integration
npm run build
```

See the repository [README](../../README.md) for the isolated test database workflow. The test database guard accepts only `uss_test` on `localhost:5433`; do not point `.env.test` to the development database.

Recorded on 30 October 2026: 19 unit tests, 3 HTTP e2e tests, and 32 PostgreSQL integration tests passed. Rerun all commands above before submission rather than relying only on this recorded result.
