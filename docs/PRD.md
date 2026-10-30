# Unified Service Scheduler — Requirements

**Project:** Unified Service Scheduler (USS)  
**Context:** Keyloop Technical Assessment — Scenario A  
**Version:** 1.5 — Confirmed requirements and delivered administration scope  
**Updated:** 2026-10-30  
**Primary user:** Dealership staff  
**Implementation scope:** Full backend with a demonstration frontend  
**Language:** English

This document defines the agreed requirements for implementing and evaluating USS. Its audience is the project owner, implementer, and Keyloop reviewer. It is the project's requirements baseline, not an official Keyloop specification or evidence that the application has already been implemented.

The baseline covers the selected assessment scope, user workflows, functional acceptance criteria, business rules, business data, quality requirements, and validation examples. These sections establish what must be delivered and how it will be assessed. The decision register records the agreed simplifications and extensions. Requirement and validation IDs remain stable for downstream design and tests.

Architecture diagrams, component responsibilities, technical data flow, technology justifications, the detailed observability strategy, and design-phase GenAI collaboration belong in the separate System Design Document. Database schema, endpoint payloads, and implementation sequencing are not defined here.

# 1. Product Overview

## 1.1 Background

Manual service booking can allocate a busy service bay or an unavailable or unqualified technician. USS helps dealership staff book services on behalf of customers, verify availability, and persist confirmed appointments.

## 1.2 Sources and authority

- **Keyloop:** The supplied `KeyloopCodingChallange.pdf`, Scenario A and its assessment deliverables.
- **Confirmed:** Explicit project-owner decisions made during clarification. These define the selected demo scope and extend the assessment requirements.
- Where a future decision conflicts with the assessment, record the conflict rather than silently replacing a core requirement.

## 1.3 Objectives and success criteria

The solution must demonstrate:

1. Booking for a specified vehicle, service type, dealership, and desired time.
2. A check that both a service bay and a qualified technician are available for the entire scheduled service duration before confirmation.
3. A persistent appointment linking the customer, vehicle, technician, and bay.
4. Safe booking under concurrent requests, including prevention of overlapping appointments for the same vehicle across dealerships.
5. Appointment viewing, cancellation, and explicit completion with early resource release.
6. Recognition of repeated booking requests without creating additional appointments.

Items 1–3 originate from Keyloop; items 4–6 reflect confirmed project scope and correctness requirements. The project extends the core service selection to support one or more services in a single appointment and confirms the booking immediately after validation; no later approval workflow is required.

## 1.4 Assessment traceability

| Source obligation | Requirements | Example validation evidence |
|---|---|---|
| Resource-constrained request for a vehicle, service, dealership, and time | FR-02, FR-03, FR-05 | TC-01, TC-09, TC-25, TC-33, TC-37 |
| Full-duration availability of a bay and a qualified technician before confirmation | FR-04, FR-06, FR-10 | TC-02–08, TC-16–17, TC-34–36 |
| Persistent appointment linking customer, vehicle, technician, and bay | FR-05, FR-08, NFR-01, NFR-04 | TC-01, TC-13, TC-26 |
| Selected project extensions | FR-07, FR-09, FR-11–14; vehicle rule in FR-10 | TC-10–12, TC-18–24, TC-27–32, TC-38–42 |

Validation IDs identify expected evidence, not completed tests. The full requirement text remains authoritative; examples are not an exhaustive substitute for its acceptance criteria.

# 2. Product Scope

## 2.1 In scope

| Feature ID | Capability | Source |
|---|---|---|
| F01 | Demo staff identity without login | Confirmed; replaces demo authentication |
| F02 | Search/select customers and vehicles; create missing customer or vehicle inline; update customer details | Confirmed extension |
| F03 | Select configured dealerships and service types | Confirmed |
| F04 | Display available start times for a selected date | Keyloop core check; confirmed interaction |
| F05 | Create and persist a confirmed appointment | Keyloop |
| F06 | Automatically suggest resources and allow staff to select alternatives | Confirmed |
| F07 | View appointment list | Confirmed |
| F08 | View appointment details | Confirmed |
| F09 | Cancel an appointment | Confirmed |
| F10 | Prevent resource and vehicle booking conflicts | Core correctness and confirmed vehicle rule |
| F11 | Complete service and release resources early | Confirmed |
| F12 | Recognize repeated booking requests | Confirmed |
| F13 | Create and update customer and service-type reference records | Confirmed extension |
| F14 | Create/update technicians and maintain Technician–ServiceType qualifications | Confirmed extension |

All capabilities above are in the agreed delivery scope. Source labels distinguish assessment obligations from project extensions; they do not make confirmed extensions optional.

## 2.2 Out of scope

- Staff login, registration, JWT authentication, and account administration.
- Customer self-service booking.
- Bulk import, record merge/deduplication, deletion, and general dealership/service-bay administration. Customer, service-type, and technician management are limited to the delivered demo operations.
- Multiple technicians or bays in one appointment.
- A separate Skill entity or skill-matching system.
- Active/inactive resource status management; all seeded technicians and bays are operational.
- A manual Start Service action or an explicit IN_PROGRESS status.
- Individual technician shifts, leave, or breaks; technicians follow the shared dealership operating hours.
- Appointment rescheduling.
- Payments.
- Email/SMS notifications.
- Reporting and analytics.
- Automatic workload balancing between technicians.

These exclusions were explicitly confirmed during clarification.

## 2.3 Implementation boundary

- Backend: NestJS; fully implemented booking business logic and persistence.
- Frontend: Next.js with shadcn/ui; a demonstration client for the selected workflows.
- Database: PostgreSQL with Prisma.
- Local database server: Docker Compose, as specified in the initial project direction.
- Detailed architecture, API contracts, schema design, transaction mechanisms, and implementation sequencing belong in separate design artifacts.

# 3. User Roles & Personas

## 3.1 Dealership staff

Staff book on behalf of customers, choose a dealership from sample data, view available times, accept or change suggested resources, and view, cancel, or complete appointments.

## 3.2 Demo identity

No login is required. A predefined demo staff identity is used. The demo supports selecting sample dealerships rather than restricting staff to one fixed dealership. Production authentication and dealership authorization are outside this demo boundary.

# 4. Business Process

## 4.1 Main booking flow

1. Staff search by phone, registration, or customer name and select an existing customer/vehicle, or create the missing customer/vehicle inline.
2. Staff select a dealership and one or more service types.
3. The system shows each selected service duration and the total appointment duration, calculated as their sum. Services are performed sequentially.
4. Staff select a date.
5. The system shows available start times at 30-minute intervals.
6. Staff select a start time.
7. The system suggests one technician qualified for every selected service and one bay, both available for the entire combined duration.
8. Staff may replace either suggestion with another eligible resource available for the full duration.
9. Staff confirm the booking.
10. The backend revalidates the vehicle, selected resources, time, and qualification, and persists the appointment atomically.
11. The system returns the confirmed appointment, including its assigned resources.

Availability results and resource suggestions do not reserve resources. A stale selection must not result in a conflicting appointment. If a selected resource is no longer available, the system reports the conflict rather than silently assigning a different resource.

## 4.2 Alternate flows

- No eligible technician or no available bay: do not offer the affected start time.
- Vehicle already booked for an overlapping interval: do not offer that interval for the vehicle and reject a conflicting confirmation.
- Availability changes before confirmation: reject the conflicting booking and let staff choose again.
- Invalid customer, vehicle, dealership, service, or resource selection: reject the request without persisting a partial appointment.
- Repeated booking request: return the appointment already created for that same request.

## 4.3 Cancellation and completion

Staff may cancel any appointment that has not been completed, including after its scheduled start. Cancellation retains the appointment and releases its remaining allocation.

Staff may complete an appointment at or after its scheduled start without first pressing a Start button. Completion records the actual completion time and releases the remaining allocation immediately. Passing the scheduled end makes resources available even if staff have not completed the appointment.

# 5. Functional Requirements

## FR-01 — Demo Staff Access

**Source:** Confirmed project decision.

- AC01: Staff can access demo appointment workflows without entering credentials.
- AC02: The system uses a predefined demo staff identity.
- AC03: Staff can choose from sample dealerships; no registration or account management is provided.

## FR-02 — Customer & Vehicle Selection

**Source:** Confirmed.

- AC01: Staff can search customers by partial name, normalized phone, or normalized vehicle registration without loading the full customer table.
- AC02: Staff can create a customer with name and unique normalized phone, then add a vehicle with a unique normalized registration.
- AC03: Booking rejects nonexistent customers or vehicles.
- AC04: Booking rejects a vehicle that does not belong to the selected customer.

## FR-03 — Dealership & Service Type Selection

**Source:** Confirmed.

- AC01: Staff can select a dealership and one or more configured service types.
- AC02: Each service type has a fixed positive duration; staff do not enter or override it during booking.
- AC03: Qualification is represented by direct Technician–ServiceType associations. The single assigned technician must be associated with every selected service type. A separate Skill entity is not required.
- AC04: Booking rejects nonexistent dealerships or service types and an empty service selection.
- AC05: Services are performed sequentially. Total appointment duration is the sum of all selected service durations, with no overlap or additional buffer. The same technician and bay are allocated for that full duration.

## FR-04 — Check Appointment Availability

**Source:** Keyloop core check and confirmed scheduling decisions.

- AC01: Staff request availability for a dealership, the selected service types, vehicle, and selected date.
- AC02: Start times occur on 30-minute boundaries within daily opening hours.
- AC03: A displayed time has at least one technician qualified for every selected service and one bay available for the full combined duration at the selected dealership.
- AC04: The vehicle has no overlapping booking, including at a different dealership.
- AC05: The calculated end does not exceed 17:00. When presenting start-time choices, the system excludes times already in the past.
- AC06: Adjacent allocations may share an end/start boundary without conflicting.
- AC07: Displaying a time does not reserve it; confirmation performs a fresh check.
- AC08: Availability reflects cancellation, early completion, and scheduled release according to Section 8.

## FR-05 — Create Appointment

**Source:** Keyloop; confirmed interaction extensions.

- AC01: Booking identifies one customer, vehicle, dealership, one or more service types, start time, one technician, and one bay.
- AC02: The backend calculates scheduled end as scheduled start plus the sum of selected service durations, and validates all selected associations and full-duration availability.
- AC03: Successful creation immediately persists and returns a CONFIRMED appointment linked to all identified entities; there is no pending approval step.
- AC04: The response identifies the appointment and its assigned resources.
- AC05: If either resource or the vehicle is unavailable, no appointment is created.
- AC06: Persistence failure does not leave a partial appointment or allocation.
- AC07: Restarting the backend does not lose committed appointments.
- AC08: Confirmation retains the selected scheduled start and end. The backend checks its current time at confirmation: a request may be accepted up to and including 15 minutes after the selected scheduled start, provided all other checks pass. More than 15 minutes after that start, the request is rejected without creating an appointment, and staff must choose another available time. The grace period is measured from scheduled start, not from selection time. The backend still revalidates the full selected interval for the technician, bay, and vehicle. The interface excludes past times when presenting new choices.

## FR-06 — Suggested Resources with Staff Override

**Source:** Confirmed project decision.

- AC01: The system suggests one technician qualified for every selected service and one bay, both from the selected dealership and available for the full combined interval.
- AC02: Staff can select another available, qualified technician or another available bay before confirmation.
- AC03: All bays support all service types; no bay–service compatibility mapping is needed.
- AC04: The backend validates the exact selected resources at confirmation.
- AC05: A stale selection is rejected; it is not silently substituted.
- AC06: Exactly one technician and one bay are persisted per appointment.
- AC07: Among eligible resources, suggest the technician and bay independently in ascending identifier order. Staff can override either suggestion with another eligible resource.

## FR-07 — View Appointment List

**Source:** Confirmed capability.

- AC01: Staff can retrieve persisted appointments, including cancelled and completed appointments.
- AC02: Each entry identifies its appointment, customer, vehicle, dealership, selected services, scheduled interval, and status.
- AC03: Staff can filter appointments by dealership, scheduled service date in Asia/Ho_Chi_Minh, and stored status.
- AC04: A single search field matches part of customer name, normalized phone, or vehicle registration number, case-insensitively. Search results must also satisfy any selected dealership, scheduled service date, and status filters.
- AC05: The appointment list defaults to ascending scheduled service start time.
- AC06: Appointment results are paginated with a default page size of 20. Filtering, search, and sorting apply to the full result set before pagination.

## FR-08 — View Appointment Details

**Source:** Confirmed capability.

- AC01: An appointment can be retrieved by its ID.
- AC02: Details include customer, vehicle, dealership, all selected services and their durations, combined duration, assigned technician and bay, scheduled start/end, and status.
- AC03: Details include cancellation or actual completion time when applicable.
- AC04: A nonexistent appointment produces a clear not-found result.

## FR-09 — Cancel Appointment

**Source:** Confirmed.

- AC01: A CONFIRMED appointment can be cancelled before or after its scheduled start, including after its scheduled end if not completed.
- AC02: Cancellation persists CANCELLED status and cancellation time without deleting the record.
- AC03: The appointment no longer blocks future allocation of its technician, bay, or vehicle.
- AC04: Cancelling an already CANCELLED appointment returns that appointment in its cancelled state without another mutation or an error solely for repetition.
- AC05: A COMPLETED appointment cannot be cancelled.

## FR-10 — Prevent Double Booking

**Source:** Core resource correctness and confirmed vehicle rule.

- AC01: The same technician cannot be allocated to overlapping appointment occupancy intervals.
- AC02: The same bay cannot be allocated to overlapping appointment occupancy intervals.
- AC03: The same vehicle cannot have overlapping appointment occupancy intervals across any dealerships.
- AC04: These invariants hold under concurrent booking requests, not only sequential requests.
- AC05: Failed conflicting requests leave no partial booking.
- AC06: Cancellation and completion must not race with booking in a way that violates the allocation rules.

## FR-11 — Complete Service and Release Resources

**Source:** Confirmed.

- AC01: Staff can mark a CONFIRMED appointment COMPLETED at or after its scheduled start.
- AC02: Completion before scheduled start is rejected.
- AC03: The system records actual completion time and retains scheduled start/end for reference.
- AC04: Early completion releases the technician, bay, and vehicle for the remaining scheduled interval.
- AC05: A newly available start on a 30-minute boundary may be selected immediately; no extra 30-minute waiting period is imposed. Confirmation follows FR-05 AC08 if the selected start passes during the booking flow.
- AC06: Without explicit completion, resources become available at scheduled end. The stored status is not automatically changed to COMPLETED merely because time has passed.
- AC07: A CANCELLED appointment cannot be completed.
- AC08: Completing an already COMPLETED appointment returns an error stating "Appointment already completed" and does not change its original actual completion time.

## FR-12 — Recognize Repeated Booking Requests

**Source:** Confirmed.

- AC01: The system can recognize retries of the same booking operation.
- AC02: After successful creation, a retry returns the appointment already created rather than creating another appointment or failing because that appointment occupies the resources. The creation-time 15-minute check is not applied again to retrieval of an already committed result.
- AC03: Concurrent copies of the same operation do not create multiple appointments.
- AC04: The demonstration client retains the same request identity when retrying the same confirmation.
- AC05: Reusing a booking request identity with changed booking content returns an error and does not create or modify an appointment. A changed booking operation must use a new request identity generated by the client.
- AC06: A successful booking request identity and its association to the appointment are retained for the full lifetime of that appointment, including after cancellation or completion. A retry returns the same appointment in its current state without recreating it.

## FR-13 — Manage Customers and Service Types

- AC01: Staff can create a customer with a name and unique normalized phone number.
- AC02: Staff can update a customer's name and/or phone; duplicate normalized phones are rejected.
- AC03: Staff can create and update a service type with a unique name and fixed duration from 1 to 540 minutes.
- AC04: Service-type edits affect future bookings; existing appointment service snapshots remain unchanged.
- AC05: Customer lookup remains server-side and capped rather than loading the complete customer table.

## FR-14 — Manage Technicians and Qualifications

- AC01: Staff can list all technicians or filter them by dealership.
- AC02: Staff can create a technician at a dealership with zero or more initial service qualifications.
- AC03: Staff can update a technician's name; names remain unique within a dealership.
- AC04: Staff can attach or detach individual Technician–ServiceType qualifications, and repeating the same operation is safe.
- AC05: Qualification changes affect future availability and do not rewrite existing confirmed appointments.

# 6. Business Rules

| ID | Rule |
|---|---|
| BR-01 | An appointment links exactly one customer and one vehicle belonging to that customer. |
| BR-02 | An appointment belongs to exactly one dealership. |
| BR-03 | An appointment contains one or more service types, performed sequentially. |
| BR-04 | An appointment assigns exactly one technician and one bay. |
| BR-05 | Each service type has a fixed duration. Appointment duration is the sum of selected service durations; scheduled end equals scheduled start plus that total. |
| BR-06 | The single assigned technician must be directly associated with every selected service type. |
| BR-07 | The technician and bay belong to the selected dealership. |
| BR-08 | The same technician and bay must be available for the entire combined service duration at confirmation. |
| BR-09 | Technician, bay, and vehicle occupancy intervals cannot overlap with another allocation for the same entity. |
| BR-10 | An interval ending at the exact start of another does not overlap it. |
| BR-11 | Successfully created appointments have CONFIRMED status. |
| BR-12 | Cancelled appointments do not block remaining resource availability. |
| BR-13 | Cancellation retains the appointment record. |
| BR-14 | Past start times are excluded when displaying choices. At confirmation, the backend permits a selected start up to and including 15 minutes in the past; a delay greater than 15 minutes is rejected. The full selected interval is revalidated, and scheduled start/end remain unchanged. |
| BR-15 | Confirmation rechecks availability even when previously displayed as available. |
| BR-16 | The backend validates and assigns the suggested or staff-selected resources. |
| BR-17 | All bays support all service types. |
| BR-18 | All sample dealerships operate every day, 08:00–17:00, without a lunch break, in Asia/Ho_Chi_Minh. |
| BR-19 | Start times are on 30-minute boundaries; scheduled end must be no later than closing. |
| BR-20 | Early completion releases the remainder of the scheduled allocation immediately. |
| BR-21 | Scheduled end releases resources even without explicit completion. |
| BR-22 | No manual Start Service action is required. |
| BR-23 | Repeating the same successful booking operation returns the existing appointment. |

# 7. Appointment Lifecycle

## 7.1 Stored statuses

| Status | Meaning |
|---|---|
| CONFIRMED | Booking accepted; may be upcoming, within its scheduled interval, or past its scheduled end without explicit completion. |
| CANCELLED | Explicitly cancelled; record retained. |
| COMPLETED | Explicitly completed; actual completion time recorded. |

## 7.2 Transitions

- Creation → CONFIRMED.
- CONFIRMED → CANCELLED at any time while not completed.
- CONFIRMED → COMPLETED at or after scheduled start.
- Repeated cancellation → same CANCELLED record.
- No transition from CANCELLED back to CONFIRMED or COMPLETED.
- No transition from COMPLETED to CANCELLED.

## 7.3 Time and status

Scheduled start is sufficient to interpret when service is expected to be underway. There is no stored IN_PROGRESS status or Start action. Passing scheduled end releases resources but does not assert that service was actually completed.

# 8. Availability Rules

## 8.1 Operating schedule

All sample dealerships operate daily from 08:00 to 17:00 with no lunch break. All dates and displayed times use Asia/Ho_Chi_Minh. Start times are offered every 30 minutes, subject to full-duration availability and closing time. Technicians follow these shared hours; individual shifts, leave, and breaks are not modeled in the demo.

## 8.2 Occupancy and release

- A confirmed appointment reserves its scheduled interval from start inclusive to end exclusive.
- When completed early, the actual completion time ends occupancy earlier than scheduled end.
- Completion recorded after scheduled end does not extend occupancy beyond scheduled end.
- Cancellation releases the remaining allocation immediately. Existing historical booking details remain available.
- The same release rules apply when checking the technician, bay, and vehicle.

**Example:** A 09:00–10:30 appointment completed at 10:00 allows a new booking starting at 10:00 if the start was available for selection and all other conditions hold. Confirmation follows FR-05 AC08 if the selected start passes during the booking flow. Completion at 10:07 makes 10:30 the next future grid start offered in a fresh availability lookup. The 15-minute confirmation allowance does not make 10:00 appear in that new lookup. A previously selected 10:00 start must still pass full-interval conflict validation; the allowance does not override occupancy before the 10:07 release.

## 8.3 Availability is not a reservation

Checking availability or selecting suggested resources does not hold them. Confirmation revalidates the exact requested allocation. The scheduled start does not move forward automatically as time passes. Confirmation enforces the 15-minute grace period in FR-05 AC08. For a 10:00 start, confirmation at 10:15:00 is within the grace period; confirmation after 10:15:00 is rejected. This check uses backend time, not the client clock.

# 9. Data Requirements

This section describes business data, not the physical database schema.

| Entity | Required business information |
|---|---|
| Customer | Identifier, display name, unique normalized phone; owns vehicles |
| Vehicle | Identifier, customer association, display registration, unique normalized registration lookup value, make, and model |
| Dealership | Identifier and name; shared operating schedule and timezone |
| Service Type | Identifier, name, fixed positive duration |
| Technician | Identifier, name, dealership, and direct associations to supported service types |
| Service Bay | Identifier, display label, dealership |
| Appointment | Identifier, customer, vehicle, dealership, selected service types, combined duration, selected technician and bay, scheduled start/end, stored status, creation/update times, cancellation time when cancelled, actual completion time when completed |
| Booking request identity | Information sufficient to recognize the same booking operation and retrieve its resulting appointment |

Seeded data must support demonstrating qualified and unqualified technicians, alternative resources, and multiple dealerships. Exact seed counts and optional customer/vehicle fields remain implementation details unless separately approved. All seeded technicians and bays are operational. No active/inactive status or resource deactivation workflow is required in this demo.

# 10. Non-Functional Requirements

## NFR-01 — Data Integrity

Committed appointments survive backend restarts. Booking and lifecycle updates must not leave partially applied allocation changes. Scheduled end remains available after early completion.

## NFR-02 — Concurrency

Concurrent requests must preserve technician, bay, and vehicle conflict rules and booking retry behavior. Verification must include requests competing for the last available resources.

## NFR-03 — Performance

No fixed response-time, throughput, or concurrency acceptance threshold is imposed for this demo. Record observed performance when implementation is complete, together with the dataset, workload, and execution environment so the results can be interpreted. Measurements are evidence, not a service-level commitment.

## NFR-04 — Reliability

If persistence fails, the system must not report a confirmed booking that was not committed or leave a booking with only one required resource. Failure must be distinguishable from successful confirmation.

## NFR-05 — Observability

Keyloop requires an observability strategy in the System Design Document. The confirmed implementation scope is standard NestJS application logs for booking, cancellation, completion, and errors; a custom JSON formatter is not required for the demo.

- AC01: Booking, cancellation, and completion operations emit logs with consistent event names and context describing the operation and its outcome.
- AC02: Rejected operations and unexpected failures emit error logs that distinguish the failure from a successful operation.
- AC03: Logs must not include unnecessary customer personal information.
- AC04: Metrics and tracing are described as future extensions in the System Design Document; implementing a metrics/tracing stack is not required for this demo.

Exact field names, logging library, and correlation mechanism belong in the System Design Document.

## NFR-06 — Maintainability and Verification

Keyloop requires automated tests for core business logic and clear build/run/test instructions. The selected implementation must be demonstrable using seeded data. Architecture, API contracts, and technical verification procedures are separate artifacts.

# 11. MVP Validation Scenarios

These are requirement-level examples rather than a detailed test procedure.

| Validation ID | Scenario | Expected result |
|---|---|---|
| TC-01 | Book with sufficient resources | Persisted CONFIRMED appointment |
| TC-02 | All bays busy | No available slot; conflicting creation rejected |
| TC-03 | No technician qualified for all selected services | Booking unavailable |
| TC-04 | Qualified technicians busy | Booking unavailable |
| TC-05 | Back-to-back intervals | Both allowed when otherwise valid |
| TC-06 | Overlapping use of same bay | Conflict prevented |
| TC-07 | Overlapping use of same technician | Conflict prevented |
| TC-08 | Concurrent competing bookings | No double booking or partial records |
| TC-09 | Vehicle belongs to another customer | Booking rejected |
| TC-10 | Cancel a confirmed appointment | CANCELLED; remaining allocation released |
| TC-11 | Book after cancellation | Released resources can be used |
| TC-12 | Cancel an already cancelled appointment | Existing CANCELLED record returned |
| TC-13 | Retrieve existing appointment | Correct associations, schedule, and state |
| TC-14 | Retrieve nonexistent appointment | Not-found result |
| TC-15 | Request available-time choices after a start has passed | Past start omitted from choices |
| TC-16 | Staff override suggested resources | Exact eligible selected resources assigned |
| TC-17 | Selected resource becomes busy | Rejected; no silent replacement |
| TC-18 | Same vehicle overlaps across dealerships | Rejected |
| TC-19 | Complete early | Actual completion recorded; remaining allocation released |
| TC-20 | Complete before scheduled start | Rejected |
| TC-21 | Scheduled end passes without completion | Resources available; stored status remains CONFIRMED |
| TC-22 | Cancel after scheduled start | Allowed while not completed |
| TC-23 | Cancel completed or complete cancelled appointment | Rejected |
| TC-24 | Sequential/concurrent retry of same booking | One appointment; same result returned |
| TC-25 | Booking ends at 17:00 / after 17:00 | Boundary end allowed / later end rejected |
| TC-26 | Read appointments after backend restart | Committed records retained |
| TC-27 | Book immediate grid start after early release | Allowed when available for selection and otherwise valid; selected start retained at confirmation |
| TC-28 | Complete an already completed appointment | Already-completed error; original completion time unchanged |
| TC-29 | Reuse a booking request identity with changed content | Error; no appointment created or modified |
| TC-30 | Select 10:00 at 09:59 and confirm at 10:01 | Within grace period; scheduled interval unchanged; full allocation revalidated |
| TC-31 | Confirm a selected 10:00 start at 10:15:00 | Within grace period; accepted if all other checks pass |
| TC-32 | Confirm a selected 10:00 start after 10:15:00 | Rejected; no appointment created; staff must choose another available time |
| TC-33 | Select services lasting 30 and 60 minutes with a 09:00 start | Total duration 90 minutes; scheduled end 10:30; one technician and one bay held for the full interval |
| TC-34 | Technician supports only some selected services | Technician not eligible; booking with that technician rejected |
| TC-35 | Selected services have no single commonly qualified technician | No available start, even if separate technicians can perform individual services |
| TC-36 | Combined duration exceeds remaining opening hours | Start not offered; booking rejected |
| TC-37 | Appointment has no selected services | Booking rejected |
| TC-38 | Create a customer using a phone already assigned to another customer | Conflict; no duplicate customer |
| TC-39 | Update a service type used by an existing appointment | Future bookings use the new values; existing appointment snapshot is unchanged |
| TC-40 | Create a technician with two valid initial service qualifications | Technician and both associations are committed atomically |
| TC-41 | Attach or detach the same technician qualification twice | Repeat-safe; final association state is correct |
| TC-42 | Remove a qualification from a technician with an existing confirmed appointment | Existing appointment remains unchanged; technician is not eligible for future bookings requiring that service |

# 12. Decisions, Constraints & Dependencies

## 12.1 Confirmed decisions

Staff-assisted booking; no login; configured demo master data; selectable sample dealerships; customer/service/technician administration; available-time selection; resource suggestions with staff override; Technician–ServiceType qualification; all bays compatible; one or more sequential services with one technician and one bay per appointment; summed fixed service durations; daily 08:00–17:00 hours; 30-minute starts; Vietnam timezone; cancellation while not completed; explicit completion without Start action; early and scheduled resource release; cross-dealership vehicle conflict prevention; repeated booking recognition; repeat-safe cancellation; English PRD; PostgreSQL with Prisma.

The initial stack direction specifies NestJS, Next.js, shadcn/ui, and Docker Compose for the database.

## 12.2 Dependencies

Booking depends on existing customer/vehicle records, configured service durations and technician associations, available dealership resources, and a database able to commit the appointment.

## 12.3 Assessment constraints

- Implement one service layer fully; this project selects the backend and adds a demo frontend.
- Backend submission must expose a RESTful API and use persistent storage.
- Provide a System Design Document with architecture diagram, component roles, data flow, technology rationale, observability strategy, and design-phase GenAI collaboration.
- Repository must contain build/run/test instructions, a dedicated AI Collaboration Narrative, and core business tests.
- Provide a 5–10 minute walkthrough covering design, implementation, demo, AI collaboration, and lessons learned.
- Submission email requests repository and video links by Wednesday, 4 November 2026. Exact cutoff time and timezone were not supplied.

# 13. Risks & Considerations

| Risk | Implication | Required outcome or review action |
|---|---|---|
| Stale availability | Selected resources become busy before confirmation | Revalidate exact allocation |
| Concurrent mutations | Conflicting appointments or lost lifecycle updates | Preserve allocation and status invariants |
| Scheduled end differs from reality | Staff may still be working when resources are considered free | Clearly document the confirmed schedule-based release policy |
| Timestamp boundary | A selected start passes while staff confirm | Check backend time; allow up to 15 minutes after scheduled start, reject later; retain schedule and revalidate full interval |
| Retry after uncertain response | Duplicate booking | Recognize the original operation |
| Expanded scope | Completion and resource override increase implementation work | Keep core assessment behavior demonstrable; track additional decisions explicitly |

# 14. Open Questions and Decision Register

The register below preserves the clarification history and its resolved decisions.

| ID | Status | Decision or remaining question |
|---|---|---|
| OQ-01 | Resolved | All bays support all services. |
| OQ-02 | Resolved | Direct Technician–ServiceType associations; no Skill entity. An appointment supports one or more sequential services; one technician must qualify for all of them, and the same technician and bay are held for the sum of their durations. |
| OQ-03 | Resolved | Daily 08:00–17:00, no lunch break; shared Vietnam timezone. |
| OQ-04 | Resolved | Cancellation allowed whenever not completed; repeat cancellation returns cancelled record. |
| OQ-05 | Resolved | Suggest eligible technicians and bays in ascending identifier order; staff may override either suggestion. |
| OQ-06 | Resolved | Demo staff identity without authentication. |
| OQ-07 | Resolved | Dealership, scheduled service date, and status filters; one shared case-insensitive partial-match search field for customer name or registration number, combined with selected filters; scheduled service start ascending; pagination with 20 results per page by default. |
| OQ-08 | Resolved | Repeated completion returns an "Appointment already completed" error and preserves the original actual completion time. |
| OQ-09 | Resolved | Changed content with the same request identity returns an error; a new operation uses a new identity. Successful request identities are retained for the lifetime of the appointment, including cancelled and completed records. |
| OQ-10 | Resolved | Technicians follow shared hours without individual shifts, leave, or breaks; all seeded resources are operational. Rescheduling, payments, email/SMS, reporting, and automatic technician workload balancing are out of scope. |
| OQ-11 | Resolved | Structured logs for booking, cancellation, completion, and errors; metrics/tracing described as future design extensions. No fixed performance threshold; record observed results with measurement context after implementation. |
| OQ-12 | Resolved | Exclude past times when presenting new choices. Confirmation checks backend time and permits up to and including 15 minutes after selected scheduled start; later confirmation is rejected. Retain the selected schedule and revalidate the full technician, bay, and vehicle interval. This decision supersedes the earlier unlimited-delay rule. |

No unresolved material requirements questions or TBD requirements remain in this baseline. The decisions above are confirmed project constraints and demo simplifications, rather than assumptions hidden in the implementation. Further scope changes must update the affected requirements and downstream design or tests; implementation completion is assessed separately.

# 15. Definition of Done

- The three Keyloop core requirements are implemented and demonstrated.
- Confirmed project extensions have corresponding acceptance evidence.
- Core business tests cover qualification for all selected services, summed duration, the 15-minute confirmation boundary, allocation conflicts, concurrency, cancellation, early completion, and repeated requests.
- Seed data and a demo frontend support the selected workflows.
- Documentation explains how to build, run, and test the solution.
- System Design and AI Collaboration Narrative meet the assessment requirements.
- Repository and video links are accessible to reviewers.
- Implementation and validation evidence match this baseline; subsequent requirement changes are reflected in the design, tests, and demo documentation.

## Revision history

| Version | Date | Change |
|---|---|---|
| 1.0 | Initial draft | AI-assisted proposed PRD; superseded by confirmed clarification decisions. |
| 1.1 | 2026-10-28–2026-10-29 | Established staff demo access, resource override, cancellation/completion, booking retry behavior, list behavior, and operational scope. FR-01 and FR-06 were revised; FR-11 and FR-12 were added. |
| 1.2 | 2026-10-29 | Supported multiple sequential services with summed duration and one technician qualified for all selected services; established the 15-minute confirmation allowance. |
| 1.3 | 2026-10-29 | Prepared the confirmed requirements baseline, added assessment traceability, and clarified availability examples and retrieval of existing booking results. Existing requirement IDs retained. |
| 1.4 | 2026-10-29 | Added unique normalized customer phone and vehicle registration lookup requirements for the staff booking workflow. |
| 1.5 | 2026-10-30 | Recorded delivered customer/service/technician administration and qualification-management scope; added FR-13–14 and TC-38–42. |
