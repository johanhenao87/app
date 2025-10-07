-- AlterTable
ALTER TABLE "public"."auditoria_turnos" ADD COLUMN     "antes" JSONB,
ADD COLUMN     "despues" JSONB,
ADD COLUMN     "motivo_admin" VARCHAR(200);

-- AlterTable
ALTER TABLE "public"."turnos" ADD COLUMN     "motivo_admin" TEXT,
ADD COLUMN     "orden_dia" INTEGER,
ADD COLUMN     "placa" VARCHAR(6),
ADD COLUMN     "prioridad" INTEGER,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "public"."Notificacion" (
    "id" SERIAL NOT NULL,
    "turno_id" INTEGER NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "canal" VARCHAR(20) NOT NULL,
    "payload" JSONB NOT NULL,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "turnos_fecha_hora_idx" ON "public"."turnos"("fecha", "hora");

-- CreateIndex
CREATE INDEX "turnos_fecha_orden_dia_idx" ON "public"."turnos"("fecha", "orden_dia");

-- AddForeignKey
ALTER TABLE "public"."Notificacion" ADD CONSTRAINT "Notificacion_turno_id_fkey" FOREIGN KEY ("turno_id") REFERENCES "public"."turnos"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
