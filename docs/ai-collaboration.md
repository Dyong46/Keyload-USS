# AI Collaboration Evidence

**Project:** Unified Service Scheduler  
**Updated:** 30 October 2026  
**Status:** Design and implementation collaboration recorded; final manual submission checks remain

## 1. Ownership

The project owner supplied the Keyloop assessment, selected Scenario A, chose NestJS, Next.js/shadcn, PostgreSQL/Prisma, and Docker Compose, and made the business/product decisions.

GenAI helped clarify, design, implement, refactor, test, and document the solution. Generated proposals were not treated as requirements until the owner confirmed them. The owner remains responsible for understanding the delivered code and presenting its trade-offs.

## 2. Human decisions that changed AI proposals

| Topic | Proposal or ambiguity | Owner decision reflected in the solution |
|---|---|---|
| Qualification model | A separate Skill entity was considered | Direct Technician–ServiceType association. |
| User identity | Authentication was considered | One predefined demo staff member; auth outside scope. |
| Booking services | Earlier scope assumed one service | One or more sequential services; one technician covers all; durations are summed. |
| Resource assignment | Fully automatic assignment | Stable automatic suggestion plus staff selection among eligible alternatives. |
| Service execution | Manual Start/IN_PROGRESS was considered | No Start action; scheduled time defines execution; explicit completion releases early. |
| Confirmation delay | Unlimited delay after selecting a slot was discussed | Confirm through start + 15 minutes inclusive; later requests fail. |
| Repeated cancellation | Error was considered | Return the existing CANCELLED appointment unchanged. |
| UI structure | Decorative wizard/dropdowns | Staff-first tables/search, separate booking route, and scalable customer lookup. |
| Booking success | Dedicated confirmation page | Loading toast becomes success/error and returns to appointment list. |
| Logging | A custom logger was initially introduced | Standard NestJS Logger with structured domain-event objects. |

## 3. AI-assisted design work

- Extracted assessment obligations from the challenge and separated them from optional ideas.
- Converted iterative answers into the PRD, acceptance criteria, business rules, and validation examples.
- Proposed the modular-monolith architecture and PostgreSQL correctness boundary.
- Designed appointment service snapshots, effective occupancy, request identity/hash, replay behavior, and error categories.
- Drafted and maintained the OpenAPI contract before/alongside endpoint implementation.
- Identified that availability is advisory and must be revalidated during booking.
- Documented the implications of removing technician qualifications: future allocation changes, existing confirmed appointments remain valid.

## 4. AI-assisted implementation

Implementation assistance covered:

- Docker Compose PostgreSQL configuration, Prisma setup, migrations, and seed data.
- NestJS modules for health, reference data, availability, appointments, and technicians.
- Customer/vehicle, service-type, and technician management APIs.
- Serializable appointment creation, service snapshots, idempotent replay, lifecycle updates, and structured logs.
- Next.js API transport, TanStack Query hooks, booking workspace, appointment table, management pages, dialogs, toasts, and collapsible navigation.
- Unit/integration test creation and repeated lint/typecheck/build verification.

The project owner continuously reviewed usability and scope. Examples include rejecting customer dropdowns that would not scale to large datasets, asking for table/search controls for many services, requiring customer and technician administration, and restoring the sidebar collapse control.

## 5. Concrete corrections discovered during work

| Issue | Evidence and correction |
|---|---|
| Migration ordering | An empty migration directory caused Prisma P3015. It was removed; migrations were then applied first to the isolated test database and then development. |
| Customer lookup scalability | Loading all customers/dropdowns was replaced with debounced server lookup, a 10-result cap, normalized phone/registration search, and PostgreSQL prefix indexes. |
| Already-applied migration safety | Lookup indexes were moved into a new migration rather than modifying the previously applied customer migration. |
| Service selection usability | A long select control was replaced by a searchable compact table supporting multiple services. |
| New services without qualifications | Technician management gained qualification attach/detach and technician creation with initial service IDs. |
| Booking completion UX | The standalone confirmation screen was removed in favor of a loading/success/error toast and redirect. |
| API/document drift | OpenAPI was updated before new customer/service/technician endpoints, then runtime implementation and integration tests were added. |

These are observed changes from the working session, not reconstructed examples.

## 6. Verification performed

Recorded results on 30 October 2026:

- 19 backend unit tests passing.
- 3 backend HTTP e2e tests passing.
- 32 real-PostgreSQL integration tests passing.
- Integration coverage includes availability, no-common-technician, booking replay/mismatch, concurrent same-key requests, conflicting resource allocation, appointment reads, lifecycle transitions, cancel-versus-complete, customer/service management, and technician qualification management.
- Backend and frontend lint/typecheck/build commands passing.
- OpenAPI YAML parsing passing.
- Development and isolated test migrations applied successfully.

The documents do not claim automated frontend/browser tests, measured load performance, or a completed fresh-checkout rehearsal. Those remain submission checks.

## 7. Safe and responsible use

- Local environment secrets were kept in ignored files; examples contain local-only placeholders.
- AI did not publish the repository, send email, or modify a shared Postman workspace.
- Destructive database resets were avoided; development and test data use separate targets.
- Runtime behavior was verified with tests rather than accepted solely from generated code.
- The owner should review the final diff, rerun the documented commands, and be able to explain every major design decision during the interview.

## 8. Walkthrough narrative

A concise video explanation can say:

> I used GenAI to accelerate requirements clarification, architecture, API/schema drafting, implementation, and tests. I retained product ownership by correcting proposals—for example, direct Technician–ServiceType links, no Start state, multiple services, the 15-minute rule, and a staff-first UI. Generated changes were validated with type checks, builds, unit tests, and real PostgreSQL concurrency/integration tests. I have documented both verified evidence and remaining limitations rather than treating AI output as proof.
