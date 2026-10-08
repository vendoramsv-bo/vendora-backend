-- Spec 033 (B-05): el recuento de almacén pasa a pendiente -> aprobado, como el de
-- inventario. Hasta ahora se aplicaba al stock en el mismo momento de registrarlo y
-- quedaba en ACTIVO.

-- Concurrencia optimista al aprobar (la misma que ingresos y salidas).
ALTER TABLE "almacen"."RecuentoAlmacen" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

-- Los recuentos ya registrados aplicaron el stock al crearse: son aprobados. Sin esto,
-- la lista ofrecería aprobarlos otra vez.
UPDATE "almacen"."RecuentoAlmacen" SET "estado" = 'APROBADO' WHERE "estado" = 'ACTIVO';
