# Research: Módulo de Consultorio Médico

## Decision 1 — Modelo de datos autoritativo (pre-existente)

**Decision:** Usar los modelos Prisma existentes en `prisma/60-consultorio.prisma` y `prisma/10-tenant.prisma` sin modificarlos.

**Rationale:** El usuario instruyó explícitamente que el modelo es autoritativo. Todos los repositorios y casos de uso se construyen sobre los modelos existentes.

**Key mapping (spec → Prisma):**
| Spec (usuario)       | Modelo Prisma real          | Schema PG     |
|---------------------|-----------------------------|---------------|
| PerfilConsultorio    | `Consultorio`               | `tenant`      |
| ServicioMedico       | `ServicioMedico`            | `consultorio` |
| Cita                 | `Cita`                      | `consultorio` |
| HistoriaClinica      | `HistoriaClinica`           | `consultorio` |
| Extensión Odonto     | `HcOdontologia`             | `consultorio` |
| Extensión Pediatría  | `HcPediatria`               | `consultorio` |
| Extensión Gral.      | `HcGeneral`                 | `consultorio` |
| ArchivoClinico       | `AdjuntoClinico`            | `consultorio` |
| RecetaItem           | `RecetaMedicaDetalle`       | `consultorio` |
| RecordatorioCita     | `RecordatorioCita`          | `consultorio` |
| HcPerinatal          | `HcPerinatal` + `HcPerinatalControl` | `consultorio` |

---

## Decision 2 — Solapamiento de citas (overlap check)

**Decision:** Validar solapamiento con una query Prisma antes de crear la cita:

```typescript
// Para médico + fecha nueva: detectar solapamiento
const inicio = fechaHora
const fin = new Date(fechaHora.getTime() + duracionMin * 60_000)

await prisma.cita.findFirst({
  where: {
    medicoId,
    estado: { notIn: ["CANCELADA", "NO_ASISTIO"] },
    AND: [
      { fechaHora: { lt: fin } },
      { fechaHoraFin: { gt: inicio } },  // fechaHoraFin = fechaHora + duracionMin
    ],
  },
})
```

**Nota:** El modelo `Cita` no tiene `fechaHoraFin`; se calcula en la query como `fechaHora + duracionMin * 60s` usando comparación de rangos con `fechaHora` y derivando el fin con suma aritmética. En Prisma se puede hacer con `gte`/`lte` sobre `fechaHora` con el rango calculado en app:

```typescript
// Solapamiento: la nueva [inicio, fin) se superpone con existente [e.fechaHora, e.fechaHora + e.duracionMin)
// Condición: inicio < e.fin Y fin > e.inicio
// Equivalente: inicio < (e.fechaHora + e.duracionMin * 60s) Y fin > e.fechaHora
// Simplificación práctica: buscar citas del médico en rango ±duracion alrededor de fechaHora

await prisma.cita.findFirst({
  where: {
    medicoId,
    consultorioId,
    estado: { notIn: ["CANCELADA", "NO_ASISTIO"] },
    fechaHora: {
      gte: new Date(inicio.getTime() - MAX_DURACION_MS),
      lt:  fin,
    },
  },
})
// Luego filtrar en JS: cita.fechaHora.getTime() + cita.duracionMin * 60_000 > inicio.getTime()
```

**Rationale:** Prisma no soporta expresiones aritméticas en `where` (no hay `col + expr`). La estrategia es acotar el rango con la duración máxima razonable (p.ej. 240 min) y validar la superposición exacta en memoria.

---

## Decision 3 — Recordatorios de citas (email/SMS/WhatsApp)

**Decision:** Email via Resend (inmediato al crear/confirmar), SMS y WhatsApp como stubs BullMQ.

**Rationale:** Resend ya está en el stack (Art. I). SMS y WhatsApp requieren proveedor externo (Twilio, etc.) no definido todavía. Se crea un job BullMQ `recordatorio-cita` que el sistema encola al crear/confirmar; el worker del job envía email y marca SMS/WhatsApp como pendiente hasta configuración del proveedor.

**Implementación:**
- `RecordatorioCita` registra el canal y estado de envío (EMAIL, SMS, WHATSAPP).
- Al crear/confirmar una cita: `queue.add('recordatorio-cita', { citaId, canal: 'EMAIL' })`.
- Worker lee el job, envía email via Resend, escribe `RecordatorioCita` con estadoEnvio=ENVIADO.
- SMS/WhatsApp: stub que crea el `RecordatorioCita` con estadoEnvio=PENDIENTE (extensible).

**Nota:** BullMQ es obligatorio por Art. I. El worker se implementa en `src/workers/recordatorio-cita.worker.ts`.

---

## Decision 4 — Guard de capability esConsultorio

**Decision:** Middleware Hono `requireConsultorio` que verifica `session.tenant.esConsultorio === true` y que el `Consultorio` del tenant esté creado.

**Implementación:**
```typescript
// src/core/hono-context.ts — agregar junto a requireTenantActivo
export const requireConsultorio: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const session = c.get("session")
  if (!session?.session?.activeOrganizationId) {
    return c.json({ error: "SIN_TENANT_ACTIVO" }, 403)
  }
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.session.activeOrganizationId },
    select: { esConsultorio: true },
  })
  if (!tenant?.esConsultorio) {
    return c.json({ error: "CONSULTORIO_NO_HABILITADO" }, 403)
  }
  await next()
}
```

---

## Decision 5 — IConsultorioNotificador (puerto de eventos)

**Decision:** Crear `IConsultorioNotificador` con los métodos de evento del módulo consultorio, siguiendo el mismo patrón que `ITenantNotificador`.

**Eventos Socket.IO:**
| Puerto método                | Evento Socket.IO           | Sala               |
|-----------------------------|----------------------------|--------------------|
| `citaCreada(tenantId, cita)` | `consultorio:cita:creada`  | `tenant:{id}`      |
| `citaCambiada(tenantId, cita)` | `consultorio:cita:estadoCambiado` | `tenant:{id}` |
| `atencionCambiada(tenantId, atencion)` | `consultorio:atencion:estadoCambiado` | `tenant:{id}` |
| `recetaEmitida(tenantId, receta)` | `consultorio:receta:emitida` | `tenant:{id}` |

---

## Decision 6 — Número de receta (autoincrement legible)

**Decision:** Generar `numeroReceta` como `REC-{AÑO}-{SECUENCIAL}` usando un contador por consultorio.

**Implementación:** No hay un modelo de secuencia en el schema. Usar `$queryRaw` para obtener el máximo actual y construir el siguiente:

```typescript
const maxReceta = await prisma.recetaMedica.findFirst({
  where: { consultorioId },
  orderBy: { createdAt: 'desc' },
  select: { numeroReceta: true },
})
const year = new Date().getFullYear()
const seq = maxReceta
  ? parseInt(maxReceta.numeroReceta.split('-')[2] || '0') + 1
  : 1
const numeroReceta = `REC-${year}-${String(seq).padStart(5, '0')}`
```

**Rationale:** Simple y sin dependencias adicionales. Riesgo de duplicado en concurrencia alta es mínimo para un consultorio médico; si se necesita atomicidad en el futuro, usar una secuencia PostgreSQL.

---

## Decision 7 — Auditoría: createdById / updatedById

**Decision:** Usar `withAudit(data, userId)` de `core/prisma-scoped.ts` en todos los `create` y `update` de entidades auditadas.

**Rationale:** El patrón ya existe en el módulo de tenant. Los 14 modelos auditados en consultorio son: `Consultorio`, `Medico`, `Paciente`, `ServicioMedico`, `Cita`, `HistoriaClinica`, `AtencionMedica`, `RecetaMedica` (8 principales). Modelos de detalle (`AtencionDetalle`, `AtencionPago`, `RecordatorioCita`, `AdjuntoClinico`, `Vacunacion`, `RecetaMedicaDetalle`) no se auditan.

---

## Decision 8 — Vacunaciones vinculadas a Paciente (no a HistoriaClinica)

**Decision:** Las vacunaciones (`Vacunacion`) están directamente bajo `Paciente`, no bajo `HistoriaClinica` (tal como está en el schema Prisma).

**Rationale:** Refleja la realidad clínica: el historial de vacunas es del paciente, no de una consulta específica. El endpoint es `GET/POST /api/consultorio/pacientes/:id/vacunaciones`.

---

## Decision 9 — Roles del módulo consultorio

**Decision:** Roles según Artículo VII.2 de la constitución: `PROPIETARIO|ADMIN|MEDICO|RECEPCIONISTA`.

| Rol            | Puede hacer                                              |
|----------------|----------------------------------------------------------|
| PROPIETARIO    | Todo                                                     |
| ADMIN          | Gestionar médicos, pacientes, servicios, citas, horarios |
| MEDICO         | Sus propias citas, crear/editar historias y recetas      |
| RECEPCIONISTA  | Gestionar citas, registrar pagos, datos de pacientes     |

---

## Decision 10 — Extensión Perinatal

**Decision:** `HcPerinatal` + `HcPerinatalControl` existen en el schema. Se incluyen en la API como extensión adicional (US6) junto a odontología, pediatría y medicina general.

**Rationale:** El modelo ya está definido y es significativamente rico (formulario CLAP/OPS). Se expone vía `POST /api/consultorio/historias/:id/perinatal` y `POST /api/consultorio/historias/:id/perinatal/controles`.
