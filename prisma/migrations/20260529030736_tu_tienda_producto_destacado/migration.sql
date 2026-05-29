/*
  Warnings:

  - You are about to drop the column `version` on the `AjusteInventario` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `IngresoAlmacen` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `RecuentoInventario` table. All the data in the column will be lost.
  - You are about to drop the column `motivo` on the `SalidaAlmacen` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `SalidaAlmacen` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "almacen"."AjusteInventario" DROP COLUMN "version",
ALTER COLUMN "estado" DROP DEFAULT;

-- AlterTable
ALTER TABLE "almacen"."IngresoAlmacen" DROP COLUMN "version";

-- AlterTable
ALTER TABLE "almacen"."RecuentoInventario" DROP COLUMN "version";

-- AlterTable
ALTER TABLE "almacen"."SalidaAlmacen" DROP COLUMN "motivo",
DROP COLUMN "version";

-- AlterTable
ALTER TABLE "social"."TiendaPregunta" ALTER COLUMN "estado" SET DEFAULT 'ACTIVO';

-- CreateTable
CREATE TABLE "tenant"."ProductoDestacado" (
    "id" TEXT NOT NULL,
    "tiendaId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "ProductoDestacado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductoDestacado_tiendaId_orden_idx" ON "tenant"."ProductoDestacado"("tiendaId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "ProductoDestacado_tiendaId_productoId_key" ON "tenant"."ProductoDestacado"("tiendaId", "productoId");

-- AddForeignKey
ALTER TABLE "tenant"."ProductoDestacado" ADD CONSTRAINT "ProductoDestacado_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "tenant"."Tienda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant"."ProductoDestacado" ADD CONSTRAINT "ProductoDestacado_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "catalogo"."Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
