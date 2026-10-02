-- CreateIndex
CREATE INDEX "MovimientoAlmacen_tenantId_createdAt_idx" ON "almacen"."MovimientoAlmacen"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "MovimientoInventario_tenantId_createdAt_idx" ON "almacen"."MovimientoInventario"("tenantId", "createdAt");

