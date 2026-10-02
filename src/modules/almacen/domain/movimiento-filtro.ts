import { FiltroInvalidoError } from "./almacen.errors.js"

export type CampoFiltroMovimiento = "tipo" | "cantidad" | "motivo" | "createdAt" | "origen"

// `filterValue` llega siempre como string; Prisma y Postgres necesitan el tipo
// de la columna, o el filtro termina en un 500 en lugar de un 400.
export function convertirValorFiltro(campo: CampoFiltroMovimiento, valor: string): string | number | Date {
  if (campo === "cantidad") {
    const n = valor.trim() === "" ? NaN : Number(valor)
    if (!Number.isFinite(n)) throw new FiltroInvalidoError(campo, valor, "un número")
    return n
  }
  if (campo === "createdAt") {
    const d = new Date(valor)
    if (Number.isNaN(d.getTime())) throw new FiltroInvalidoError(campo, valor, "una fecha ISO 8601")
    return d
  }
  return valor
}

export type OperadorFiltro = "equals" | "contains" | "startsWith" | "endsWith" | "gt" | "gte" | "lt" | "lte"

const OPERADORES_TEXTO: OperadorFiltro[] = ["contains", "startsWith", "endsWith"]

const OPERADORES_PERMITIDOS: Record<CampoFiltroMovimiento, OperadorFiltro[]> = {
  motivo: ["equals", "contains", "startsWith", "endsWith"],
  tipo: ["equals"],
  origen: ["equals"],
  cantidad: ["equals", "gt", "gte", "lt", "lte"],
  createdAt: ["equals", "gt", "gte", "lt", "lte"],
}

export interface FiltroMovimiento {
  campo: CampoFiltroMovimiento
  op: OperadorFiltro
  valor: string | number | Date
  esTexto: boolean
}

// null = la query no pide filtro. Un filtro incompleto o con un operador que no
// tiene sentido para el campo es un 400, no un filtro descartado en silencio.
export function normalizarFiltro(
  campo: CampoFiltroMovimiento | undefined,
  op: OperadorFiltro | undefined,
  valor: string | undefined,
): FiltroMovimiento | null {
  if (campo === undefined && op === undefined && valor === undefined) return null
  if (campo === undefined || op === undefined || valor === undefined) {
    throw new FiltroInvalidoError(campo ?? "?", valor ?? "", "filterField, filterOp y filterValue juntos")
  }
  if (!OPERADORES_PERMITIDOS[campo].includes(op)) {
    throw new FiltroInvalidoError(campo, valor, `un operador entre ${OPERADORES_PERMITIDOS[campo].join(", ")}`)
  }
  return { campo, op, valor: convertirValorFiltro(campo, valor), esTexto: OPERADORES_TEXTO.includes(op) }
}
