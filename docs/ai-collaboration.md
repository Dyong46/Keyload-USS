# AI Collaboration Evidence

**Project:** Unified Service Scheduler  
**Updated:** 31 October 2026
**Status:** Collaboration evidence recorded; final manual submission checks remain

## 1. Ownership

The project owner supplied the Keyloop assessment, selected Scenario A, chose NestJS, Next.js/shadcn, PostgreSQL/Prisma, and Docker Compose, and made the business/product decisions.

GenAI helped clarify, design, implement, refactor, test, and document the solution. Generated proposals were not treated as requirements until the owner confirmed them. The owner remains responsible for understanding the delivered code and presenting its trade-offs.

## 2. Human decisions that changed AI proposals

| Topic                 | Proposal or ambiguity                                | Owner decision reflected in the solution                                               |
| --------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Qualification model   | A separate Skill entity was considered               | Direct Technician–ServiceType association.                                             |
| User identity         | Authentication was considered                        | One predefined demo staff member; auth outside scope.                                  |
| Booking services      | Earlier scope assumed one service                    | One or more sequential services; one technician covers all; durations are summed.      |
| Resource assignment   | Fully automatic assignment                           | Stable automatic suggestion plus staff selection among eligible alternatives.          |
| Service execution     | Manual Start/IN_PROGRESS was considered              | No Start action; scheduled time defines execution; explicit completion releases early. |
| Confirmation delay    | Unlimited delay after selecting a slot was discussed | Confirm through start + 15 minutes inclusive; later requests fail.                     |
| Repeated cancellation | Error was considered                                 | Return the existing CANCELLED appointment unchanged.                                   |
| UI structure          | Decorative wizard/dropdowns                          | Staff-first tables/search, separate booking route, and scalable customer lookup.       |
| Booking success       | Dedicated confirmation page                          | Loading toast becomes success/error and returns to appointment list.                   |
| Logging               | A custom logger was initially introduced             | Standard NestJS Logger with structured domain-event objects.                           |

## 3. How GenAI was used

- **Requirements:** extracted challenge obligations, separated mandatory scope from optional ideas, and converted the owner's answers into testable requirements.
- **Design:** proposed architecture, data-model, API, concurrency, idempotency, lifecycle, and observability alternatives for owner review.
- **Implementation:** assisted with backend/frontend code, migrations, seed data, refactoring, and documentation under owner direction.
- **Verification:** helped create tests, diagnose failures, and run lint, type checks, builds, and PostgreSQL integration/concurrency checks.

The implementation details themselves are documented in [System Design](system-design.md), while the HTTP contract is maintained in [OpenAPI](openapi.yaml). This document records the collaboration process rather than duplicating those sources.

## 4. Concrete corrections discovered during work

| Issue                               | Evidence and correction                                                                                                                                          |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migration ordering                  | An empty migration directory caused Prisma P3015. It was removed; migrations were then applied first to the isolated test database and then development.         |
| Customer lookup scalability         | Loading all customers/dropdowns was replaced with debounced server lookup, bounded results, normalized phone/registration search, and PostgreSQL prefix indexes. |
| Already-applied migration safety    | Lookup indexes were moved into a new migration rather than modifying the previously applied customer migration.                                                  |
| Service selection usability         | A long select control was replaced by a searchable compact table supporting multiple services.                                                                   |
| New services without qualifications | Technician management gained qualification attach/detach and technician creation with initial service IDs.                                                       |
| Booking completion UX               | The standalone confirmation screen was removed in favor of a loading/success/error toast and redirect.                                                           |
| API/document drift                  | OpenAPI was updated before new customer/service/technician endpoints, then runtime implementation and integration tests were added.                              |

These are observed changes from the working session, not reconstructed examples.

## 5. Verification of AI-assisted work

Generated code and documents were not accepted solely because they were produced successfully. They were reviewed against the confirmed PRD and checked using unit, HTTP e2e, and real-PostgreSQL integration/concurrency tests, plus linting, type checking, production builds, migration runs, and OpenAPI parsing.

The repository [README](../README.md#verification) is the single source for current commands, recorded counts, and outstanding verification gaps. The project does not claim automated frontend/browser tests, measured load performance, or a completed fresh-checkout rehearsal.

## 6. Safe and responsible use

- Local environment secrets were kept in ignored files; examples contain local-only placeholders.
- AI did not publish the repository, send email, or modify a shared Postman workspace.
- Development and test databases use separate, explicitly configured targets; destructive resets remain a deliberate local operator action.
- Runtime behavior was verified with tests rather than accepted solely from generated code.
- The owner should review the final diff, rerun the documented commands, and be able to explain every major design decision during the interview.

## 7. Evidence boundaries

This file is a curated record of material decisions and corrections, not a complete prompt transcript. It distinguishes observed work from claims about quality: test results establish the covered behaviors, but they do not prove production readiness, usability at scale, security hardening, or performance under load. The project owner remains responsible for reviewing the final diff and explaining the major decisions during the interview.
