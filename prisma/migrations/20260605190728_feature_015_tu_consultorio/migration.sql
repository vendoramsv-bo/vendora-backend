/*
  Warnings:

  - The `estado` column on the `Cita` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "consultorio"."EstadoCita" AS ENUM ('PENDIENTE', 'CONFIRMADA', 'ATENDIDA', 'CANCELADA', 'CANCELADA_CLIENTE', 'RECHAZADA', 'NO_ASISTIO');

-- CreateEnum
CREATE TYPE "consultorio"."TipoServicioConsultorio" AS ENUM ('PRESENCIAL', 'TELECONSULTA', 'AMBOS');

-- AlterTable
ALTER TABLE "consultorio"."Cita" ADD COLUMN     "consumerUserId" TEXT,
ADD COLUMN     "origenOnline" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "pacienteId" DROP NOT NULL,
DROP COLUMN "estado",
ADD COLUMN     "estado" "consultorio"."EstadoCita" NOT NULL DEFAULT 'PENDIENTE';

-- AlterTable
ALTER TABLE "consultorio"."Medico" ADD COLUMN     "visiblePublico" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "consultorio"."ServicioMedico" ADD COLUMN     "mostrarPrecio" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "visiblePublico" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "tenant"."Consultorio" ADD COLUMN     "contactoPublico" JSONB,
ADD COLUMN     "fotos" TEXT[],
ADD COLUMN     "horarios" JSONB,
ADD COLUMN     "tipoServicio" "consultorio"."TipoServicioConsultorio" NOT NULL DEFAULT 'PRESENCIAL';

-- CreateTable
CREATE TABLE "social"."ConsultorioReaccion" (
    "id" TEXT NOT NULL,
    "consultorioId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "social"."TipoReaccion" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultorioReaccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social"."ConsultorioComentario" (
    "id" TEXT NOT NULL,
    "consultorioId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "editado" BOOLEAN NOT NULL DEFAULT false,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "padreId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ConsultorioComentario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social"."ConsultorioComentarioReaccion" (
    "id" TEXT NOT NULL,
    "comentarioId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "social"."TipoReaccion" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultorioComentarioReaccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social"."ConsultorioValoracion" (
    "id" TEXT NOT NULL,
    "consultorioId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "puntuacion" INTEGER NOT NULL,
    "resena" TEXT,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ConsultorioValoracion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social"."ConsultorioPregunta" (
    "id" TEXT NOT NULL,
    "consultorioId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pregunta" TEXT NOT NULL,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ConsultorioPregunta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social"."ConsultorioRespuesta" (
    "id" TEXT NOT NULL,
    "preguntaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "respuesta" TEXT NOT NULL,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ConsultorioRespuesta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social"."ConsultorioFavorito" (
    "id" TEXT NOT NULL,
    "consultorioId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultorioFavorito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social"."ConsultorioSeguidor" (
    "id" TEXT NOT NULL,
    "consultorioId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultorioSeguidor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsultorioReaccion_consultorioId_idx" ON "social"."ConsultorioReaccion"("consultorioId");

-- CreateIndex
CREATE INDEX "ConsultorioReaccion_userId_idx" ON "social"."ConsultorioReaccion"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultorioReaccion_consultorioId_userId_key" ON "social"."ConsultorioReaccion"("consultorioId", "userId");

-- CreateIndex
CREATE INDEX "ConsultorioComentario_consultorioId_idx" ON "social"."ConsultorioComentario"("consultorioId");

-- CreateIndex
CREATE INDEX "ConsultorioComentario_userId_idx" ON "social"."ConsultorioComentario"("userId");

-- CreateIndex
CREATE INDEX "ConsultorioComentario_padreId_idx" ON "social"."ConsultorioComentario"("padreId");

-- CreateIndex
CREATE INDEX "ConsultorioComentarioReaccion_comentarioId_idx" ON "social"."ConsultorioComentarioReaccion"("comentarioId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultorioComentarioReaccion_comentarioId_userId_key" ON "social"."ConsultorioComentarioReaccion"("comentarioId", "userId");

-- CreateIndex
CREATE INDEX "ConsultorioValoracion_consultorioId_idx" ON "social"."ConsultorioValoracion"("consultorioId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultorioValoracion_consultorioId_userId_key" ON "social"."ConsultorioValoracion"("consultorioId", "userId");

-- CreateIndex
CREATE INDEX "ConsultorioPregunta_consultorioId_idx" ON "social"."ConsultorioPregunta"("consultorioId");

-- CreateIndex
CREATE INDEX "ConsultorioPregunta_userId_idx" ON "social"."ConsultorioPregunta"("userId");

-- CreateIndex
CREATE INDEX "ConsultorioRespuesta_preguntaId_idx" ON "social"."ConsultorioRespuesta"("preguntaId");

-- CreateIndex
CREATE INDEX "ConsultorioFavorito_userId_idx" ON "social"."ConsultorioFavorito"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultorioFavorito_consultorioId_userId_key" ON "social"."ConsultorioFavorito"("consultorioId", "userId");

-- CreateIndex
CREATE INDEX "ConsultorioSeguidor_consultorioId_idx" ON "social"."ConsultorioSeguidor"("consultorioId");

-- CreateIndex
CREATE INDEX "ConsultorioSeguidor_userId_idx" ON "social"."ConsultorioSeguidor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultorioSeguidor_consultorioId_userId_key" ON "social"."ConsultorioSeguidor"("consultorioId", "userId");

-- CreateIndex
CREATE INDEX "Cita_consumerUserId_origenOnline_idx" ON "consultorio"."Cita"("consumerUserId", "origenOnline");

-- AddForeignKey
ALTER TABLE "social"."ConsultorioReaccion" ADD CONSTRAINT "ConsultorioReaccion_consultorioId_fkey" FOREIGN KEY ("consultorioId") REFERENCES "tenant"."Consultorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."ConsultorioReaccion" ADD CONSTRAINT "ConsultorioReaccion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."ConsultorioComentario" ADD CONSTRAINT "ConsultorioComentario_consultorioId_fkey" FOREIGN KEY ("consultorioId") REFERENCES "tenant"."Consultorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."ConsultorioComentario" ADD CONSTRAINT "ConsultorioComentario_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."ConsultorioComentario" ADD CONSTRAINT "ConsultorioComentario_padreId_fkey" FOREIGN KEY ("padreId") REFERENCES "social"."ConsultorioComentario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."ConsultorioComentarioReaccion" ADD CONSTRAINT "ConsultorioComentarioReaccion_comentarioId_fkey" FOREIGN KEY ("comentarioId") REFERENCES "social"."ConsultorioComentario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."ConsultorioComentarioReaccion" ADD CONSTRAINT "ConsultorioComentarioReaccion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."ConsultorioValoracion" ADD CONSTRAINT "ConsultorioValoracion_consultorioId_fkey" FOREIGN KEY ("consultorioId") REFERENCES "tenant"."Consultorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."ConsultorioValoracion" ADD CONSTRAINT "ConsultorioValoracion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."ConsultorioPregunta" ADD CONSTRAINT "ConsultorioPregunta_consultorioId_fkey" FOREIGN KEY ("consultorioId") REFERENCES "tenant"."Consultorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."ConsultorioPregunta" ADD CONSTRAINT "ConsultorioPregunta_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."ConsultorioRespuesta" ADD CONSTRAINT "ConsultorioRespuesta_preguntaId_fkey" FOREIGN KEY ("preguntaId") REFERENCES "social"."ConsultorioPregunta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."ConsultorioRespuesta" ADD CONSTRAINT "ConsultorioRespuesta_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."ConsultorioFavorito" ADD CONSTRAINT "ConsultorioFavorito_consultorioId_fkey" FOREIGN KEY ("consultorioId") REFERENCES "tenant"."Consultorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."ConsultorioFavorito" ADD CONSTRAINT "ConsultorioFavorito_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."ConsultorioSeguidor" ADD CONSTRAINT "ConsultorioSeguidor_consultorioId_fkey" FOREIGN KEY ("consultorioId") REFERENCES "tenant"."Consultorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."ConsultorioSeguidor" ADD CONSTRAINT "ConsultorioSeguidor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
