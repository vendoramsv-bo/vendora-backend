-- Spec 027: la unicidad del movimiento también rige cuando varianteId es NULL
-- (productos sin variante). Prisma no modela NULLS NOT DISTINCT; se conserva el
-- mismo nombre para que siga reconociendo el @@unique de MovimientoInventario.
DROP INDEX "almacen"."MovimientoInventario_tenantId_productoId_varianteId_tipo_re_key";

CREATE UNIQUE INDEX "MovimientoInventario_tenantId_productoId_varianteId_tipo_re_key"
  ON "almacen"."MovimientoInventario" ("tenantId", "productoId", "varianteId", "tipo", "referenciaId")
  NULLS NOT DISTINCT;
