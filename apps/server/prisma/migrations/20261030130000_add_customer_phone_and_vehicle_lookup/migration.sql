ALTER TABLE "customers" ADD COLUMN "phone" TEXT;

WITH numbered AS (
  SELECT "id", row_number() OVER (ORDER BY "id") AS sequence
  FROM "customers"
)
UPDATE "customers" AS customer
SET "phone" = '+84900000' || lpad(numbered.sequence::text, 4, '0')
FROM numbered
WHERE customer."id" = numbered."id";

ALTER TABLE "customers" ALTER COLUMN "phone" SET NOT NULL;
CREATE UNIQUE INDEX "customers_phone_key" ON "customers"("phone");

ALTER TABLE "vehicles" ADD COLUMN "registration_number_normalized" TEXT;
UPDATE "vehicles"
SET "registration_number_normalized" = regexp_replace(
  upper("registration_number"),
  '[^A-Z0-9]',
  '',
  'g'
);
ALTER TABLE "vehicles"
  ALTER COLUMN "registration_number_normalized" SET NOT NULL;
CREATE UNIQUE INDEX "vehicles_registration_number_normalized_key"
  ON "vehicles"("registration_number_normalized");
