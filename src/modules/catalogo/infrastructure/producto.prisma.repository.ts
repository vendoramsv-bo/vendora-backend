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
  ConfirmarVarianteItemDTO,
  PropuestaVarianteItem,
  AltaMasivaResult,
  SincronizarSeleccionResult,
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
  ProductoConMovimientos,
  SinAtributos,
  ClaProductoNoEncontrado,
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

  // ─── Verificación y eliminación ───────────────────────────────────────────────

  async verificarCodigo(tenantId: string, codigo: string): Promise<{ existe: boolean; producto?: { id: string; nombre: string; codigo: string } }> {
    const producto = await this.db.producto.findFirst({
      where: { tenantId, codigo: codigo.trim() },
      select: { id: true, nombre: true, codigo: true },
    })
    if (!producto) return { existe: false }
    return { existe: true, producto }
  }

  async eliminar(id: string, tenantId: string): Promise<void> {
    await this.db.producto.delete({ where: { id, tenantId } })
  }

  async tieneUsoOperativo(productoId: string): Promise<boolean> {
    const producto = await this.db.producto.findUnique({
      where: { id: productoId },
      select: {
        _count: { select: { ventasDetalle: true, movimientosInventario: true, reservaDetalles: true } },
      },
    })
    if (!producto) return false
    const { ventasDetalle, movimientosInventario, reservaDetalles } = producto._count
    return ventasDetalle > 0 || movimientosInventario > 0 || reservaDetalles > 0
  }

  // ─── Integración con inventario (cross-schema almacen) ───────────────────────

  async registrarMovimientoCreacion(productoId: string, tenantId: string, cantidadStock: number, userId: string): Promise<void> {
    await this.db.movimientoInventario.create({
      data: {
        tenantId,
        productoId,
        tipo: "CREACION",
        cantidad: cantidadStock,
        stockAntes: 0,
        stockDespues: cantidadStock,
        createdById: userId,
      },
    })
  }

  async eliminarMovimientoCreacion(productoId: string, tenantId: string): Promise<void> {
    await this.db.movimientoInventario.deleteMany({
      where: { productoId, tenantId, tipo: "CREACION" },
    })
  }

  async actualizarMovimientoCreacion(productoId: string, tenantId: string, cantidadStock: number): Promise<void> {
    await this.db.movimientoInventario.updateMany({
      where: { productoId, tenantId, tipo: "CREACION" },
      data: { cantidad: cantidadStock, stockDespues: cantidadStock },
    })
  }

  async tieneMovimientosReales(productoId: string): Promise<boolean> {
    const count = await this.db.movimientoInventario.count({
      where: { productoId, tipo: { not: "CREACION" } },
    })
    return count > 0
  }

  // ─── Variantes cartesianas ────────────────────────────────────────────────────

  async generarPropuestaVariantes(productoId: string, tenantId: string): Promise<PropuestaVarianteItem[]> {
    const producto = await this.db.producto.findFirst({
      where: { id: productoId, tenantId },
      include: {
        atributos: {
          include: { valores: { orderBy: { orden: "asc" } } },
          orderBy: { orden: "asc" },
        },
      },
    })
    if (!producto) return []

    const atributos: Array<{ nombre: string; valores: Array<{ id: string; valor: string }> }> = producto.atributos
    if (atributos.length === 0) throw new SinAtributos()

    const cartesiano = atributos.reduce<Array<Array<{ atributo: string; valor: string; atributoValorId: string }>>>(
      (acc, attr) =>
        acc.flatMap((combo) =>
          attr.valores.map((v: { id: string; valor: string }) => [
            ...combo,
            { atributo: attr.nombre, valor: v.valor, atributoValorId: v.id },
          ]),
        ),
      [[]],
    )

    return cartesiano.map((combo) => ({
      etiqueta: combo.map((c) => `${c.atributo} ${c.valor}`).join(" / "),
      combinacion: combo,
      valoresIds: combo.map((c) => c.atributoValorId),
    }))
  }

  async confirmarVariantes(productoId: string, variantes: ConfirmarVarianteItemDTO[]): Promise<unknown[]> {
    return this.db.$transaction(async (tx: typeof this.db) => {
      const creadas: unknown[] = []
      for (const item of variantes) {
        const { atributoValorIds, ...varianteData } = item
        const sortedIds = [...atributoValorIds].sort()

        const existentes = await tx.productoVariante.findMany({
          where: { productoId },
          include: { atributos: true },
        })
        for (const existente of existentes) {
          const existenteIds = existente.atributos.map((a: { atributoValorId: string }) => a.atributoValorId).sort()
          if (JSON.stringify(existenteIds) === JSON.stringify(sortedIds)) {
            throw new VarianteAtributosDuplicados()
          }
        }

        const variante = await tx.productoVariante.create({
          data: { productoId, ...varianteData },
        })
        for (const atributoValorId of atributoValorIds) {
          await tx.productoVarianteAtributo.create({
            data: { varianteId: variante.id, atributoValorId },
          })
        }
        const full = await tx.productoVariante.findUnique({
          where: { id: variante.id },
          include: { atributos: { include: { atributoValor: { include: { atributo: true } } } } },
        })
        creadas.push(full)
      }
      return creadas
    })
  }

  // ─── Alta masiva desde catálogo maestro ──────────────────────────────────────

  async altaMasiva(claProductoIds: string[], tenantId: string, userId: string): Promise<AltaMasivaResult> {
    // ── Fase 1: todas las lecturas en batch, fuera de transacción ─────────────
    const plantillas = await this.db.claProducto.findMany({
      where: { id: { in: claProductoIds } },
      include: { claActividadEconomica: true, claCategoria: true, claUnidadMedida: true },
    })

    const encontradosIds = new Set(plantillas.map((p: any) => p.id))
    const noEncontrados = claProductoIds.filter((id) => !encontradosIds.has(id))
    if (noEncontrados.length > 0) throw new ClaProductoNoEncontrado(noEncontrados)

    const claActividadIds = [...new Set<string>(plantillas.map((p: any) => p.claActividadId))]
    const claCategoriaIds = [...new Set<string>(plantillas.map((p: any) => p.claCategoriaId))]
    const claUnidadIds = [...new Set<string>(plantillas.map((p: any) => p.claUnidadId))]

    const [actividadesExistentes, categoriasExistentes, unidadesExistentes] = await Promise.all([
      this.db.actividadEconomica.findMany({ where: { tenantId, claActividadId: { in: claActividadIds } } }),
      this.db.categoria.findMany({ where: { tenantId, claCategoriaId: { in: claCategoriaIds } } }),
      this.db.unidadMedida.findMany({ where: { tenantId, claUnidadId: { in: claUnidadIds } } }),
    ])

    const actividadMap = new Map<string, any>(actividadesExistentes.map((a: any) => [a.claActividadId, a]))
    const categoriaMap = new Map<string, any>(categoriasExistentes.map((c: any) => [c.claCategoriaId, c]))
    const unidadMap = new Map<string, any>(unidadesExistentes.map((u: any) => [u.claUnidadId, u]))

    for (const plantilla of plantillas) {
      if (!actividadMap.has((plantilla as any).claActividadId)) {
        throw new Error(`Actividad económica no activada para el tenant: ${(plantilla as any).claActividadEconomica.nombre}`)
      }
    }

    // Pre-cargar productos existentes para detectar duplicados sin query dentro de tx
    const actividadIdsDelTenant = actividadesExistentes.map((a: any) => a.id)
    const productosExistentes = await this.db.producto.findMany({
      where: { tenantId, actividadId: { in: actividadIdsDelTenant } },
      select: { actividadId: true, codigo: true },
    })
    const productosExistentesSet = new Set<string>(
      productosExistentes.map((p: any) => `${p.actividadId}:${p.codigo}`),
    )

    // ── Fase 2: solo escrituras dentro de la transacción ─────────────────────
    return this.db.$transaction(async (tx: typeof this.db) => {
      let categoriasCreadas = 0
      let unidadesMedidaCreadas = 0
      const creados: ProductoEntity[] = []

      for (const plantilla of plantillas) {
        const actividadTenant = actividadMap.get((plantilla as any).claActividadId)!

        if (!categoriaMap.has((plantilla as any).claCategoriaId)) {
          const nueva = await tx.categoria.create({
            data: withAudit(
              {
                tenantId,
                actividadId: actividadTenant.id,
                nombre: (plantilla as any).claCategoria.nombre,
                claCategoriaId: (plantilla as any).claCategoriaId,
              },
              userId,
            ),
          })
          categoriaMap.set((plantilla as any).claCategoriaId, nueva)
          categoriasCreadas++
        }
        const categoriaTenant = categoriaMap.get((plantilla as any).claCategoriaId)!

        if (!unidadMap.has((plantilla as any).claUnidadId)) {
          const nueva = await tx.unidadMedida.create({
            data: withAudit(
              {
                tenantId,
                claUnidadId: (plantilla as any).claUnidadId,
                unidad: (plantilla as any).claUnidadMedida.unidad,
                sigla: (plantilla as any).claUnidadMedida.sigla,
                descripcion: (plantilla as any).claUnidadMedida.descripcion ?? (plantilla as any).claUnidadMedida.unidad,
              },
              userId,
            ),
          })
          unidadMap.set((plantilla as any).claUnidadId, nueva)
          unidadesMedidaCreadas++
        }
        const unidadTenant = unidadMap.get((plantilla as any).claUnidadId)!

        // Saltar si el producto ya existe (detectado en fase 1 sin query)
        const productKey = `${actividadTenant.id}:${(plantilla as any).codigo}`
        if (productosExistentesSet.has(productKey)) continue

        const raw = await tx.producto.create({
          data: withAudit(
            {
              tenantId,
              actividadId: actividadTenant.id,
              categoriaId: categoriaTenant.id,
              unidadId: unidadTenant.id,
              codigo: (plantilla as any).codigo,
              nombre: (plantilla as any).nombre,
              descripcion: (plantilla as any).descripcion ?? undefined,
              imagenUrl: (plantilla as any).imagenUrl ?? undefined,
              tipoProducto: (plantilla as any).tipoProducto,
              precio: Number((plantilla as any).precio),
              cantidadStock: 0,
              stockMinimo: 0,
              tipoDescuento: "SIN_DESCUENTO",
            },
            userId,
          ),
          include: {
            ...PRODUCTO_INCLUDE,
            productosOfertas: { where: ofertasVigentesWhere() },
            preciosVolumen: { where: { estado: "ACTIVO" } },
          },
        })
        creados.push(ProductoEntity.fromPrisma(raw as ProductoRaw))
        productosExistentesSet.add(productKey)
      }

      return { creados, categoriasCreadas, unidadesMedidaCreadas }
    }, { timeout: 30000, maxWait: 10000 })
  }

  // ─── Sincronización de selección (wizard) ────────────────────────────────────

  async sincronizarSeleccion(claProductoIds: string[], tenantId: string, userId: string): Promise<SincronizarSeleccionResult> {
    // Resolver la selección actualmente guardada para el tenant — mismo criterio
    // de identidad que GET /catalogo/productos-seleccionados: (actividadId, codigo)
    // se mapea a claProductoId vía el catálogo maestro ClaProducto.
    const productosTenant = await this.db.producto.findMany({
      where: { tenantId },
      select: { id: true, codigo: true, actividadId: true },
    })

    const actividadIds = [...new Set<string>(productosTenant.map((p: any) => p.actividadId))]
    const actividades = actividadIds.length > 0
      ? await this.db.actividadEconomica.findMany({
          where: { id: { in: actividadIds } },
          select: { id: true, claActividadId: true },
        })
      : []
    const actividadMap = new Map<string, string>(actividades.map((a: any) => [a.id, a.claActividadId]))

    const conCla = productosTenant
      .map((p: any) => ({ productoId: p.id, codigo: p.codigo, claActividadId: actividadMap.get(p.actividadId) ?? null }))
      .filter((p: any) => p.claActividadId !== null)

    const claProductos = conCla.length > 0
      ? await this.db.claProducto.findMany({
          where: { OR: conCla.map((p: any) => ({ codigo: p.codigo, claActividadId: p.claActividadId })) },
          select: { id: true, codigo: true, claActividadId: true },
        })
      : []

    const existentes = conCla
      .map((p: any) => {
        const cla = claProductos.find((c: any) => c.codigo === p.codigo && c.claActividadId === p.claActividadId)
        return cla ? { productoId: p.productoId as string, claProductoId: cla.id as string } : null
      })
      .filter((x: any): x is { productoId: string; claProductoId: string } => x !== null)

    const seleccionSet = new Set(claProductoIds)
    const existentesSet = new Set(existentes.map((e: { claProductoId: string }) => e.claProductoId))
    const paraAgregar = claProductoIds.filter((id) => !existentesSet.has(id))
    const paraEliminarCandidatos = existentes.filter((e: { claProductoId: string }) => !seleccionSet.has(e.claProductoId))

    // Agregar — reutiliza altaMasiva, que ya valida catálogo y evita duplicados.
    // Corre en su propia transacción (altaMasiva ya la maneja internamente).
    let creados: ProductoEntity[] = []
    let categoriasCreadas = 0
    let unidadesMedidaCreadas = 0
    if (paraAgregar.length > 0) {
      const resultado = await this.altaMasiva(paraAgregar, tenantId, userId)
      creados = resultado.creados
      categoriasCreadas = resultado.categoriasCreadas
      unidadesMedidaCreadas = resultado.unidadesMedidaCreadas
    }

    // Eliminar — solo los productos deseleccionados que no tienen uso operativo real
    let eliminados = 0
    let protegidos = 0
    if (paraEliminarCandidatos.length > 0) {
      const conteos = await this.db.producto.findMany({
        where: { id: { in: paraEliminarCandidatos.map((p: { productoId: string }) => p.productoId) } },
        select: {
          id: true,
          _count: { select: { ventasDetalle: true, movimientosInventario: true, reservaDetalles: true } },
        },
      })
      const eliminablesIds = conteos
        .filter((p: any) => p._count.ventasDetalle === 0 && p._count.movimientosInventario === 0 && p._count.reservaDetalles === 0)
        .map((p: any) => p.id as string)
      protegidos = paraEliminarCandidatos.length - eliminablesIds.length
      if (eliminablesIds.length > 0) {
        await this.db.producto.deleteMany({ where: { id: { in: eliminablesIds }, tenantId } })
        eliminados = eliminablesIds.length
      }
    }

    return { creados, categoriasCreadas, unidadesMedidaCreadas, eliminados, protegidos }
  }
}
