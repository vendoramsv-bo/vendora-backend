import type { IHistoriaClinicaRepository, AdjuntoDTO } from "../../domain/ports/IHistoriaClinicaRepository.js"
import type { AdjuntoClinicoRaw } from "../../domain/historia-clinica.entity.js"

export class AdjuntarArchivoUseCase {
  constructor(private readonly repo: IHistoriaClinicaRepository) {}

  async ejecutar(historiaId: string, data: AdjuntoDTO, consultorioId: string): Promise<AdjuntoClinicoRaw> {
    await this.repo.obtener(historiaId, consultorioId)
    return this.repo.agregarAdjunto(historiaId, data)
  }
}
