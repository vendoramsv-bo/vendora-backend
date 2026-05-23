import type { IRecetaProductoRepository, RecetaLinea, DefinirRecetaDTO } from "../domain/ports/IRecetaProductoRepository.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaClient = any

export class RecetaProductoPrismaRepository implements IRecetaProductoRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByProducto(productoId: string): Promise<RecetaLinea[]> {
    const rows = await this.db.productoInsumo.findMany({
      where: { productoId, varianteId: null },
      include: { insumo: { include: { unidadMedida: true } } },
    })
    return rows.map(toRecetaLinea)
  }

  async findByVariante(productoId: string, varianteId: string): Promise<RecetaLinea[]> {
    const rows = await this.db.productoInsumo.findMany({
      where: { productoId, varianteId },
      include: { insumo: { include: { unidadMedida: true } } },
    })
    return rows.map(toRecetaLinea)
  }

  async upsert(dto: DefinirRecetaDTO): Promise<RecetaLinea[]> {
    await this.db.$transaction(async (tx: PrismaClient) => {
      await tx.productoInsumo.deleteMany({
        where: { productoId: dto.productoId, varianteId: dto.varianteId ?? null },
      })
      await tx.productoInsumo.createMany({
        data: dto.lineas.map((l) => ({
          productoId: dto.productoId,
          varianteId: dto.varianteId ?? null,
          insumoId: l.insumoId,
          cantidad: l.cantidad,
        })),
      })
    })
    return dto.varianteId
      ? this.findByVariante(dto.productoId, dto.varianteId)
      : this.findByProducto(dto.productoId)
  }

  async delete(productoId: string, varianteId: string | null): Promise<void> {
    await this.db.productoInsumo.deleteMany({
      where: { productoId, varianteId: varianteId ?? null },
    })
  }

  async findReferencingProducts(insumoId: string, tenantId: string): Promise<string[]> {
    const rows = await this.db.productoInsumo.findMany({
      where: {
        insumoId,
        producto: { tenantId },
      },
      select: { productoId: true },
      distinct: ["productoId"],
    })
    return rows.map((r: { productoId: string }) => r.productoId)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRecetaLinea(row: any): RecetaLinea {
  return {
    insumoId: row.insumoId,
    insumoNombre: row.insumo.nombre,
    cantidad: Number(row.cantidad),
    unidadSigla: row.insumo.unidadMedida.sigla,
  }
}
