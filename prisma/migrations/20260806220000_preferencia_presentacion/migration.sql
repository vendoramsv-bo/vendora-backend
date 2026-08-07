-- Feature 021 — Sistema de diseño visual propio de Vendora
--
-- Mueve la preferencia de presentación de `Configuracion` (que cuelga de Tienda,
-- así que un consultorio o un restaurante puros no tienen dónde guardarla) a
-- `PreferenciaPresentacion`, que cuelga del Tenant.
--
-- REGLA DE ESTA MIGRACIÓN: copia primero, borra al final. Ninguna preferencia
-- que un negocio haya elegido se pierde (FR-036, SC-015). El orden de los pasos
-- de abajo es parte del contrato, no una casualidad.

-- ─── 1. Los enumerados nuevos ────────────────────────────────────────────────

-- CreateEnum
CREATE TYPE "tenant"."TemaVendora" AS ENUM ('CLAY', 'VERDE', 'AZUL', 'VIOLETA', 'ROSA', 'DORADO', 'SLATE');

-- CreateEnum
CREATE TYPE "tenant"."TipoLineado" AS ENUM ('CURVA', 'RECTA', 'GUIONES', 'ZIGZAG', 'NINGUNO');

-- ─── 2. La tabla nueva ───────────────────────────────────────────────────────

-- CreateTable
CREATE TABLE "tenant"."PreferenciaPresentacion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tema" "tenant"."TemaVendora" NOT NULL DEFAULT 'CLAY',
    "tipoLineado" "tenant"."TipoLineado" NOT NULL DEFAULT 'CURVA',
    "tipoDespliegueVentas" "tenant"."TipoDespliegueVentas" NOT NULL DEFAULT 'BARRA_LATERAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "PreferenciaPresentacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PreferenciaPresentacion_tenantId_key" ON "tenant"."PreferenciaPresentacion"("tenantId");

-- AddForeignKey
ALTER TABLE "tenant"."PreferenciaPresentacion"
  ADD CONSTRAINT "PreferenciaPresentacion_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── 3. COPIAR los datos existentes ──────────────────────────────────────────
--
-- Una fila por cada `Configuracion`, colgada del Tenant dueño de esa Tienda.
--
-- `tipoDespliegueVentas` se copia tal cual: ya era enumerado.
--
-- `tema` y `tipoLineado` eran `String` libre y hay filas con valores que la
-- aplicación no sabe resolver:
--   · 'green'  es el @default del schema, en inglés, y nunca estuvo entre las
--              opciones que el asistente ofrece → VERDE
--   · 'system' no es un color sino una preferencia de modo, y el modo nunca
--              vivió acá → CLAY
--   · cualquier otro valor o NULL → CLAY / CURVA, el respaldo de marca
--
-- El `gen_random_uuid()` requiere pgcrypto o PG13+; el resto del schema ya usa
-- ids de texto generados por la app, así que acá se compone uno estable a
-- partir del tenantId para que la migración sea idempotente si se reintenta.

INSERT INTO "tenant"."PreferenciaPresentacion"
  ("id", "tenantId", "tema", "tipoLineado", "tipoDespliegueVentas", "createdAt")
SELECT
  'pref_' || t."id",
  t."id",
  CASE lower(coalesce(c."tema", ''))
    WHEN 'clay'    THEN 'CLAY'::"tenant"."TemaVendora"
    WHEN 'verde'   THEN 'VERDE'::"tenant"."TemaVendora"
    WHEN 'azul'    THEN 'AZUL'::"tenant"."TemaVendora"
    WHEN 'violeta' THEN 'VIOLETA'::"tenant"."TemaVendora"
    WHEN 'rosa'    THEN 'ROSA'::"tenant"."TemaVendora"
    WHEN 'dorado'  THEN 'DORADO'::"tenant"."TemaVendora"
    WHEN 'slate'   THEN 'SLATE'::"tenant"."TemaVendora"
    WHEN 'green'   THEN 'VERDE'::"tenant"."TemaVendora"
    WHEN 'system'  THEN 'CLAY'::"tenant"."TemaVendora"
    ELSE                'CLAY'::"tenant"."TemaVendora"
  END,
  CASE lower(coalesce(c."tipoLineado", ''))
    WHEN 'curvedline' THEN 'CURVA'::"tenant"."TipoLineado"
    WHEN 'line'       THEN 'RECTA'::"tenant"."TipoLineado"
    WHEN 'dashedline' THEN 'GUIONES'::"tenant"."TipoLineado"
    WHEN 'zigzagline' THEN 'ZIGZAG'::"tenant"."TipoLineado"
    WHEN 'ninguno'    THEN 'NINGUNO'::"tenant"."TipoLineado"
    ELSE                   'CURVA'::"tenant"."TipoLineado"
  END,
  c."tipoDespliegueVentas",
  coalesce(c."createdAt", CURRENT_TIMESTAMP)
FROM "tenant"."Configuracion" c
JOIN "tenant"."Tienda" ti ON ti."id" = c."tiendaId"
JOIN "tenant"."organization" t ON t."id" = ti."tenantId"
ON CONFLICT ("tenantId") DO NOTHING;

-- ─── 4. Recién ahora, borrar las columnas viejas ─────────────────────────────
--
-- Si algo de lo de arriba falló, la transacción de Prisma revierte y las
-- columnas siguen intactas. Ese es el punto de que este paso vaya último.

-- AlterTable
ALTER TABLE "tenant"."Configuracion"
  DROP COLUMN "tema",
  DROP COLUMN "tipoLineado",
  DROP COLUMN "tipoDespliegueVentas";
