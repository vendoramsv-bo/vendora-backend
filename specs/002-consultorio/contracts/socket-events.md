# Socket.IO Events Contract: Módulo Consultorio

## Sala: `tenant:{tenantId}`

Todos los eventos del módulo consultorio se emiten a la sala `tenant:{tenantId}`,
igual que los eventos del módulo tenant. Los clientes conectados al tenant reciben
todos los eventos en tiempo real.

---

## Eventos Server → Client

### `consultorio:cita:creada`
Emitido al crear una nueva cita.

**Payload:**
```typescript
{
  type: "consultorio:cita:creada"
  citaId: string
  medicoId: string
  pacienteId: string
  fechaHora: string   // ISO8601
  estado: string      // "PENDIENTE"
  tenantId: string
}
```

---

### `consultorio:cita:estadoCambiado`
Emitido al confirmar, cancelar, marcar como atendida o no_asistio una cita.

**Payload:**
```typescript
{
  type: "consultorio:cita:estadoCambiado"
  citaId: string
  medicoId: string
  pacienteId: string
  estadoAnterior: string
  estadoNuevo: string   // CONFIRMADA | CANCELADA | ATENDIDA | NO_ASISTIO
  tenantId: string
}
```

---

### `consultorio:atencion:estadoCambiado`
Emitido al registrar un pago (estadoPago cambia) o anular una atención.

**Payload:**
```typescript
{
  type: "consultorio:atencion:estadoCambiado"
  atencionId: string
  pacienteId: string
  medicoId: string
  estadoPago: string    // PENDIENTE | PARCIAL | PAGADO
  estado: string        // EN_CURSO | COMPLETADA | PAGADA | ANULADA
  total: string         // Decimal string
  tenantId: string
}
```

---

### `consultorio:receta:emitida`
Emitido al crear una nueva receta médica.

**Payload:**
```typescript
{
  type: "consultorio:receta:emitida"
  recetaId: string
  numeroReceta: string  // "REC-2026-00001"
  medicoId: string
  pacienteId: string
  atencionId: string
  tenantId: string
}
```

---

## Tipos TypeScript compartidos

Agregar a `ServerToClientEvents` (cuando se cree el paquete `@vendora/api-types`):

```typescript
interface ServerToClientEvents {
  // ... eventos existentes del módulo tenant ...
  "consultorio:cita:creada": (payload: CitaCreadaPayload) => void
  "consultorio:cita:estadoCambiado": (payload: CitaEstadoCambiadoPayload) => void
  "consultorio:atencion:estadoCambiado": (payload: AtencionEstadoCambiadoPayload) => void
  "consultorio:receta:emitida": (payload: RecetaEmitidaPayload) => void
}
```

---

## Notas de implementación

1. Los eventos se emiten desde la capa de aplicación (casos de uso) vía el puerto `IConsultorioNotificador`, conforme al Artículo VI.2 de la constitución.
2. La implementación `ConsultorioSocketNotificador` (en `infrastructure/`) recibe el `io: Server` y emite con `io.to("tenant:${tenantId}").emit(eventName, payload)`.
3. `NullConsultorioNotificador` se usa en tests y como fallback.
4. No se requieren sub-salas por ahora; si en el futuro se necesita notificar solo a la sala de espera o a un médico específico, se pueden agregar salas `tenant:{id}:consultorio:medico:{medicoId}`.
