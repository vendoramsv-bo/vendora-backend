export interface TenantRaw {
  id: string
  name: string
  slug: string
  logo?: string | null
  nombreLargo: string
  descripcion: string
  esTienda: boolean
  esConsultorio: boolean
  esRestaurante: boolean
  plan: string
  estado: string
  ultimoPasoCreacion: number
  createdAt: Date
  updatedAt?: Date | null
  createdById?: string | null
  updatedById?: string | null
}

export class TenantEntity {
  private constructor(private readonly raw: TenantRaw) {}

  static fromPrisma(raw: TenantRaw): TenantEntity {
    return new TenantEntity(raw)
  }

  get id() { return this.raw.id }
  get name() { return this.raw.name }
  get slug() { return this.raw.slug }
  get logo() { return this.raw.logo }
  get nombreLargo() { return this.raw.nombreLargo }
  get descripcion() { return this.raw.descripcion }
  get esTienda() { return this.raw.esTienda }
  get esConsultorio() { return this.raw.esConsultorio }
  get esRestaurante() { return this.raw.esRestaurante }
  get plan() { return this.raw.plan }
  get estado() { return this.raw.estado }
  get ultimoPasoCreacion() { return this.raw.ultimoPasoCreacion }
  get createdAt() { return this.raw.createdAt }
  get updatedAt() { return this.raw.updatedAt }

  toJSON() {
    return {
      id: this.raw.id,
      name: this.raw.name,
      slug: this.raw.slug,
      logo: this.raw.logo ?? null,
      nombreLargo: this.raw.nombreLargo,
      descripcion: this.raw.descripcion,
      esTienda: this.raw.esTienda,
      esConsultorio: this.raw.esConsultorio,
      esRestaurante: this.raw.esRestaurante,
      plan: this.raw.plan,
      estado: this.raw.estado,
      ultimoPasoCreacion: this.raw.ultimoPasoCreacion,
      createdAt: this.raw.createdAt.toISOString(),
      updatedAt: this.raw.updatedAt?.toISOString() ?? null,
    }
  }
}
