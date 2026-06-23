-- Permitir el mismo medicamento con distinta forma/concentración
-- (p. ej. Paracetamol 500 mg y 750 mg).
DROP INDEX "Medication_name_key";
CREATE UNIQUE INDEX "Medication_name_form_strength_key" ON "Medication"("name", "form", "strength");
