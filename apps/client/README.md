# USS frontend

Next.js App Router frontend for the Unified Service Scheduler.

## Responsibilities

- Appointment table with search, status filters, pagination, cancellation, and completion.
- Single-screen staff booking workspace.
- Debounced customer lookup by name, phone, or registration.
- Inline customer/vehicle creation.
- Searchable multi-service selection and duration total.
- Backend-provided availability, technician alternatives, and bay alternatives.
- Customer, service-type, and technician administration.
- Technician qualification attach/detach.
- Loading/error/empty states and toast feedback.
- Collapsible desktop sidebar.

TanStack Query owns client-side server state. API functions are separate from UI components under `features/scheduler/api`; reusable queries/mutations live under feature hooks. React Hook Form and Zod handle interactive forms. Scheduling decisions remain in the backend.

## API configuration

The browser calls same-origin `/api/*`. Next.js rewrites those requests to:

```text
BACKEND_API_URL=http://127.0.0.1:8000
```

Do not put database credentials or other secrets in client-visible environment variables.

## Run

```bash
npm ci
npm run dev
```

Start the NestJS API on port `8000`, then open `http://localhost:3000`.

## Verify

```bash
npm run lint
npm run typecheck
npm run build -- --webpack
```

Automated frontend component/browser tests are not currently included; manual browser smoke testing remains part of the submission checklist.
