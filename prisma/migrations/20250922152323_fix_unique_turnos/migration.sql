/*
  Warnings:

  - A unique constraint covering the columns `[conductor_id,fecha,hora]` on the table `turnos` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."turnos_conductor_id_fecha_key";

-- CreateIndex
CREATE UNIQUE INDEX "turnos_conductor_id_fecha_hora_key" ON "public"."turnos"("conductor_id", "fecha", "hora");
