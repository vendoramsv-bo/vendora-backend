import { describe, it, expect, beforeEach } from "vitest"
import { RegistrarPagoUseCase } from "../../src/modules/consultorio/application/atencion-medica/registrar-pago.usecase.js"
import { PagoExcedeTotalError } from "../../src/modules/consultorio/domain/consultorio.errors.js"
import { AtencionMedicaEntity, type AtencionMedicaRaw } from "../../src/modules/consultorio/domain/atencion-medica.entity.js"
import type { IAtencionMedicaRepository, PagoDTO } from "../../src/modules/consultorio/domain/ports/IAtencionMedicaRepository.js"
import type { ListResult } from "../../src/modules/consultorio/domain/ports/IMedicoRepository.js"
import { FakeConsultorioNotificador } from "../helpers/fake-consultorio.notificador.js"
import type { QueryParams } from "../../src/core/query-params.js"

const CONSULTORIO = "c1"
const TENANT = "t1"
const USER = "u1"

function makeAtencionRaw(overrides: Partial<AtencionMedicaRaw> = {}): AtencionMedicaRaw {
  return {
    id: "at-1",
    consultorioId: CONSULTORIO,
    pacienteId: "p1",
    pacienteNombre: "Ana",
    pacienteApellido: "Lopez",
    pacienteTelefono: null,
    medicoId: "m1",
    medicoNombre: "Dr. García",
    medicoEspecialidad: "GP",
    citaId: null,
    fechaAtencion: new Date(),
    totalServicios: 1,
    totalCantidad: 1,
    subtotal: 100,
    descuento: 0,
    total: 100,
    tipoPago: "EFECTIVO",
    estadoPago: "PENDIENTE",
    observaciones: null,
    estado: "EN_CURSO",
    createdAt: new Date(),
    updatedAt: null,
    createdById: null,
    updatedById: null,
    detalle: [],
    pagos: [],
    ...overrides,
  }
}

class FakeAtencionRepository implements IAtencionMedicaRepository {
  private store = new Map<string, AtencionMedicaRaw>()

  seed(raw: AtencionMedicaRaw): void {
    this.store.set(raw.id, raw)
  }

  async obtener(id: string, _consultorioId: string): Promise<AtencionMedicaEntity> {
    const raw = this.store.get(id)
    if (!raw) throw new Error(`Atencion ${id} no encontrada`)
    return AtencionMedicaEntity.fromPrisma(raw)
  }

  async crear(_data: unknown, _cId: string, _userId: string): Promise<AtencionMedicaEntity> {
    throw new Error("not implemented")
  }

  async listar(_cId: string, _params: QueryParams): Promise<ListResult<AtencionMedicaEntity>> {
    throw new Error("not implemented")
  }

  async registrarPago(atencionId: string, data: PagoDTO, _userId: string): Promise<AtencionMedicaEntity> {
    const raw = this.store.get(atencionId)!
    const pagosActualizados = [...(raw.pagos ?? []), { id: `pago-${Date.now()}`, atencionId, monto: data.monto, metodo: data.metodo, referencia: data.referencia ?? null, nota: data.nota ?? null, pagadoEn: new Date(), registradoPor: data.registradoPor ?? null }]
    const totalPagado = pagosActualizados.reduce((s, p) => s + Number(p.monto), 0)
    const total = Number(raw.total)
    const estadoPago = totalPagado >= total ? "PAGADO" : totalPagado > 0 ? "PARCIAL" : "PENDIENTE"
    const estado = totalPagado >= total ? "PAGADA" : "COMPLETADA"
    const updated = { ...raw, pagos: pagosActualizados, estadoPago, estado }
    this.store.set(atencionId, updated)
    return AtencionMedicaEntity.fromPrisma(updated)
  }

  async actualizarEstado(id: string, estado: string, estadoPago: string, _userId: string): Promise<AtencionMedicaEntity> {
    const raw = this.store.get(id)!
    const updated = { ...raw, estado, estadoPago }
    this.store.set(id, updated)
    return AtencionMedicaEntity.fromPrisma(updated)
  }
}

describe("RegistrarPagoUseCase", () => {
  let repo: FakeAtencionRepository
  let notificador: FakeConsultorioNotificador
  let useCase: RegistrarPagoUseCase

  beforeEach(() => {
    repo = new FakeAtencionRepository()
    notificador = new FakeConsultorioNotificador()
    useCase = new RegistrarPagoUseCase(repo, notificador)
    repo.seed(makeAtencionRaw())
  })

  it("pago parcial → estadoPago=PARCIAL", async () => {
    const result = await useCase.ejecutar("at-1", { monto: 60, metodo: "EFECTIVO" }, USER, CONSULTORIO, TENANT)
    expect(result.estadoPago).toBe("PARCIAL")
  })

  it("pago total → estadoPago=PAGADO y evento emitido", async () => {
    const result = await useCase.ejecutar("at-1", { monto: 100, metodo: "EFECTIVO" }, USER, CONSULTORIO, TENANT)
    expect(result.estadoPago).toBe("PAGADO")
    expect(notificador.tieneEvento("consultorio:atencion:estadoCambiado")).toBe(true)
  })

  it("pago excede saldo → PagoExcedeTotalError", async () => {
    await expect(
      useCase.ejecutar("at-1", { monto: 150, metodo: "EFECTIVO" }, USER, CONSULTORIO, TENANT),
    ).rejects.toThrow(PagoExcedeTotalError)
  })

  it("pago parcial seguido de pago total → PAGADO", async () => {
    await useCase.ejecutar("at-1", { monto: 60, metodo: "EFECTIVO" }, USER, CONSULTORIO, TENANT)
    const result = await useCase.ejecutar("at-1", { monto: 40, metodo: "EFECTIVO" }, USER, CONSULTORIO, TENANT)
    expect(result.estadoPago).toBe("PAGADO")
  })
})
