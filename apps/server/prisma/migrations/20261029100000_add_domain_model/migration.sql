-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "registration_number" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dealerships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,

    CONSTRAINT "dealerships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,

    CONSTRAINT "service_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technicians" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "dealership_id" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "technicians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technician_service_types" (
    "technician_id" UUID NOT NULL,
    "service_type_id" UUID NOT NULL,

    CONSTRAINT "technician_service_types_pkey" PRIMARY KEY ("technician_id","service_type_id")
);

-- CreateTable
CREATE TABLE "service_bays" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "dealership_id" UUID NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "service_bays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "dealership_id" UUID NOT NULL,
    "technician_id" UUID NOT NULL,
    "service_bay_id" UUID NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'CONFIRMED',
    "scheduled_start" TIMESTAMPTZ(3) NOT NULL,
    "scheduled_end" TIMESTAMPTZ(3) NOT NULL,
    "total_duration_minutes" INTEGER NOT NULL,
    "occupancy_end" TIMESTAMPTZ(3) NOT NULL,
    "request_key" UUID NOT NULL,
    "request_hash" CHAR(64) NOT NULL,
    "cancelled_at" TIMESTAMPTZ(3),
    "actual_completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_services" (
    "appointment_id" UUID NOT NULL,
    "service_type_id" UUID NOT NULL,
    "name_snapshot" TEXT NOT NULL,
    "duration_minutes_snapshot" INTEGER NOT NULL,

    CONSTRAINT "appointment_services_pkey" PRIMARY KEY ("appointment_id","service_type_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_registration_number_key" ON "vehicles"("registration_number");

-- CreateIndex
CREATE INDEX "vehicles_customer_id_idx" ON "vehicles"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "dealerships_name_key" ON "dealerships"("name");

-- CreateIndex
CREATE UNIQUE INDEX "service_types_name_key" ON "service_types"("name");

-- CreateIndex
CREATE INDEX "technicians_dealership_id_id_idx" ON "technicians"("dealership_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "technicians_dealership_id_name_key" ON "technicians"("dealership_id", "name");

-- CreateIndex
CREATE INDEX "technician_service_types_service_type_id_technician_id_idx" ON "technician_service_types"("service_type_id", "technician_id");

-- CreateIndex
CREATE INDEX "service_bays_dealership_id_id_idx" ON "service_bays"("dealership_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "service_bays_dealership_id_label_key" ON "service_bays"("dealership_id", "label");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_request_key_key" ON "appointments"("request_key");

-- CreateIndex
CREATE INDEX "appointments_scheduled_start_id_idx" ON "appointments"("scheduled_start", "id");

-- CreateIndex
CREATE INDEX "appointments_dealership_id_status_scheduled_start_idx" ON "appointments"("dealership_id", "status", "scheduled_start");

-- CreateIndex
CREATE INDEX "appointments_vehicle_id_scheduled_start_idx" ON "appointments"("vehicle_id", "scheduled_start");

-- CreateIndex
CREATE INDEX "appointments_technician_id_scheduled_start_idx" ON "appointments"("technician_id", "scheduled_start");

-- CreateIndex
CREATE INDEX "appointments_service_bay_id_scheduled_start_idx" ON "appointments"("service_bay_id", "scheduled_start");

-- CreateIndex
CREATE INDEX "appointment_services_service_type_id_idx" ON "appointment_services"("service_type_id");

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_dealership_id_fkey" FOREIGN KEY ("dealership_id") REFERENCES "dealerships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_service_types" ADD CONSTRAINT "technician_service_types_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_service_types" ADD CONSTRAINT "technician_service_types_service_type_id_fkey" FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_bays" ADD CONSTRAINT "service_bays_dealership_id_fkey" FOREIGN KEY ("dealership_id") REFERENCES "dealerships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_dealership_id_fkey" FOREIGN KEY ("dealership_id") REFERENCES "dealerships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_services" ADD CONSTRAINT "appointment_services_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_services" ADD CONSTRAINT "appointment_services_service_type_id_fkey" FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Cross-record consistency keys used by composite foreign keys below.
ALTER TABLE "vehicles"
  ADD CONSTRAINT "vehicles_id_customer_id_key" UNIQUE ("id", "customer_id");
ALTER TABLE "technicians"
  ADD CONSTRAINT "technicians_id_dealership_id_key" UNIQUE ("id", "dealership_id");
ALTER TABLE "service_bays"
  ADD CONSTRAINT "service_bays_id_dealership_id_key" UNIQUE ("id", "dealership_id");

ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_vehicle_id_customer_id_fkey"
    FOREIGN KEY ("vehicle_id", "customer_id")
    REFERENCES "vehicles"("id", "customer_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "appointments_technician_id_dealership_id_fkey"
    FOREIGN KEY ("technician_id", "dealership_id")
    REFERENCES "technicians"("id", "dealership_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "appointments_service_bay_id_dealership_id_fkey"
    FOREIGN KEY ("service_bay_id", "dealership_id")
    REFERENCES "service_bays"("id", "dealership_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Invariants that Prisma's schema language cannot express directly.
ALTER TABLE "service_types"
  ADD CONSTRAINT "service_types_positive_duration"
    CHECK ("duration_minutes" > 0);

ALTER TABLE "appointment_services"
  ADD CONSTRAINT "appointment_services_positive_duration"
    CHECK ("duration_minutes_snapshot" > 0);

ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_positive_duration"
    CHECK ("total_duration_minutes" > 0),
  ADD CONSTRAINT "appointments_time_bounds"
    CHECK (
      "scheduled_start" < "scheduled_end"
      AND "scheduled_end" = "scheduled_start" + make_interval(mins => "total_duration_minutes")
      AND "occupancy_end" >= "scheduled_start"
      AND "occupancy_end" <= "scheduled_end"
    ),
  ADD CONSTRAINT "appointments_request_hash_format"
    CHECK ("request_hash" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "appointments_lifecycle_consistency"
    CHECK (
      (
        "status" = 'CONFIRMED'
        AND "cancelled_at" IS NULL
        AND "actual_completed_at" IS NULL
        AND "occupancy_end" = "scheduled_end"
      )
      OR
      (
        "status" = 'CANCELLED'
        AND "cancelled_at" IS NOT NULL
        AND "actual_completed_at" IS NULL
        AND "occupancy_end" = GREATEST(
          "scheduled_start",
          LEAST("scheduled_end", "cancelled_at")
        )
      )
      OR
      (
        "status" = 'COMPLETED'
        AND "cancelled_at" IS NULL
        AND "actual_completed_at" IS NOT NULL
        AND "actual_completed_at" >= "scheduled_start"
        AND "occupancy_end" = GREATEST(
          "scheduled_start",
          LEAST("scheduled_end", "actual_completed_at")
        )
      )
    );

-- PostgreSQL allocation safeguards. Empty [start,start) ranges do not overlap.
ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_technician_no_overlap"
    EXCLUDE USING gist (
      "technician_id" WITH =,
      tstzrange("scheduled_start", "occupancy_end", '[)') WITH &&
    ),
  ADD CONSTRAINT "appointments_bay_no_overlap"
    EXCLUDE USING gist (
      "service_bay_id" WITH =,
      tstzrange("scheduled_start", "occupancy_end", '[)') WITH &&
    ),
  ADD CONSTRAINT "appointments_vehicle_no_overlap"
    EXCLUDE USING gist (
      "vehicle_id" WITH =,
      tstzrange("scheduled_start", "occupancy_end", '[)') WITH &&
    );
