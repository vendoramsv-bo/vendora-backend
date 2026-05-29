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
