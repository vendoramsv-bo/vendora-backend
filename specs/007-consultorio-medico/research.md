# Research: Módulo de Consultorio Médico

**Feature**: 007-consultorio-medico  
**Date**: 2026-05-24  
**Status**: Complete

## Estado Actual de la Implementación

El módulo `src/modules/consultorio/` ya tiene implementación sustancial. Este documento registra las decisiones tomadas para los gaps encontrados entre la implementación existente y los requisitos del spec.

---

## Decision 1 — Vacunaciones (FR-022)

**Problema**: No existen entidad, puerto, repositorio, casos de uso ni adaptador REST para vacunaciones.

**Decisión**: Agregar el sub-módulo `vacunacion/` siguiendo los patrones del módulo.

- **Archivos nuevos**:
  - `domain/vacunacion.entity.ts`
  - `domain/ports/IVacunacionRepository.ts`
  - `infrastructure/vacunacion.prisma.repository.ts`
  - `application/vacunacion/crear-vacunacion.usecase.ts`
  - `application/vacunacion/listar-vacunaciones.usecase.ts`
  - `application/vacunacion/eliminar-vacunacion.usecase.ts`
  - `adapters/vacunacion.rest.ts`
- **Modelo Prisma**: `Vacunacion` ya existe en `prisma/60-consultorio.prisma`.
- **Ruta REST**: Montada bajo `/consultorio/pacientes/:pacienteId/vacunaciones`

**Rationale**: El modelo ya existe en la BD; solo falta la capa de aplicación.  
**Alternatives considered**: Incluir vacunaciones como parte de HistoriaClinica — rechazado porque Vacunacion es independiente de una consulta (puede registrarse sin historia clínica asociada).

---

## Decision 2 — DNI como campo único en Paciente (Clarificación Q2)

**Problema**: La clarificación definió DNI como campo único obligatorio, pero el modelo Prisma actual tiene `@@unique([consultorioId, email])` y no tiene campo `dni`.

**Decisión**: Agregar `dni String?` al modelo `Paciente` en `prisma/60-consultorio.prisma` + `@@unique([consultorioId, dni])` y mantener el unique de email para compatibilidad. Marcar `dni` como `@db.VarChar(20)` para cubrir DNI boliviano, argentino, etc.

- **Schema change**: `prisma/60-consultorio.prisma` — Paciente model
- **Entity change**: `PacienteEntity` agrega `dni` field
- **Use case change**: `crear-paciente.usecase.ts` valida DNI único al crear; rechaza duplicados con error de dominio `DNIYaRegistrado`
- **Adapter change**: `paciente.rest.ts` y `consultorio.schema.ts` incluyen `dni` en creación y actualización

**Rationale**: DNI es el identificador médico estándar en Latinoamérica; permite deduplicación real.  
**Alternatives considered**: Usar email como único identificador — rechazado porque muchos pacientes (adultos mayores, niños) no tienen email propio. Nombre + fecha de nacimiento — rechazado porque hay homonimia.

---

## Decision 3 — Canal de notificación en Paciente (Clarificación Q5)

**Problema**: No existe campo `canalNotificacion` en el modelo `Paciente`. El worker de BullMQ hardcodea `canal: "EMAIL"`.

**Decisión**: Agregar `canalNotificacion String? // EMAIL, SMS, WHATSAPP` al modelo Paciente. Actualizar el worker `recordatorio-cita.worker.ts` para que consulte el canal preferido del paciente antes de enviar.

- **Schema change**: `prisma/60-consultorio.prisma` — Paciente model
- **Worker change**: `src/workers/recordatorio-cita.worker.ts` — lookup `paciente.canalNotificacion`; si null, omitir envío

**Rationale**: La preferencia de canal por paciente es la UX correcta; el patient controla su canal una vez y aplica a todas sus citas.  
**Alternatives considered**: Config a nivel consultorio — rechazado porque limita la personalización.

---

## Decision 4 — Cobro → Crear Venta en caja unificada (FR-024)

**Problema**: `RegistrarPagoUseCase` marca atención como PAGADA pero no crea una venta en el módulo de ventas.

**Decisión**: Usar el patrón de Port para la integración cross-módulo:

1. Crear puerto `domain/ports/IVentaService.ts` en consultorio
2. Crear adaptador `infrastructure/venta.service.adapter.ts` que invoca `CrearVentaUseCase` del módulo ventas
3. Inyectar `IVentaService` en `RegistrarPagoUseCase`
4. Cuando `estadoPago === 'PAGADO'`, llamar `IVentaService.crearDesdeAtencion(...)`
5. Vínculo de retorno: usar `referenciaTipo = "ATENCION_MEDICA"` y `referenciaId = atencion.id` en la venta (patrón ya existente en VentaData)

**Input del staff para el cobro final**: El endpoint REST de registrar-pago acepta opcionalmente `{ aperturaCierreCajaId, puntoVentaId, turnoId }` para el contexto de caja. Si se proveen, al completar el pago total se crea la venta automáticamente.

**Rationale**: El patrón de puertos mantiene el dominio consultorio agnóstico del módulo ventas.  
**Alternatives considered**: 
- Llamada directa de use case a use case — rechazado (viola fronteras de módulo y dificulta tests).
- Evento de dominio procesado por un handler — válido pero agrega complejidad sin beneficio claro en un monolito.

---

## Decision 5 — Bloqueo Optimista (Clarificación Q4)

**Problema**: No existe mecanismo de bloqueo optimista en Cita, AtencionMedica ni HistoriaClinica.

**Decisión**: Usar `updatedAt` como token de versión implícita (no agregar campo `version` separado).

- El cliente envía `{ expectedUpdatedAt: string }` al modificar un recurso
- El repositorio verifica que `updatedAt === expectedUpdatedAt` antes del update; si difiere lanza `ConflictoVersionError` (dominio error → HTTP 409)
- Aplica a: confirmar-cita, cancelar-cita, actualizar-historia, actualizar-atencion

**Rationale**: `updatedAt` ya existe en todos los modelos. Agregar un campo `version: Int` es más explícito pero innecesario dado que `updatedAt` tiene precisión suficiente.  
**Alternatives considered**: `version: Int @default(0)` con incremento — más semántico pero requiere schema change. `SELECT FOR UPDATE` / lock pesimista — rechazado por conflicto con la arquitectura hexagonal y requerimientos de performance.

---

## Decision 6 — Audit Trail de Lecturas / HIPAA (FR-002b, FR-002c)

**Problema**: Solo existe auditoría de escrituras (`createdById`, `updatedById`). FR-002b requiere audit log de lecturas de datos médicos sensibles.

**Decisión**: Agregar tabla `AuditoriaAcceso` al schema consultorio:

```
model AuditoriaAcceso {
  id         String   @id @default(cuid())
  tenantId   String
  consultorioId String
  userId     String
  accion     String   // LEER_HISTORIA, LEER_RECETA, LEER_PACIENTE, etc.
  recursoTipo String  // HISTORIA_CLINICA, RECETA_MEDICA, PACIENTE
  recursoId  String
  ip         String?
  timestamp  DateTime @default(now())
  @@index([consultorioId, recursoId])
  @@index([userId, timestamp])
  @@schema("consultorio")
}
```

- Registro automático vía un helper `logAcceso(ctx, accion, recursoTipo, recursoId)` llamado en los repositorios de lectura de HistoriaClinica, RecetaMedica y Paciente
- El logger de auditoría es no-bloqueante (fire-and-forget) para no penalizar latencia

**Rationale**: HIPAA requiere trazabilidad completa de accesos a PHI (Protected Health Information). La tabla separada permite queries de auditoría sin mezclar con datos operativos.  
**Alternatives considered**: Agregar a Pino logs estructurados — suficiente para debugging pero no permite queries de auditoría por recurso/usuario. Usar una tabla de audit genérica del módulo compartido — más complejo sin beneficio claro.

---

## Decision 7 — Violaciones de Artículo VI.2 (eventos desde capa de aplicación)

**Problema**: `CrearAtencionUseCase` y `CrearHistoriaUseCase` no inyectan ni emiten eventos via `IConsultorioNotificador`. Esto viola el Artículo VI.2 de la constitución.

**Decisión**: Corregir ambos use cases para recibir `IConsultorioNotificador` e invocar los eventos correspondientes (`atencionCambiada`, `historiaCreada`) después de cada operación.

- `CrearAtencionUseCase`: agregar `notificador` y emitir `atencionCambiada` post-creación
- `CrearHistoriaUseCase`: agregar `notificador` y emitir evento `historiaCreada` post-creación
- Agregar `historiaCreada` al contrato `IConsultorioNotificador` y sus implementaciones

**Rationale**: Cumplimiento constitucional obligatorio. Los eventos deben fluir desde la capa de aplicación para que estén disponibles independientemente del canal de entrada (REST, BullMQ, tests).

---

## Decision 8 — HcPerinatal / HcPerinatalControl (más allá de v1)

**Observación**: El schema prisma incluye `HcPerinatal` y `HcPerinatalControl` (formulario CLAP de obstetricia), que no están en el spec v1 (solo se mencionan odontología, pediatría, medicina general).

**Decisión**: Los modelos Prisma quedan en el schema. No se implementa capa de aplicación (use cases, adapters) para perinatal en este sprint. Se registra como feature fuera del alcance de v1 para implementación futura.

**Rationale**: Tener el schema listo no afecta el sprint actual. Implementar la capa de aplicación sin spec/clarification sería especular sobre requisitos.
