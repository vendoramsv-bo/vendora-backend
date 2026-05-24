import { z } from "zod"
import { makeQueryParamsSchema } from "../../../core/query-params.js"

export const ConsultorioPerfilSchema = z.object({
  especialidades: z.array(z.string()).optional(),
  nroRegistro: z.string().optional(),
})

export const MedicoBaseSchema = z.object({
  memberId: z.string(),
  especialidad: z.string(),
  nroRegistro: z.string().optional(),
  bio: z.string().optional(),
  fotoUrl: z.string().url().optional(),
})

export const MedicoUpdateSchema = z.object({
  especialidad: z.string().optional(),
  nroRegistro: z.string().optional(),
  bio: z.string().optional(),
  fotoUrl: z.string().url().optional(),
  estado: z.enum(["ACTIVO", "INACTIVO"]).optional(),
})

export const HorarioSchema = z.object({
  diaSemana: z.number().int().min(0).max(6),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/),
  horaFin: z.string().regex(/^\d{2}:\d{2}$/),
})

export const PacienteBaseSchema = z.object({
  nombre: z.string().min(1),
  apellido: z.string().min(1),
  fechaNacimiento: z.string().optional(),
  genero: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional(),
  direccion: z.string().optional(),
  tipoSangre: z.string().optional(),
  alergias: z.string().optional(),
  seguroNombre: z.string().optional(),
  seguroNumero: z.string().optional(),
})

export const PacienteUpdateSchema = PacienteBaseSchema.partial().extend({
  estado: z.enum(["ACTIVO", "INACTIVO"]).optional(),
})

export const VacunacionSchema = z.object({
  vacuna: z.string().min(1),
  dosis: z.string().optional(),
  fechaAplicacion: z.string().optional(),
  proximaDosis: z.string().optional(),
  medicoId: z.string().optional(),
  lote: z.string().optional(),
})

export const ServicioBaseSchema = z.object({
  nombre: z.string().min(1),
  especialidad: z.string().optional(),
  descripcion: z.string().optional(),
  duracionMin: z.number().int().min(5).default(30),
  precioBase: z.number().min(0).default(0),
})

export const ServicioUpdateSchema = ServicioBaseSchema.partial().extend({
  estado: z.enum(["ACTIVO", "INACTIVO"]).optional(),
})

export const CitaCreateSchema = z.object({
  pacienteId: z.string(),
  medicoId: z.string(),
  servicioId: z.string().optional(),
  fechaHora: z.string().datetime(),
  duracionMin: z.number().int().min(5).default(30),
  motivo: z.string().optional(),
  canalOrigen: z.string().optional(),
  notas: z.string().optional(),
})

export const HistoriaCreateSchema = z.object({
  pacienteId: z.string(),
  medicoId: z.string(),
  citaId: z.string().optional(),
  especialidad: z.string(),
  motivoConsulta: z.string().min(1),
  diagnostico: z.string().optional(),
  tratamiento: z.string().optional(),
  observaciones: z.string().optional(),
  fecha: z.string().optional(),
})

export const HistoriaUpdateSchema = HistoriaCreateSchema.partial().omit({ pacienteId: true, medicoId: true })

export const AtencionDetalleSchema = z.object({
  servicioId: z.string(),
  tipoTratamiento: z.string(),
  descripcionTratamiento: z.string().optional(),
  referenciaClin: z.string().optional(),
  cantidad: z.number().int().min(1).default(1),
  precioUnitario: z.number().min(0),
  descuento: z.number().min(0).default(0),
  nota: z.string().optional(),
})

export const AtencionCreateSchema = z.object({
  pacienteId: z.string(),
  medicoId: z.string(),
  citaId: z.string().optional(),
  detalle: z.array(AtencionDetalleSchema).min(1),
  tipoPago: z.string().optional(),
  observaciones: z.string().optional(),
})

export const PagoSchema = z.object({
  monto: z.number().positive(),
  metodo: z.string(),
  referencia: z.string().optional(),
  nota: z.string().optional(),
})

export const RecetaDetalleSchema = z.object({
  medicamento: z.string().min(1),
  principioActivo: z.string().optional(),
  concentracion: z.string().optional(),
  presentacion: z.string().optional(),
  dosis: z.string().min(1),
  frecuencia: z.string().min(1),
  duracion: z.string().min(1),
  via: z.string().default("ORAL"),
  cantidadPrescrita: z.number().int().min(1).default(1),
  indicaciones: z.string().optional(),
  permiteSustitucion: z.boolean().default(true),
})

export const RecetaCreateSchema = z.object({
  atencionId: z.string(),
  indicacionesGenerales: z.string().optional(),
  diagnosticoCie10: z.string().optional(),
  fechaVencimiento: z.string().optional(),
  observaciones: z.string().optional(),
  detalle: z.array(RecetaDetalleSchema).min(1),
})

export const ConfirmarCitaBodySchema = z.object({
  expectedUpdatedAt: z.string().datetime().optional(),
})

export const CancelarCitaBodySchema = z.object({
  expectedUpdatedAt: z.string().datetime().optional(),
})

export const HistoriaUpdateWithLockSchema = HistoriaUpdateSchema.extend({
  expectedUpdatedAt: z.string().datetime().optional(),
})

export const PacienteCreateSchema = PacienteBaseSchema.extend({
  dni: z.string().max(20).optional(),
  canalNotificacion: z.enum(["EMAIL", "SMS", "WHATSAPP"]).nullable().optional(),
})

export const PacienteUpdateWithDniSchema = PacienteUpdateSchema.extend({
  dni: z.string().max(20).optional(),
  canalNotificacion: z.enum(["EMAIL", "SMS", "WHATSAPP"]).nullable().optional(),
})

export const PagoAtencionBodySchema = PagoSchema.extend({
  aperturaCierreCajaId: z.string().optional(),
  puntoVentaId: z.string().optional(),
  turnoId: z.string().optional(),
})

export const QueryParamsConsultorioSchema = makeQueryParamsSchema(["createdAt", "nombre", "apellido", "fechaHora", "estado"])
