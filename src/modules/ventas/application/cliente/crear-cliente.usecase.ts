import type { IClienteRepository } from "../../domain/ports/IClienteRepository.js"
import type { IVentasNotificador } from "../../domain/ports/IVentasNotificador.js"
import { ClienteNombreDuplicadoError, ClienteEmailDuplicadoError } from "../../domain/ventas.errors.js"

export interface CrearClienteInput {
  tenantId: string
  nombre: string
  email?: string | null
  telefono?: string | null
  direccion?: string | null
  diaNacimiento?: number | null
  mesNacimiento?: number | null
  createdById?: string | null
}

export class CrearClienteUseCase {
  constructor(
    private readonly repo: IClienteRepository,
    private readonly notificador: IVentasNotificador,
  ) {}

  async execute(input: CrearClienteInput) {
    const existenteNombre = await this.repo.obtenerPorNombre(input.nombre, input.tenantId)
    if (existenteNombre) throw new ClienteNombreDuplicadoError(input.nombre)

    if (input.email) {
      const existenteEmail = await this.repo.obtenerPorEmail(input.email, input.tenantId)
      if (existenteEmail) throw new ClienteEmailDuplicadoError(input.email)
    }

    const cliente = await this.repo.crear({
      tenantId: input.tenantId,
      nombre: input.nombre,
      email: input.email ?? null,
      telefono: input.telefono ?? null,
      direccion: input.direccion ?? null,
      diaNacimiento: input.diaNacimiento ?? null,
      mesNacimiento: input.mesNacimiento ?? null,
      createdById: input.createdById ?? null,
    })

    this.notificador.clienteCreado(input.tenantId, {
      clienteId: cliente.id,
      nombre: cliente.nombre,
      tenantId: input.tenantId,
    })

    return cliente
  }
}
