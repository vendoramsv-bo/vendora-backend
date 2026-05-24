import type { IClienteRepository } from "../../domain/ports/IClienteRepository.js"
import type { IVentasNotificador } from "../../domain/ports/IVentasNotificador.js"
import { ClienteNoEncontradoError, ClienteNombreDuplicadoError, ClienteEmailDuplicadoError } from "../../domain/ventas.errors.js"

export interface ActualizarClienteInput {
  id: string
  tenantId: string
  nombre?: string
  email?: string | null
  telefono?: string | null
  direccion?: string | null
  diaNacimiento?: number | null
  mesNacimiento?: number | null
  updatedById?: string | null
}

export class ActualizarClienteUseCase {
  constructor(
    private readonly repo: IClienteRepository,
    private readonly notificador: IVentasNotificador,
  ) {}

  async execute(input: ActualizarClienteInput) {
    const existente = await this.repo.obtenerPorId(input.id, input.tenantId)
    if (!existente) throw new ClienteNoEncontradoError(input.id)

    if (input.nombre && input.nombre !== existente.nombre) {
      const dup = await this.repo.obtenerPorNombre(input.nombre, input.tenantId)
      if (dup) throw new ClienteNombreDuplicadoError(input.nombre)
    }

    if (input.email && input.email !== existente.email) {
      const dup = await this.repo.obtenerPorEmail(input.email, input.tenantId)
      if (dup) throw new ClienteEmailDuplicadoError(input.email)
    }

    const cliente = await this.repo.actualizar(input.id, input.tenantId, {
      nombre: input.nombre,
      email: input.email,
      telefono: input.telefono,
      direccion: input.direccion,
      diaNacimiento: input.diaNacimiento,
      mesNacimiento: input.mesNacimiento,
      updatedById: input.updatedById,
    })

    this.notificador.clienteActualizado(input.tenantId, {
      clienteId: cliente.id,
      nombre: cliente.nombre,
      tenantId: input.tenantId,
    })

    return cliente
  }
}
