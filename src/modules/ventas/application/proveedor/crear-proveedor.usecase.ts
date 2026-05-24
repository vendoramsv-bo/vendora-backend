import type { IProveedorRepository } from "../../domain/ports/IProveedorRepository.js"
import type { IVentasNotificador } from "../../domain/ports/IVentasNotificador.js"
import { ProveedorNombreDuplicadoError, ProveedorNITDuplicadoError } from "../../domain/ventas.errors.js"

export interface CrearProveedorInput {
  tenantId: string
  nombre: string
  nit?: string | null
  telefono?: string | null
  direccion?: string | null
  departamento?: string | null
  sitioWeb?: string | null
  productosOfrece?: string | null
  createdById?: string | null
}

export class CrearProveedorUseCase {
  constructor(
    private readonly repo: IProveedorRepository,
    private readonly notificador: IVentasNotificador,
  ) {}

  async execute(input: CrearProveedorInput) {
    const existenteNombre = await this.repo.obtenerPorNombre(input.nombre, input.tenantId)
    if (existenteNombre) throw new ProveedorNombreDuplicadoError(input.nombre)

    if (input.nit) {
      const existenteNit = await this.repo.obtenerPorNit(input.nit, input.tenantId)
      if (existenteNit) throw new ProveedorNITDuplicadoError(input.nit)
    }

    const proveedor = await this.repo.crear({
      tenantId: input.tenantId,
      nombre: input.nombre,
      nit: input.nit ?? null,
      telefono: input.telefono ?? null,
      direccion: input.direccion ?? null,
      departamento: input.departamento ?? null,
      sitioWeb: input.sitioWeb ?? null,
      productosOfrece: input.productosOfrece ?? null,
      createdById: input.createdById ?? null,
    })

    this.notificador.proveedorCreado(input.tenantId, {
      proveedorId: proveedor.id,
      nombre: proveedor.nombre,
      tenantId: input.tenantId,
    })

    return proveedor
  }
}
