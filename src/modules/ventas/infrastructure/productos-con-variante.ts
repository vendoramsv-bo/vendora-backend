/**
 * Productos de la lista que tienen al menos una variante en estado ACTIVO (spec 027,
 * FR-008). Una línea de venta de uno de ellos debe indicar la variante. Un producto
 * con todas sus variantes dadas de baja se vende como simple.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function productosConVarianteActiva(db: any, tenantId: string, productoIds: string[]): Promise<string[]> {
  if (productoIds.length === 0) return []
  const filas: { id: string }[] = await db.producto.findMany({
    where: { tenantId, id: { in: [...new Set(productoIds)] }, variantes: { some: { estado: "ACTIVO" } } },
    select: { id: true },
  })
  return filas.map((f) => f.id)
}
