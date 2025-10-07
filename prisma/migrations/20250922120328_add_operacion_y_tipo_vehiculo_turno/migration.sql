/*
  Warnings:

  - The `valor` column on the `reglas_agendamiento` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."reglas_agendamiento" DROP COLUMN "valor",
ADD COLUMN     "valor" INTEGER;

-- AlterTable
ALTER TABLE "public"."turnos" ADD COLUMN     "operacion" VARCHAR(20),
ADD COLUMN     "tipo_vehiculo_turno" VARCHAR(10);
