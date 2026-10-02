import type { QueryParams } from "../../../core/query-params.js"
import { toPrismaArgs } from "../../../core/query-params.js"
import {
  normalizarFiltro,
  type CampoFiltroMovimiento,
  type OperadorFiltro,
} from "../domain/movimiento-filtro.js"

// `toPrismaArgs` pasa `filterValue` como string a cualquier campo: con `cantidad`
// (Int/Decimal), `createdAt` o un enum, Prisma falla y la respuesta es un 500.
// Acá el filtro se reemplaza por uno tipado, y el orden se desempata por `id`
// para que el offset sea estable entre páginas.
export function argsListadoMovimientos(params: QueryParams, tiposValidos: readonly string[]) {
  const { take, skip, orderBy, where } = toPrismaArgs({ ...params, filterField: undefined }, ["motivo"])

  const filtro = normalizarFiltro(
    params.filterField as CampoFiltroMovimiento | undefined,
    params.filterOp as OperadorFiltro | undefined,
    params.filterValue,
  )
  if (filtro) {
    if (filtro.campo === "tipo" && !tiposValidos.includes(filtro.valor as string)) {
      where[filtro.campo] = { in: [] }
    } else if (filtro.esTexto) {
      where[filtro.campo] = { [filtro.op]: filtro.valor, mode: "insensitive" }
    } else {
      where[filtro.campo] = { [filtro.op]: filtro.valor }
    }
  }

  const [[campoOrden, dir]] = Object.entries(orderBy) as [[string, "asc" | "desc"]]
  return { take, skip, where, orderBy: [{ [campoOrden]: dir }, { id: dir }] }
}

export const TIPOS_MOVIMIENTO_ALMACEN = ["CREACION", "INGRESO", "SALIDA", "AJUSTE", "RECUENTO"] as const
export const TIPOS_MOVIMIENTO_INVENTARIO = ["CREACION", "ENTRADA", "SALIDA", "AJUSTE", "RECUENTO"] as const
