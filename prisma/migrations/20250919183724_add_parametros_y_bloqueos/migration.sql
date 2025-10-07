-- CreateTable
CREATE TABLE "public"."caja_rapida" (
    "id" SERIAL NOT NULL,
    "conductor_id" INTEGER,
    "activo" BOOLEAN DEFAULT true,
    "motivo" TEXT,

    CONSTRAINT "caja_rapida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."calendario" (
    "fecha" DATE NOT NULL,
    "habilitado" BOOLEAN DEFAULT true,
    "motivo" TEXT,

    CONSTRAINT "calendario_pkey" PRIMARY KEY ("fecha")
);

-- CreateTable
CREATE TABLE "public"."conductores" (
    "id" SERIAL NOT NULL,
    "cedula" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "telefono" VARCHAR(20),
    "correo" VARCHAR(100),
    "password_hash" TEXT NOT NULL,
    "fecha_registro" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "tipo_vehiculo" VARCHAR(10),

    CONSTRAINT "conductores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reglas_agendamiento" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(50),
    "valor" INTEGER,
    "descripcion" TEXT,

    CONSTRAINT "reglas_agendamiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."turnos" (
    "id" SERIAL NOT NULL,
    "conductor_id" INTEGER,
    "fecha" DATE NOT NULL,
    "hora" TIME(6) NOT NULL,
    "tipo_turno" VARCHAR(20),
    "estado" VARCHAR(20) DEFAULT 'pendiente',
    "creado" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "turnos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."auditoria_turnos" (
    "id" SERIAL NOT NULL,
    "turno_id" INTEGER NOT NULL,
    "accion" VARCHAR(50) NOT NULL,
    "fecha_hora" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "usuario" VARCHAR(100),

    CONSTRAINT "auditoria_turnos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reset_codes" (
    "id" SERIAL NOT NULL,
    "conductor_id" INTEGER NOT NULL,
    "code" VARCHAR(6) NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "used" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reset_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ParametrosTurnos" (
    "id" SERIAL NOT NULL,
    "tipo_turno" VARCHAR(20) NOT NULL,
    "hora" VARCHAR(5) NOT NULL,
    "cupo_maximo" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParametrosTurnos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BloqueosFechas" (
    "id" SERIAL NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3) NOT NULL,
    "motivo" VARCHAR(100),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BloqueosFechas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conductores_cedula_key" ON "public"."conductores"("cedula");

-- CreateIndex
CREATE UNIQUE INDEX "reglas_agendamiento_nombre_key" ON "public"."reglas_agendamiento"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "turnos_conductor_id_fecha_key" ON "public"."turnos"("conductor_id", "fecha");

-- AddForeignKey
ALTER TABLE "public"."caja_rapida" ADD CONSTRAINT "caja_rapida_conductor_id_fkey" FOREIGN KEY ("conductor_id") REFERENCES "public"."conductores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."turnos" ADD CONSTRAINT "turnos_conductor_id_fkey" FOREIGN KEY ("conductor_id") REFERENCES "public"."conductores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."auditoria_turnos" ADD CONSTRAINT "auditoria_turnos_turno_id_fkey" FOREIGN KEY ("turno_id") REFERENCES "public"."turnos"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."reset_codes" ADD CONSTRAINT "reset_codes_conductor_id_fkey" FOREIGN KEY ("conductor_id") REFERENCES "public"."conductores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
