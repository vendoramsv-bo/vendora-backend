-- Frontend spec 038: un negocio dado de baja libera su nombre y su slug (únicos),
-- para que el propietario pueda crear otro con el mismo nombre. Desde ahora lo
-- hace `DELETE /api/tenant/actual`; esto repara los que ya estaban de baja.
-- Mismo formato que `identidadLiberada()`: sufijo = últimos 8 caracteres del id.
UPDATE "tenant"."organization"
SET
  "name" = "name" || ' (eliminado ' || lower(right("id", 8)) || ')',
  "slug" = "slug" || '--eliminado-' || lower(right("id", 8))
WHERE "estado" = 'ELIMINADO'
  AND "slug" NOT LIKE '%--eliminado-%';
