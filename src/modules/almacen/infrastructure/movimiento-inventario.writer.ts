import type { Prisma } from "../../../generated/prisma/client.js"

export type TipoMovimientoInventario = "CREACION" | "ENTRADA" | "SALIDA" | "AJUSTE" | "RECUENTO"

export interface RegistrarMovimientoDatos {
  tenantId: string
  productoId: string
  varianteId: string | null
  etiquetaVariante?: string | null
  tipo: TipoMovimientoInventario
  stockAntes: number
  stockDespues: number
  motivo?: string | null
  referenciaId: string
  createdById?: string | null
}

/**
 * Único punto de escritura de MovimientoInventario (spec 027).
 *
 * No usa `upsert`: Prisma rechaza `varianteId: null` en el `where` de la clave
 * compuesta, y los productos sin variante quedaban sin movimiento. `createMany`
 * con `skipDuplicates` es `INSERT … ON CONFLICT DO NOTHING`; la idempotencia
 * con `varianteId` nulo depende de que la restricción única sea NULLS NOT DISTINCT
 * (migración 20261005000000_movimiento_inventario_nulls_not_distinct).
 *
 * `cantidad` es el delta con signo (`stockDespues − stockAntes`) y se calcula acá.
 * Quien llama debe mover el stock solo si `insertado` es true.
 */
export async function registrarMovimiento(
  tx: Prisma.TransactionClient,
  datos: RegistrarMovimientoDatos,
): Promise<{ insertado: boolean }> {
  const { count } = await tx.movimientoInventario.createMany({
    data: [
      {
        tenantId: datos.tenantId,
        productoId: datos.productoId,
        varianteId: datos.varianteId,
        etiquetaVariante: datos.etiquetaVariante ?? null,
        tipo: datos.tipo,
        cantidad: datos.stockDespues - datos.stockAntes,
        motivo: datos.motivo ?? null,
        referenciaId: datos.referenciaId,
        stockAntes: datos.stockAntes,
        stockDespues: datos.stockDespues,
        createdById: datos.createdById ?? null,
      },
    ],
    skipDuplicates: true,
  })
  return { insertado: count === 1 }
}
