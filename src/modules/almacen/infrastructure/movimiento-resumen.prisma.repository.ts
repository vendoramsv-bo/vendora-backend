import type {
  IMovimientoResumenRepository,
  ProductoResumen,
} from "../domain/ports/IMovimientoResumenRepository.js"

/**
 * La etiqueta de una variante: sus valores de atributo unidos por " · ", en el orden de
 * los atributos; si no tiene, su SKU o "Variante". La misma regla con que el cliente arma
 * la `etiquetaVariante` de los movimientos.
 */
export function etiquetaDeVariante(v: {
  sku: string | null
  atributos: { atributoValor: { valor: string; atributo: { orden: number } } | null }[]
}): string {
  const valores = v.atributos
    .flatMap((a) => (a.atributoValor ? [a.atributoValor] : []))
    .sort((a, b) => a.atributo.orden - b.atributo.orden)
    .map((a) => a.valor)
    .filter(Boolean)
  if (valores.length > 0) return valores.join(" · ")
  return v.sku?.trim() || "Variante"
}

export class MovimientoResumenPrismaRepository implements IMovimientoResumenRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  async leerProducto(tenantId: string, productoId: string): Promise<ProductoResumen | null> {
    const p = await this.db.producto.findFirst({
      where: { id: productoId, tenantId },
      select: {
        cantidadStock: true,
        variantes: {
          where: { estado: "ACTIVO" },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            sku: true,
            cantidadStock: true,
            atributos: { select: { atributoValor: { select: { valor: true, atributo: { select: { orden: true } } } } } },
          },
        },
      },
    })
    if (!p) return null
    return {
      cantidadStock: p.cantidadStock,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      variantes: p.variantes.map((v: any) => ({
        varianteId: v.id,
        etiqueta: etiquetaDeVariante(v),
        stock: v.cantidadStock,
      })),
    }
  }

  async leerStockVariante(tenantId: string, productoId: string, varianteId: string): Promise<number | null> {
    const v = await this.db.productoVariante.findFirst({
      where: { id: varianteId, productoId, producto: { tenantId } },
      select: { cantidadStock: true },
    })
    return v ? v.cantidadStock : null
  }

  async sumarMovimientos(tenantId: string, productoId: string, varianteId?: string) {
    const where = { tenantId, productoId, ...(varianteId ? { varianteId } : {}) }
    const [entradas, salidas] = await Promise.all([
      this.db.movimientoInventario.aggregate({ where: { ...where, cantidad: { gt: 0 } }, _sum: { cantidad: true } }),
      this.db.movimientoInventario.aggregate({ where: { ...where, cantidad: { lt: 0 } }, _sum: { cantidad: true } }),
    ])
    return { entradas: entradas._sum.cantidad ?? 0, salidas: salidas._sum.cantidad ?? 0 }
  }
}
