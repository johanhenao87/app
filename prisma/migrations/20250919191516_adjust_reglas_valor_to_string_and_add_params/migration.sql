/*
  Warnings:

  - A unique constraint covering the columns `[tipo_turno,hora]` on the table `ParametrosTurnos` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."reglas_agendamiento" ALTER COLUMN "valor" SET DATA TYPE VARCHAR(50);

-- CreateIndex
CREATE UNIQUE INDEX "ParametrosTurnos_tipo_turno_hora_key" ON "public"."ParametrosTurnos"("tipo_turno", "hora");
