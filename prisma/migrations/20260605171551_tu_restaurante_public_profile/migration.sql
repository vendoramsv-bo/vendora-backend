/*
  Warnings:

  - The `tipoServicio` column on the `Restaurante` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "restaurante"."TipoServicioRestaurante" AS ENUM ('MESA', 'DELIVERY', 'PARA_LLEVAR', 'MIXTO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "restaurante"."EstadoReserva" ADD VALUE 'PENDIENTE';
ALTER TYPE "restaurante"."EstadoReserva" ADD VALUE 'RECHAZADA';
ALTER TYPE "restaurante"."EstadoReserva" ADD VALUE 'CANCELADA_CLIENTE';

-- AlterTable
ALTER TABLE "almacen"."AjusteInventario" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "estado" SET DEFAULT 'PENDIENTE';

-- AlterTable
ALTER TABLE "almacen"."IngresoAlmacen" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "almacen"."RecuentoInventario" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "almacen"."SalidaAlmacen" ADD COLUMN     "motivo" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "tenant"."Restaurante" ADD COLUMN     "contactoPublico" JSONB,
ADD COLUMN     "especialidad" TEXT,
ADD COLUMN     "fotos" TEXT[],
ADD COLUMN     "horarios" JSONB,
DROP COLUMN "tipoServicio",
ADD COLUMN     "tipoServicio" "restaurante"."TipoServicioRestaurante";

-- CreateTable
CREATE TABLE "social"."RestauranteReaccion" (
    "id" TEXT NOT NULL,
    "restauranteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "social"."TipoReaccion" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RestauranteReaccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social"."RestauranteComentario" (
    "id" TEXT NOT NULL,
    "restauranteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "editado" BOOLEAN NOT NULL DEFAULT false,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "padreId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "RestauranteComentario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social"."RestauranteComentarioReaccion" (
    "id" TEXT NOT NULL,
    "comentarioId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "social"."TipoReaccion" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RestauranteComentarioReaccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social"."RestauranteValoracion" (
    "id" TEXT NOT NULL,
    "restauranteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "puntuacion" INTEGER NOT NULL,
    "resena" TEXT,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "RestauranteValoracion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social"."RestaurantePregunta" (
    "id" TEXT NOT NULL,
    "restauranteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pregunta" TEXT NOT NULL,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "RestaurantePregunta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social"."RestauranteRespuesta" (
    "id" TEXT NOT NULL,
    "preguntaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "respuesta" TEXT NOT NULL,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "RestauranteRespuesta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social"."RestauranteFavorito" (
    "id" TEXT NOT NULL,
    "restauranteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RestauranteFavorito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social"."RestauranteSeguidor" (
    "id" TEXT NOT NULL,
    "restauranteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RestauranteSeguidor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RestauranteReaccion_restauranteId_idx" ON "social"."RestauranteReaccion"("restauranteId");

-- CreateIndex
CREATE INDEX "RestauranteReaccion_userId_idx" ON "social"."RestauranteReaccion"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RestauranteReaccion_restauranteId_userId_key" ON "social"."RestauranteReaccion"("restauranteId", "userId");

-- CreateIndex
CREATE INDEX "RestauranteComentario_restauranteId_idx" ON "social"."RestauranteComentario"("restauranteId");

-- CreateIndex
CREATE INDEX "RestauranteComentario_userId_idx" ON "social"."RestauranteComentario"("userId");

-- CreateIndex
CREATE INDEX "RestauranteComentario_padreId_idx" ON "social"."RestauranteComentario"("padreId");

-- CreateIndex
CREATE INDEX "RestauranteComentarioReaccion_comentarioId_idx" ON "social"."RestauranteComentarioReaccion"("comentarioId");

-- CreateIndex
CREATE UNIQUE INDEX "RestauranteComentarioReaccion_comentarioId_userId_key" ON "social"."RestauranteComentarioReaccion"("comentarioId", "userId");

-- CreateIndex
CREATE INDEX "RestauranteValoracion_restauranteId_idx" ON "social"."RestauranteValoracion"("restauranteId");

-- CreateIndex
CREATE UNIQUE INDEX "RestauranteValoracion_restauranteId_userId_key" ON "social"."RestauranteValoracion"("restauranteId", "userId");

-- CreateIndex
CREATE INDEX "RestaurantePregunta_restauranteId_idx" ON "social"."RestaurantePregunta"("restauranteId");

-- CreateIndex
CREATE INDEX "RestaurantePregunta_userId_idx" ON "social"."RestaurantePregunta"("userId");

-- CreateIndex
CREATE INDEX "RestauranteRespuesta_preguntaId_idx" ON "social"."RestauranteRespuesta"("preguntaId");

-- CreateIndex
CREATE INDEX "RestauranteFavorito_userId_idx" ON "social"."RestauranteFavorito"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RestauranteFavorito_restauranteId_userId_key" ON "social"."RestauranteFavorito"("restauranteId", "userId");

-- CreateIndex
CREATE INDEX "RestauranteSeguidor_restauranteId_idx" ON "social"."RestauranteSeguidor"("restauranteId");

-- CreateIndex
CREATE INDEX "RestauranteSeguidor_userId_idx" ON "social"."RestauranteSeguidor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RestauranteSeguidor_restauranteId_userId_key" ON "social"."RestauranteSeguidor"("restauranteId", "userId");

-- AddForeignKey
ALTER TABLE "social"."RestauranteReaccion" ADD CONSTRAINT "RestauranteReaccion_restauranteId_fkey" FOREIGN KEY ("restauranteId") REFERENCES "tenant"."Restaurante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."RestauranteReaccion" ADD CONSTRAINT "RestauranteReaccion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."RestauranteComentario" ADD CONSTRAINT "RestauranteComentario_restauranteId_fkey" FOREIGN KEY ("restauranteId") REFERENCES "tenant"."Restaurante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."RestauranteComentario" ADD CONSTRAINT "RestauranteComentario_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."RestauranteComentario" ADD CONSTRAINT "RestauranteComentario_padreId_fkey" FOREIGN KEY ("padreId") REFERENCES "social"."RestauranteComentario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."RestauranteComentarioReaccion" ADD CONSTRAINT "RestauranteComentarioReaccion_comentarioId_fkey" FOREIGN KEY ("comentarioId") REFERENCES "social"."RestauranteComentario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."RestauranteComentarioReaccion" ADD CONSTRAINT "RestauranteComentarioReaccion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."RestauranteValoracion" ADD CONSTRAINT "RestauranteValoracion_restauranteId_fkey" FOREIGN KEY ("restauranteId") REFERENCES "tenant"."Restaurante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."RestauranteValoracion" ADD CONSTRAINT "RestauranteValoracion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."RestaurantePregunta" ADD CONSTRAINT "RestaurantePregunta_restauranteId_fkey" FOREIGN KEY ("restauranteId") REFERENCES "tenant"."Restaurante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."RestaurantePregunta" ADD CONSTRAINT "RestaurantePregunta_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."RestauranteRespuesta" ADD CONSTRAINT "RestauranteRespuesta_preguntaId_fkey" FOREIGN KEY ("preguntaId") REFERENCES "social"."RestaurantePregunta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."RestauranteRespuesta" ADD CONSTRAINT "RestauranteRespuesta_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."RestauranteFavorito" ADD CONSTRAINT "RestauranteFavorito_restauranteId_fkey" FOREIGN KEY ("restauranteId") REFERENCES "tenant"."Restaurante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."RestauranteFavorito" ADD CONSTRAINT "RestauranteFavorito_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."RestauranteSeguidor" ADD CONSTRAINT "RestauranteSeguidor_restauranteId_fkey" FOREIGN KEY ("restauranteId") REFERENCES "tenant"."Restaurante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."RestauranteSeguidor" ADD CONSTRAINT "RestauranteSeguidor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
