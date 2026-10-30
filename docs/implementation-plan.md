# Unified Service Scheduler — Implementation Plan

**Updated:** 31 October 2026
**Status:** Product implementation complete; submission verification in progress  
**Requirements:** [PRD v1.5](PRD.md)

This file records delivered work and the remaining steps before submission. Checked items have implementation or verification evidence in the repository; unchecked items are not claimed complete.

## 1. Design and contract — complete

- [x] Confirm Scenario A scope and business rules.
- [x] Document architecture, components, data flow, technology choices, observability, and GenAI usage.
- [x] Define multi-service duration, all-service technician qualification, Vietnam operating hours, and the 15-minute confirmation allowance.
- [x] Define atomic booking, idempotent replay, lifecycle transitions, and effective occupancy.
- [x] Maintain a versioned OpenAPI contract.

Artifacts: [PRD](PRD.md), [System Design](system-design.md), [OpenAPI](openapi.yaml).

## 2. Foundation and persistence — complete

- [x] NestJS and Next.js TypeScript applications.
- [x] PostgreSQL 17 through Docker Compose with readiness health checks.
- [x] Persistent development database and isolated guarded test database.
- [x] Prisma schema, reviewed migrations, generated client, and repeatable seed.
- [x] Global validation, consistent errors, correlation IDs, Swagger UI, and demo staff identity.
- [x] Example environment files with local secrets ignored.

Key database safeguards include composite relationship keys, positive-duration/lifecycle checks, a unique appointment request key, and GiST exclusion constraints for technician, bay, and vehicle occupancy.

## 3. Reference and administration workflows — complete

- [x] Capped customer lookup by name, normalized phone, or normalized registration.
- [x] Customer create/update and owned-vehicle creation.
- [x] Dealership listing.
- [x] Service-type list/create/update.
- [x] Technician list/filter/create/update.
- [x] Idempotent Technician–ServiceType attach/detach.
- [x] Staff management pages for customers, service types, and technicians.

## 4. Availability — complete

- [x] Sum fixed durations for multiple selected services.
- [x] Require one technician qualified for every selected service.
- [x] Generate 30-minute starts during 08:00–17:00 Asia/Ho_Chi_Minh.
- [x] Exclude past starts and appointments ending after close.
- [x] Check vehicle, technician, and bay over the full interval.
- [x] Return eligible alternatives with stable ascending-ID suggestions.
- [x] Keep availability read-only and non-reserving.

## 5. Atomic booking and replay — complete

- [x] Require UUID `Idempotency-Key`.
- [x] Canonicalize booking content and persist a SHA-256 request hash.
- [x] Return the existing appointment for same-key/same-content replay.
- [x] Reject same-key/different-content requests.
- [x] Validate vehicle ownership, dealership membership, service existence, and technician qualification.
- [x] Permit confirmation through start + 15 minutes inclusive.
- [x] Recheck full-interval occupancy without silently substituting resources.
- [x] Persist appointment, service snapshots, allocation, and request identity atomically.
- [x] Use serializable transactions and database exclusion constraints to prevent double booking.
- [x] Retry one serializable transaction conflict and recheck committed replay.

## 6. Reads and lifecycle — complete

- [x] Appointment list with combined filters, search, stable ordering, and default 20-row pagination.
- [x] Appointment detail.
- [x] Idempotent cancellation of uncompleted appointments.
- [x] Completion at/after start; repeated completion is rejected.
- [x] Early cancellation/completion shortens occupancy while preserving history.
- [x] Resources release at scheduled end even if status remains CONFIRMED.
- [x] Concurrent cancel-versus-complete serialization.

## 7. Frontend demonstration — complete

- [x] Staff-first appointment table with search, filters, pagination, cancel, and complete actions.
- [x] Separate new-appointment route.
- [x] Customer/vehicle lookup and inline creation.
- [x] Searchable multi-service table and duration summary.
- [x] Date-based availability table with technician/bay alternatives.
- [x] Loading, empty, error, conflict, and success feedback.
- [x] Loading toast followed by success/error; no intermediate confirmation page.
- [x] Customer, service-type, and technician management routes.
- [x] Collapsible sidebar navigation.

## 8. Automated verification — substantially complete

- [x] Unit tests for scheduling/time/validation helpers.
- [x] Real-PostgreSQL availability tests.
- [x] Booking creation, replay, changed-content, ownership, and conflict tests.
- [x] Concurrent same-key and conflicting-resource booking tests.
- [x] Appointment read/filter/search/pagination tests.
- [x] Cancellation, completion, early release, invalid state, and lifecycle race tests.
- [x] Customer/service/technician management integration tests.
- [x] Backend/frontend lint and TypeScript checks.
- [x] Backend/frontend production builds.
- [x] OpenAPI YAML parsing.
- [ ] Automated frontend component or browser E2E tests.
- [ ] Measured load/performance run with recorded environment and dataset.
- [ ] Fresh-checkout rehearsal on a separate machine or clean workspace.

Current evidence (31 October 2026): 18 unit tests, 2 HTTP e2e tests, and 32 PostgreSQL integration tests passing. Rerun the complete submission command set before recording the video.

## 9. Submission preparation — remaining

- [x] Synchronize requirements, design, OpenAPI, implementation plan, READMEs, and AI evidence with implemented behavior.
- [x] Run and record the complete backend test command set, including HTTP e2e.
- [ ] Perform a manual browser smoke test of the demo flow.
- [ ] Verify ignored files and scan the repository for credentials/unintended artifacts.
- [ ] Rehearse setup from a clean checkout.
- [ ] Create focused commits and push the repository.
- [ ] Record a 5–10 minute walkthrough.
- [ ] Verify repository/video access and send the submission email.

## 10. Suggested walkthrough

1. Problem and confirmed business rules.
2. Architecture and PostgreSQL correctness boundary.
3. Create or find a customer/vehicle.
4. Create a service type and technician qualification.
5. Book multiple services and override suggested resources.
6. Demonstrate a conflict or no-common-technician result.
7. Cancel or complete and show released availability.
8. Show idempotency/concurrency tests and observability.
9. Explain GenAI collaboration, owner corrections, and known limitations.

## 11. Completion gate

The implementation is ready for submission only when the remaining submission checks are recorded, repository contents are safe to publish, and the video demonstrates the same behavior described by the checked-in documentation.
