-- Spec 035: el proveedor guarda su estado. Los existentes quedan ACTIVO.
ALTER TABLE "ventas"."Proveedor" ADD COLUMN "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO';
