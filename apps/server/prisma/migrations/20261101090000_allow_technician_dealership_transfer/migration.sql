-- An appointment keeps its booked dealership while the assigned technician may
-- later move to another dealership. Booking still validates current dealership
-- membership before the appointment is created.
ALTER TABLE "appointments"
  DROP CONSTRAINT "appointments_technician_id_dealership_id_fkey";

ALTER TABLE "technicians"
  DROP CONSTRAINT "technicians_id_dealership_id_key";

ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_technician_id_fkey"
    FOREIGN KEY ("technician_id")
    REFERENCES "technicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
