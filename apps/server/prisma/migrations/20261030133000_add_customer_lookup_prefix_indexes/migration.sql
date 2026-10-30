CREATE INDEX "customers_phone_prefix_idx"
  ON "customers"("phone" text_pattern_ops);
CREATE INDEX "customers_name_lower_prefix_idx"
  ON "customers"(lower("name") text_pattern_ops);
CREATE INDEX "customers_name_id_idx" ON "customers"("name", "id");
CREATE INDEX "vehicles_registration_number_normalized_prefix_idx"
  ON "vehicles"("registration_number_normalized" text_pattern_ops);
