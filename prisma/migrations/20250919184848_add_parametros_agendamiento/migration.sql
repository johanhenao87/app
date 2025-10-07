-- CreateTable
CREATE TABLE "public"."parametros_agendamiento" (
    "id" SERIAL NOT NULL,
    "clave" VARCHAR(50) NOT NULL,
    "valor" TEXT NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "parametros_agendamiento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "parametros_agendamiento_clave_key" ON "public"."parametros_agendamiento"("clave");
