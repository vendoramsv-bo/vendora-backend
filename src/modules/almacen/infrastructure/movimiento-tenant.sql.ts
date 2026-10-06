import { Prisma } from "../../../generated/prisma/client.js"
import type { QueryParamsMovimientosTenant } from "../domain/ports/IMovimientoTenantRepository.js"
import { normalizarFiltro, type CampoFiltroMovimiento, type OperadorFiltro } from "../domain/movimiento-filtro.js"

// Los identificadores salen siempre de este mapa; ningún nombre de campo que
// manda el cliente llega al texto del SQL.
const COLUMNAS: Record<CampoFiltroMovimiento, Prisma.Sql> = {
  origen: Prisma.raw("u.origen"),
  // NULL en la rama de insumos: filtrar por producto deja solo movimientos de productos.
  productoId: Prisma.raw('u."productoId"'),
  tipo: Prisma.raw("u.tipo"),
  motivo: Prisma.raw("u.motivo"),
  cantidad: Prisma.raw("u.cantidad"),
  createdAt: Prisma.raw('u."createdAt"'),
}

const COMPARADORES: Partial<Record<OperadorFiltro, Prisma.Sql>> = {
  equals: Prisma.raw("="),
  gt: Prisma.raw(">"),
  gte: Prisma.raw(">="),
  lt: Prisma.raw("<"),
  lte: Prisma.raw("<="),
}

const escaparLike = (s: string) => s.replace(/[\\%_]/g, "\\$&")

function patronLike(op: OperadorFiltro, valor: string): string {
  const v = escaparLike(valor)
  if (op === "startsWith") return `${v}%`
  if (op === "endsWith") return `%${v}`
  return `%${v}%`
}

// El tenant va dentro de cada rama: cada una usa su índice (tenantId, createdAt)
// y ningún filtro externo puede dejarlo afuera.
function union(tenantId: string): Prisma.Sql {
  return Prisma.sql`(
    SELECT m.id, 'INSUMO'::text AS origen,
           m."insumoId" AS "insumoId", NULL::text AS "productoId", NULL::text AS "varianteId",
           i.nombre AS "nombreEntidad", NULL::text AS "etiquetaVariante",
           CASE WHEN m.tipo::text = 'INGRESO' THEN 'ENTRADA' ELSE m.tipo::text END AS tipo,
           m.cantidad::numeric AS cantidad, m."stockAntes", m."stockDespues",
           m.motivo, m."referenciaId", m."createdAt"
      FROM almacen."MovimientoAlmacen" m JOIN almacen."Insumo" i ON i.id = m."insumoId"
     WHERE m."tenantId" = ${tenantId}
    UNION ALL
    SELECT m.id, 'VARIANTE'::text AS origen,
           NULL::text AS "insumoId", m."productoId", m."varianteId",
           p.nombre AS "nombreEntidad", m."etiquetaVariante",
           m.tipo::text AS tipo,
           m.cantidad::numeric AS cantidad, m."stockAntes", m."stockDespues",
           m.motivo, m."referenciaId", m."createdAt"
      FROM almacen."MovimientoInventario" m JOIN catalogo."Producto" p ON p.id = m."productoId"
     WHERE m."tenantId" = ${tenantId}
  ) u`
}

function condiciones(params: QueryParamsMovimientosTenant): Prisma.Sql[] {
  const conds: Prisma.Sql[] = []

  if (params.search) {
    const patron = `%${escaparLike(params.search)}%`
    conds.push(Prisma.sql`(u.motivo ILIKE ${patron} OR u."nombreEntidad" ILIKE ${patron})`)
  }

  const filtro = normalizarFiltro(params.filterField, params.filterOp, params.filterValue)
  if (filtro) {
    const col = COLUMNAS[filtro.campo]
    if (filtro.esTexto) {
      conds.push(Prisma.sql`${col} ILIKE ${patronLike(filtro.op, filtro.valor as string)}`)
    } else {
      conds.push(Prisma.sql`${col} ${COMPARADORES[filtro.op]!} ${filtro.valor}`)
    }
  }

  return conds
}

export function construirConsultaMovimientosTenant(tenantId: string, params: QueryParamsMovimientosTenant) {
  const conds = condiciones(params)
  const where = conds.length ? Prisma.sql`WHERE ${Prisma.join(conds, " AND ")}` : Prisma.empty
  const col = COLUMNAS[params.orderBy ?? "createdAt"]
  const dir = Prisma.raw(params.order === "asc" ? "ASC" : "DESC")

  return {
    consulta: Prisma.sql`SELECT * FROM ${union(tenantId)} ${where}
      ORDER BY ${col} ${dir}, u.id ${dir}
      LIMIT ${params.take} OFFSET ${params.skip}`,
    conteo: Prisma.sql`SELECT COUNT(*)::int AS total FROM ${union(tenantId)} ${where}`,
  }
}
