-- 026: un usuario puede ser propietario de varios negocios (uno por negocio sigue vía tenantId @unique)
-- DropIndex
DROP INDEX "tenant"."Propietario_userId_key";

-- CreateIndex
CREATE INDEX "Propietario_userId_idx" ON "tenant"."Propietario"("userId");

-- 026: teléfono y domicilio del equipo son opcionales, como los trata la pantalla
-- AlterTable
ALTER TABLE "tenant"."EquipoDeTrabajo" ALTER COLUMN "telefono" DROP NOT NULL,
ALTER COLUMN "domicilio" DROP NOT NULL;

-- 026: backfill — todo negocio tiene propietario, tomado de su dueño más antiguo.
-- Mismos valores que crea el hook onOrganizationCreated.
INSERT INTO "tenant"."Propietario"
  ("id", "tenantId", "userId", "nombres", "telefono", "domicilio",
   "nombreReferencia", "telefonoReferencia", "estado", "createdAt", "createdById", "updatedById")
SELECT gen_random_uuid()::text, m."organizationId", m."userId", '', '', '', '', '',
       'ACTIVO'::"compartido"."Estado", now(), m."userId", m."userId"
FROM (
  SELECT DISTINCT ON ("organizationId") "organizationId", "userId"
  FROM "tenant"."member"
  WHERE "role" IN ('owner', 'PROPIETARIO')
  ORDER BY "organizationId", "createdAt" ASC
) m
WHERE NOT EXISTS (
  SELECT 1 FROM "tenant"."Propietario" p WHERE p."tenantId" = m."organizationId"
);
