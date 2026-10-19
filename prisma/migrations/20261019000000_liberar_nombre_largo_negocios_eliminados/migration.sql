-- Frontend spec 038 (continuación de 20261018000000): `nombreLargo` también es
-- único, así que un negocio dado de baja lo libera igual que `name` y `slug`.
-- Mismo formato que `identidadLiberada()`: sufijo = últimos 8 caracteres del id.
UPDATE "tenant"."organization"
SET "nombreLargo" = "nombreLargo" || ' (eliminado ' || lower(right("id", 8)) || ')'
WHERE "estado" = 'ELIMINADO'
  AND "nombreLargo" NOT LIKE '% (eliminado %)';
