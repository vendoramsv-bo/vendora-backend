import type { IServicioMedicoRepository, ServicioCreateDTO } from "../../domain/ports/IServicioMedicoRepository.js"
import type { ServicioMedicoEntity } from "../../domain/servicio-medico.entity.js"
import { ServicioEnUso } from "../../domain/consultorio.errors.js"

export class ActualizarServicioUseCase {
  constructor(private readonly repo: IServicioMedicoRepository) {}

  async ejecutar(id: string, data: Partial<ServicioCreateDTO & { estado: string }>, userId: string, consultorioId: string): Promise<ServicioMedicoEntity> {
    await this.repo.obtener(id, consultorioId)
    if (data.estado === "INACTIVO") {
      const enUso = await this.repo.tieneUsoActivo(id)
      if (enUso) throw new ServicioEnUso()
    }
    return this.repo.actualizar(id, data, userId)
  }
}
