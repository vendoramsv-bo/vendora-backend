import type { IProveedorRepository } from "../../domain/ports/IProveedorRepository.js"
import type { IVentasNotificador } from "../../domain/ports/IVentasNotificador.js"
import { ProveedorNoEncontradoError, ProveedorNombreDuplicadoError, ProveedorNITDuplicadoError } from "../../domain/ventas.errors.js"

export interface ActualizarProveedorInput {
  id: string
  tenantId: string
  nombre?: string
  nit?: string | null
  telefono?: string | null
  direccion?: string | null
  departamento?: string | null
  sitioWeb?: string | null
  productosOfrece?: string | null
  updatedById?: string | null
}

export class ActualizarProveedorUseCase {
  constructor(
    private readonly repo: IProveedorRepository,
    private readonly notificador: IVentasNotificador,
  ) {}

  async execute(input: ActualizarProveedorInput) {
    const existente = await this.repo.obtenerPorId(input.id, input.tenantId)
    if (!existente) throw new ProveedorNoEncontradoError(input.id)

    if (input.nombre && input.nombre !== existente.nombre) {
      const dup = await this.repo.obtenerPorNombre(input.nombre, input.tenantId)
      if (dup) throw new ProveedorNombreDuplicadoError(input.nombre)
    }

    if (input.nit && input.nit !== existente.nit) {
      const dup = await this.repo.obtenerPorNit(input.nit, input.tenantId)
      if (dup) throw new ProveedorNITDuplicadoError(input.nit)
    }

    const proveedor = await this.repo.actualizar(input.id, input.tenantId, {
      nombre: input.nombre,
      nit: input.nit,
      telefono: input.telefono,
      direccion: input.direccion,
      departamento: input.departamento,
      sitioWeb: input.sitioWeb,
      productosOfrece: input.productosOfrece,
      updatedById: input.updatedById,
    })

    this.notificador.proveedorActualizado(input.tenantId, {
      proveedorId: proveedor.id,
      nombre: proveedor.nombre,
      tenantId: input.tenantId,
    })

    return proveedor
  }
}
