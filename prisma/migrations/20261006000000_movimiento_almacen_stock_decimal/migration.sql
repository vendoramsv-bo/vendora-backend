-- El stock de un insumo es Decimal(10,4) (se mide en fracciones: 2,5 kg), pero el
-- historial lo guardaba como entero: un ajuste, recuento o stock inicial con decimales
-- fallaba al escribir el movimiento. Ampliar el tipo no pierde datos.
ALTER TABLE "almacen"."MovimientoAlmacen"
  ALTER COLUMN "stockAntes" SET DATA TYPE DECIMAL(10,4),
  ALTER COLUMN "stockDespues" SET DATA TYPE DECIMAL(10,4);
