import { TransicionReservaInvalida, ReservaYaPagada } from "./restaurante.errors.js"

const TRANSICIONES_VALIDAS: Record<string, string[]> = {
  RESERVADA: ["CONFIRMADA", "CANCELADA", "NO_ASISTIO"],
  CONFIRMADA: ["EN_PREPARACION", "CANCELADA", "NO_ASISTIO"],
  EN_PREPARACION: ["LISTA", "CANCELADA"],
  LISTA: ["ENTREGADA", "CANCELADA"],
  ENTREGADA: ["PAGADA"],
  PAGADA: [],
  CANCELADA: [],
  NO_ASISTIO: [],
}

export interface ReservaRaw {
  id: string
  restauranteId: string
  codigo: string
  clienteId: string | null
  clienteNombre: string
  clienteTelefono: string | null
  clienteEmail: string | null
  menuId: string | null
  fechaReserva: Date
  fechaLlegada: Date
  numeroComensales: number
  numeroMesa: string | null
  observaciones: string | null
  canalOrigen: string | null
  totalCantidad: number
  totalEstimado: { toNumber(): number } | number
  estado: string
  atendidaPorId: string | null
  fechaConfirmacion: Date | null
  fechaCancelacion: Date | null
  motivoCancelacion: string | null
  ventaId: string | null
  createdAt: Date
  updatedAt: Date | null
  createdById: string | null
  updatedById: string | null
}

export class ReservaEntity {
  readonly id: string
  readonly restauranteId: string
  readonly codigo: string
  readonly clienteId: string | null
  readonly clienteNombre: string
  readonly clienteTelefono: string | null
  readonly clienteEmail: string | null
  readonly menuId: string | null
  readonly fechaReserva: Date
  readonly fechaLlegada: Date
  readonly numeroComensales: number
  readonly numeroMesa: string | null
  readonly observaciones: string | null
  readonly canalOrigen: string | null
  readonly totalCantidad: number
  readonly totalEstimado: number
  readonly estado: string
  readonly atendidaPorId: string | null
  readonly fechaConfirmacion: Date | null
  readonly fechaCancelacion: Date | null
  readonly motivoCancelacion: string | null
  readonly ventaId: string | null
  readonly createdAt: Date
  readonly updatedAt: Date | null
  readonly createdById: string | null
  readonly updatedById: string | null

  constructor(raw: ReservaRaw) {
    this.id = raw.id
    this.restauranteId = raw.restauranteId
    this.codigo = raw.codigo
    this.clienteId = raw.clienteId
    this.clienteNombre = raw.clienteNombre
    this.clienteTelefono = raw.clienteTelefono
    this.clienteEmail = raw.clienteEmail
    this.menuId = raw.menuId
    this.fechaReserva = raw.fechaReserva
    this.fechaLlegada = raw.fechaLlegada
    this.numeroComensales = raw.numeroComensales
    this.numeroMesa = raw.numeroMesa
    this.observaciones = raw.observaciones
    this.canalOrigen = raw.canalOrigen
    this.totalCantidad = raw.totalCantidad
    this.totalEstimado =
      typeof raw.totalEstimado === "object" && raw.totalEstimado !== null
        ? raw.totalEstimado.toNumber()
        : Number(raw.totalEstimado)
    this.estado = raw.estado
    this.atendidaPorId = raw.atendidaPorId
    this.fechaConfirmacion = raw.fechaConfirmacion
    this.fechaCancelacion = raw.fechaCancelacion
    this.motivoCancelacion = raw.motivoCancelacion
    this.ventaId = raw.ventaId
    this.createdAt = raw.createdAt
    this.updatedAt = raw.updatedAt
    this.createdById = raw.createdById
    this.updatedById = raw.updatedById
  }

  static fromPrisma(raw: ReservaRaw): ReservaEntity {
    return new ReservaEntity(raw)
  }

  static generarCodigo(fecha: Date, contador: number): string {
    const y = fecha.getFullYear()
    const m = String(fecha.getMonth() + 1).padStart(2, "0")
    const d = String(fecha.getDate()).padStart(2, "0")
    const n = String(contador).padStart(4, "0")
    return `RST-${y}${m}${d}-${n}`
  }

  puedeTransicionarA(nuevoEstado: string): boolean {
    return (TRANSICIONES_VALIDAS[this.estado] ?? []).includes(nuevoEstado)
  }

  validarTransicion(nuevoEstado: string): void {
    if (this.estado === "PAGADA") throw new ReservaYaPagada()
    if (!this.puedeTransicionarA(nuevoEstado)) {
      throw new TransicionReservaInvalida(this.estado, nuevoEstado)
    }
  }

  estaPagada(): boolean {
    return this.estado === "PAGADA"
  }

  estaActiva(): boolean {
    return !["PAGADA", "CANCELADA", "NO_ASISTIO"].includes(this.estado)
  }

  toJSON() {
    return {
      id: this.id,
      restauranteId: this.restauranteId,
      codigo: this.codigo,
      clienteId: this.clienteId,
      clienteNombre: this.clienteNombre,
      clienteTelefono: this.clienteTelefono,
      clienteEmail: this.clienteEmail,
      menuId: this.menuId,
      fechaReserva: this.fechaReserva.toISOString(),
      fechaLlegada: this.fechaLlegada.toISOString(),
      numeroComensales: this.numeroComensales,
      numeroMesa: this.numeroMesa,
      observaciones: this.observaciones,
      canalOrigen: this.canalOrigen,
      totalCantidad: this.totalCantidad,
      totalEstimado: this.totalEstimado,
      estado: this.estado,
      atendidaPorId: this.atendidaPorId,
      fechaConfirmacion: this.fechaConfirmacion?.toISOString() ?? null,
      fechaCancelacion: this.fechaCancelacion?.toISOString() ?? null,
      motivoCancelacion: this.motivoCancelacion,
      ventaId: this.ventaId,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt?.toISOString() ?? null,
    }
  }
}
