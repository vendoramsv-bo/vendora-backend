import type {
  IProductoRepository,
  ProductoCreateDTO,
  ProductoUpdateDTO,
  AtributoCreateDTO,
  AtributoValorCreateDTO,
  VarianteCreateDTO,
  VarianteUpdateDTO,
  PrecioVolumenCreateDTO,
  OpcionCreateDTO,
  OpcionUpdateDTO,
  OfertaCreateDTO,
  OfertaUpdateDTO,
  ListResult,
} from "../domain/ports/IProductoRepository.js"
import { ProductoEntity, type ProductoRaw } from "../domain/producto.entity.js"
import type { QueryParams } from "../../../core/query-params.js"
import { toPrismaArgs } from "../../../core/query-params.js"
import { withAudit } from "../../../core/prisma-scoped.js"
import {
  AtributoValorEnUso,
  VarianteAtributosDuplicados,
  VarianteSkuDuplicado,
  OfertaSolapada,
  PrecioVolumenCantidadDuplicada,
  OpcionNombreDuplicada,
} from "../domain/catalogo.errors.js"

const PRODUCTO_INCLUDE = {
  atributos: { include: { valores: true } },
  variantes: {
    include: {
      atributos: { include: { atributoValor: { include: { atributo: true } } } },
    },
  },
  opcionesDelProducto: true,
}

function ofertasVigentesWhere() {
  const now = new Date()
  return {
    estado: "ACTIVO",
    fechaInicio: { lte: now },
    fechaFin: { gte: now },
  }
}

export class ProductoPrismaRepository implements IProductoRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  async listar(tenantId: string, params: QueryParams): Promise<ListResult<ProductoEntity>> {
    const { take, skip, orderBy, where: whereSearch } = toPrismaArgs(params, ["nombre", "descripcion"])
    const where = { tenantId, ...whereSearch }
    const [rows, total] = await Promise.all([
      this.db.producto.findMany({
        where,
        take,
        skip,
        orderBy,
        include: {
          productosOfertas: { where: ofertasVigentesWhere() },
          preciosVolumen: { where: { estado: "ACTIVO" } },
        },
      }),
      this.db.producto.count({ where }),
    ])
    return { data: rows.map((r: ProductoRaw) => ProductoEntity.fromPrisma(r)), total }
  }

  async crear(data: ProductoCreateDTO, tenantId: string, userId: string): Promise<ProductoEntity> {
    const raw = await this.db.producto.create({
      data: withAudit({ ...data, tenantId }, userId),
      include: {
        ...PRODUCTO_INCLUDE,
        productosOfertas: { where: ofertasVigentesWhere() },
        preciosVolumen: { where: { estado: "ACTIVO" } },
      },
    })
    return ProductoEntity.fromPrisma(raw as ProductoRaw)
  }

  async obtener(id: string, tenantId: string): Promise<ProductoEntity | null> {
    const raw = await this.db.producto.findFirst({
      where: { id, tenantId },
      include: {
        ...PRODUCTO_INCLUDE,
        productosOfertas: { where: ofertasVigentesWhere() },
        preciosVolumen: { where: { estado: "ACTIVO" } },
      },
    })
    if (!raw) return null
    return ProductoEntity.fromPrisma(raw as ProductoRaw)
  }

  async actualizar(id: string, data: ProductoUpdateDTO, userId: string, precioAnterior?: string): Promise<ProductoEntity> {
    if (precioAnterior !== undefined) {
      const productoActual = await this.db.producto.findUnique({ where: { id }, select: { tenantId: true, precio: true } })
      const [updated] = await this.db.$transaction([
        this.db.producto.update({
          where: { id },
          data: { ...data, updatedById: userId },
          include: {
            ...PRODUCTO_INCLUDE,
            productosOfertas: { where: ofertasVigentesWhere() },
            preciosVolumen: { where: { estado: "ACTIVO" } },
          },
        }),
        this.db.productoPrecioHistorico.create({
          data: {
            productoId: id,
            tenantId: productoActual.tenantId,
            precioAnterior: precioAnterior,
            precioNuevo: data.precio!,
          },
        }),
      ])
      return ProductoEntity.fromPrisma(updated as ProductoRaw)
    }

    const raw = await this.db.producto.update({
      where: { id },
      data: { ...data, updatedById: userId },
      include: {
        ...PRODUCTO_INCLUDE,
        productosOfertas: { where: ofertasVigentesWhere() },
        preciosVolumen: { where: { estado: "ACTIVO" } },
      },
    })
    return ProductoEntity.fromPrisma(raw as ProductoRaw)
  }

  async cambiarEstado(id: string, estado: string, userId: string): Promise<void> {
    await this.db.producto.update({
      where: { id },
      data: { estado, updatedById: userId },
    })
  }

  async listarPrecioHistorico(id: string, tenantId: string, params: QueryParams): Promise<ListResult<unknown>> {
    const { take, skip } = params
    const where = { productoId: id, tenantId }
    const [rows, total] = await Promise.all([
      this.db.productoPrecioHistorico.findMany({ where, take, skip, orderBy: { createdAt: "desc" } }),
      this.db.productoPrecioHistorico.count({ where }),
    ])
    return { data: rows, total }
  }

  async listarAtributos(productoId: string, _tenantId: string): Promise<unknown[]> {
    return this.db.productoAtributo.findMany({
      where: { productoId },
      include: { valores: true },
      orderBy: { orden: "asc" },
    })
  }

  async crearAtributo(productoId: string, data: AtributoCreateDTO): Promise<unknown> {
    try {
      return await this.db.productoAtributo.create({ data: { productoId, ...data }, include: { valores: true } })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes("Unique constraint") || msg.includes("unique")) throw new Error("ATRIBUTO_NOMBRE_DUPLICADO")
      throw err
    }
  }

  async agregarValorAtributo(atributoId: string, data: AtributoValorCreateDTO): Promise<unknown> {
    try {
      return await this.db.productoAtributoValor.create({ data: { atributoId, ...data } })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes("Unique constraint") || msg.includes("unique")) throw new Error("ATRIBUTO_VALOR_DUPLICADO")
      throw err
    }
  }

  async eliminarValorAtributo(valorId: string, _productoId: string): Promise<void> {
    const enUso = await this.db.productoVarianteAtributo.findFirst({
      where: {
        atributoValorId: valorId,
        variante: { estado: "ACTIVO" },
      },
    })
    if (enUso) throw new AtributoValorEnUso()
    await this.db.productoAtributoValor.delete({ where: { id: valorId } })
  }

  async listarVariantes(productoId: string, _tenantId: string): Promise<unknown[]> {
    return this.db.productoVariante.findMany({
      where: { productoId },
      include: { atributos: { include: { atributoValor: { include: { atributo: true } } } } },
      orderBy: { createdAt: "asc" },
    })
  }

  async crearVariante(productoId: string, data: VarianteCreateDTO): Promise<unknown> {
    const { atributoValorIds, ...varianteData } = data

    if (data.sku) {
      const skuExiste = await this.db.productoVariante.findFirst({ where: { productoId, sku: data.sku } })
      if (skuExiste) throw new VarianteSkuDuplicado()
    }

    const variantesExistentes = await this.db.productoVariante.findMany({
      where: { productoId, estado: "ACTIVO" },
      include: { atributos: true },
    })

    const sortedIds = [...atributoValorIds].sort()
    for (const variante of variantesExistentes) {
      const varianteIds = variante.atributos.map((a: { atributoValorId: string }) => a.atributoValorId).sort()
      if (JSON.stringify(varianteIds) === JSON.stringify(sortedIds)) {
        throw new VarianteAtributosDuplicados()
      }
    }

    return this.db.$transaction(async (tx: typeof this.db) => {
      const variante = await tx.productoVariante.create({
        data: { productoId, ...varianteData },
      })
      for (const atributoValorId of atributoValorIds) {
        await tx.productoVarianteAtributo.create({
          data: { varianteId: variante.id, atributoValorId },
        })
      }
      return tx.productoVariante.findUnique({
        where: { id: variante.id },
        include: { atributos: { include: { atributoValor: { include: { atributo: true } } } } },
      })
    })
  }

  async actualizarVariante(id: string, _productoId: string, data: VarianteUpdateDTO): Promise<unknown> {
    const { estado, ...rest } = data
    const updateData: Record<string, unknown> = { ...rest }
    if (estado) updateData["estado"] = estado
    if (data.sku !== undefined) {
      const skuExiste = await this.db.productoVariante.findFirst({
        where: { sku: data.sku, id: { not: id } },
      })
      if (skuExiste) throw new VarianteSkuDuplicado()
    }
    return this.db.productoVariante.update({
      where: { id },
      data: updateData,
      include: { atributos: { include: { atributoValor: true } } },
    })
  }

  async cambiarEstadoVariante(id: string, _productoId: string, estado: string, _userId: string): Promise<void> {
    await this.db.productoVariante.update({ where: { id }, data: { estado } })
  }

  async crearPrecioVolumen(productoId: string, data: PrecioVolumenCreateDTO): Promise<unknown> {
    const where: Record<string, unknown> = { productoId, cantidad: data.cantidad }
    if (data.varianteId) {
      where["varianteId"] = data.varianteId
    } else {
      where["varianteId"] = null
    }
    const existente = await this.db.productoPrecioVolumen.findFirst({ where })
    if (existente) throw new PrecioVolumenCantidadDuplicada()
    return this.db.productoPrecioVolumen.create({ data: { productoId, ...data } })
  }

  async eliminarPrecioVolumen(id: string, productoId: string): Promise<void> {
    await this.db.productoPrecioVolumen.deleteMany({ where: { id, productoId } })
  }

  async listarOpciones(productoId: string): Promise<unknown[]> {
    return this.db.productoOpciones.findMany({ where: { productoId }, orderBy: { createdAt: "asc" } })
  }

  async crearOpcion(productoId: string, data: OpcionCreateDTO): Promise<unknown> {
    const existente = await this.db.productoOpciones.findFirst({
      where: { productoId, nombre: data.nombre },
    })
    if (existente) throw new OpcionNombreDuplicada()
    return this.db.productoOpciones.create({ data: { productoId, ...data } })
  }

  async actualizarOpcion(id: string, _productoId: string, data: OpcionUpdateDTO): Promise<unknown> {
    return this.db.productoOpciones.update({ where: { id }, data })
  }

  async listarOfertas(productoId: string, soloVigentes: boolean): Promise<unknown[]> {
    const where: Record<string, unknown> = { productoId }
    if (soloVigentes) {
      const now = new Date()
      where["estado"] = "ACTIVO"
      where["fechaInicio"] = { lte: now }
      where["fechaFin"] = { gte: now }
    }
    return this.db.productoOfertas.findMany({ where, orderBy: { fechaInicio: "desc" } })
  }

  async crearOferta(productoId: string, data: OfertaCreateDTO, tenantId: string): Promise<unknown> {
    const solapada = await this.db.productoOfertas.findFirst({
      where: {
        productoId,
        varianteId: data.varianteId ?? null,
        estado: "ACTIVO",
        fechaInicio: { lte: new Date(data.fechaFin) },
        fechaFin: { gte: new Date(data.fechaInicio) },
      },
    })
    if (solapada) throw new OfertaSolapada()
    return this.db.productoOfertas.create({
      data: {
        tenantId,
        productoId,
        ...data,
        fechaInicio: new Date(data.fechaInicio),
        fechaFin: new Date(data.fechaFin),
      },
    })
  }

  async actualizarOferta(id: string, _productoId: string, data: OfertaUpdateDTO): Promise<unknown> {
    const updateData: Record<string, unknown> = {}
    if (data.fechaInicio) updateData["fechaInicio"] = new Date(data.fechaInicio)
    if (data.fechaFin) updateData["fechaFin"] = new Date(data.fechaFin)
    if (data.precioOferta !== undefined) updateData["precioOferta"] = data.precioOferta
    if (data.estado) updateData["estado"] = data.estado
    return this.db.productoOfertas.update({ where: { id }, data: updateData })
  }
}
