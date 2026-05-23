import type { IInventarioProductoRepository } from "../../domain/ports/IInventarioProductoRepository.js"
import {
  VarianteNoEncontradaError,
  VarianteYaInicializadaError,
} from "../../domain/almacen.errors.js"

export interface InicializarVarianteInput {
  varianteId: string
  tenantId: string
  stockInicial: number
  stockMinimo: number
  createdById?: string
}

export interface InicializarVarianteOutput {
  varianteId: string
  cantidadStock: number
  stockMinimo: number
  inventarioActivado: boolean
}

export class InicializarVarianteUseCase {
  constructor(private readonly repo: IInventarioProductoRepository) {}

  async execute(input: InicializarVarianteInput): Promise<InicializarVarianteOutput> {
    const variante = await this.repo.findVariante(input.varianteId, input.tenantId)
    if (!variante) throw new VarianteNoEncontradaError(input.varianteId)
    if (variante.inventarioActivado) throw new VarianteYaInicializadaError(input.varianteId)

    await this.repo.registrarAjuste({
      tenantId: input.tenantId,
      motivo: "Inicialización de inventario",
      detalles: [
        {
          productoId: variante.productoId,
          varianteId: input.varianteId,
          cantidadAjuste: input.stockInicial,
        },
      ],
      createdById: input.createdById,
    })

    variante.inventarioActivado = true
    variante.stockMinimo = input.stockMinimo

    return {
      varianteId: input.varianteId,
      cantidadStock: input.stockInicial,
      stockMinimo: input.stockMinimo,
      inventarioActivado: true,
    }
  }
}
