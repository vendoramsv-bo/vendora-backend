# REST API Contract: Módulo de Consultorio Médico

**Base path**: `/consultorio`  
**Auth**: `requireAuth` + `requireTenantActivo` + `requireConsultorio` (guard: `esConsultorio`)  
**Roles**: `ADMIN` · `MEDICO` · `RECEPCIONISTA`  
**Notación de acceso**: `[R]` = RECEPCIONISTA/ADMIN · `[M]` = MEDICO/ADMIN · `[A]` = solo ADMIN

---

## 1. Perfil del Consultorio

| Method | Path | Rol | Descripción |
|--------|------|-----|-------------|
| `GET` | `/consultorio` | R, M | Obtener perfil del consultorio del tenant |
| `PUT` | `/consultorio` | A | Actualizar perfil (especialidades, nroRegistro, datos) |

### GET `/consultorio` — Response 200
```json
{
  "id": "string",
  "tenantId": "string",
  "especialidades": ["ODONTOLOGIA"],
  "nroRegistro": "string | null",
  "estado": "PENDIENTE | ACTIVO | INACTIVO",
  "updatedAt": "ISO8601 | null"
}
```

---

## 2. Médicos

| Method | Path | Rol | Descripción |
|--------|------|-----|-------------|
| `GET` | `/consultorio/medicos` | R, M | Listar médicos (parametrizable) |
| `POST` | `/consultorio/medicos` | A | Registrar médico |
| `GET` | `/consultorio/medicos/:id` | R, M | Obtener médico con horarios |
| `PUT` | `/consultorio/medicos/:id` | A | Actualizar perfil médico |
| `PUT` | `/consultorio/medicos/:id/horarios` | A | Reemplazar horarios de atención |

### POST `/consultorio/medicos` — Body
```json
{
  "memberId": "string (TenantMember con rol MEDICO)",
  "especialidad": "string",
  "nroRegistro": "string?",
  "bio": "string?",
  "fotoUrl": "string?"
}
```

### PUT `/consultorio/medicos/:id/horarios` — Body
```json
{
  "horarios": [
    { "diaSemana": 0, "horaInicio": "08:00", "horaFin": "12:00" }
  ]
}
```

---

## 3. Pacientes

| Method | Path | Rol | Descripción |
|--------|------|-----|-------------|
| `GET` | `/consultorio/pacientes` | R, M | Listar pacientes (parametrizable) |
| `POST` | `/consultorio/pacientes` | R | Registrar paciente |
| `GET` | `/consultorio/pacientes/:id` | R, M | Obtener paciente (genera audit log) |
| `PUT` | `/consultorio/pacientes/:id` | R | Actualizar paciente |
| `GET` | `/consultorio/pacientes/:id/expediente` | R, M | Expediente completo (historias + vacunaciones + recetas) |

### POST `/consultorio/pacientes` — Body
```json
{
  "dni": "string (único por tenant)",
  "nombre": "string",
  "apellido": "string",
  "fechaNacimiento": "ISO8601?",
  "genero": "string?",
  "telefono": "string?",
  "email": "string?",
  "direccion": "string?",
  "tipoSangre": "string?",
  "alergias": "string?",
  "seguroNombre": "string?",
  "seguroNumero": "string?",
  "canalNotificacion": "EMAIL | SMS | WHATSAPP | null"
}
```

**Error 409**: DNI ya registrado en el consultorio.

### Query params (listados)
Todos los listados aceptan el contrato uniforme de Artículo IV:
```
?take=20&skip=0&search=apellido&sortField=apellido&sortOrder=asc
&filter[field]=apellido&filter[op]=startsWith&filter[value]=García
```

---

## 4. Servicios Médicos

| Method | Path | Rol | Descripción |
|--------|------|-----|-------------|
| `GET` | `/consultorio/servicios` | R, M | Listar catálogo de servicios |
| `POST` | `/consultorio/servicios` | A | Crear servicio |
| `GET` | `/consultorio/servicios/:id` | R, M | Obtener servicio |
| `PUT` | `/consultorio/servicios/:id` | A | Actualizar servicio |
| `DELETE` | `/consultorio/servicios/:id` | A | Cambiar estado INACTIVO |

---

## 5. Citas

| Method | Path | Rol | Descripción |
|--------|------|-----|-------------|
| `GET` | `/consultorio/citas` | R, M | Listar citas (parametrizable) |
| `POST` | `/consultorio/citas` | R | Agendar cita |
| `GET` | `/consultorio/citas/:id` | R, M | Obtener cita |
| `POST` | `/consultorio/citas/:id/confirmar` | R | Confirmar cita (solo si futura) |
| `POST` | `/consultorio/citas/:id/cancelar` | R | Cancelar cita (solo si no atendida) |
| `POST` | `/consultorio/citas/:id/no-asistio` | R | Marcar como no asistió |

### POST `/consultorio/citas` — Body
```json
{
  "pacienteId": "string",
  "medicoId": "string",
  "servicioId": "string?",
  "fechaHora": "ISO8601",
  "duracionMin": 30,
  "motivo": "string?",
  "canalOrigen": "WEB | TELEFONO | PRESENCIAL",
  "notas": "string?"
}
```

**Error 409**: Médico tiene cita solapada.  
**Error 422**: Intento de confirmar cita con fecha pasada.  
**Error 422**: Intento de cancelar cita atendida.

### POST `/consultorio/citas/:id/confirmar` — Body
```json
{ "expectedUpdatedAt": "ISO8601 (bloqueo optimista)" }
```
**Error 409**: Conflicto de versión (otro usuario modificó la cita).

### Socket.IO eventos emitidos
```ts
// Al crear o cambiar estado de cita:
socket.to(`tenant:${tenantId}`).emit("consultorio:cita:changed", {
  citaId, medicoId, pacienteId, fechaHora, estado, tenantId
})
```

---

## 6. Historia Clínica

| Method | Path | Rol | Descripción |
|--------|------|-----|-------------|
| `GET` | `/consultorio/historias` | M | Listar historias del consultorio (audit) |
| `POST` | `/consultorio/historias` | M | Crear historia clínica |
| `GET` | `/consultorio/historias/:id` | M | Obtener historia con extensiones (audit) |
| `PUT` | `/consultorio/historias/:id` | M | Actualizar historia |
| `PUT` | `/consultorio/historias/:id/extension` | M | Upsert extensión (odontología/pediatría/general) |
| `POST` | `/consultorio/historias/:id/adjuntos` | M | Adjuntar archivo (URL de R2) |

### POST `/consultorio/historias` — Body
```json
{
  "pacienteId": "string",
  "medicoId": "string",
  "citaId": "string?",
  "especialidad": "ODONTOLOGIA | PEDIATRIA | MEDICINA_GENERAL | OTRO",
  "motivoConsulta": "string",
  "diagnostico": "string?",
  "tratamiento": "string?",
  "observaciones": "string?",
  "fecha": "ISO8601?"
}
```

**Nota**: Cada lectura de historia clínica genera un registro en `AuditoriaAcceso`.

### PUT `/consultorio/historias/:id` — Body (bloqueo optimista)
```json
{
  "diagnostico": "string?",
  "tratamiento": "string?",
  "observaciones": "string?",
  "expectedUpdatedAt": "ISO8601"
}
```
**Error 409**: Conflicto de versión.

---

## 7. Vacunaciones

| Method | Path | Rol | Descripción |
|--------|------|-----|-------------|
| `GET` | `/consultorio/pacientes/:pacienteId/vacunaciones` | R, M | Listar vacunaciones del paciente |
| `POST` | `/consultorio/pacientes/:pacienteId/vacunaciones` | M | Registrar vacunación |
| `DELETE` | `/consultorio/pacientes/:pacienteId/vacunaciones/:id` | M | Eliminar vacunación |

### POST `.../vacunaciones` — Body
```json
{
  "vacuna": "string",
  "dosis": "string?",
  "fechaAplicacion": "ISO8601",
  "proximaDosis": "ISO8601?",
  "medicoId": "string?",
  "lote": "string?"
}
```

---

## 8. Atención Médica

| Method | Path | Rol | Descripción |
|--------|------|-----|-------------|
| `GET` | `/consultorio/atenciones` | R, M | Listar atenciones (parametrizable) |
| `POST` | `/consultorio/atenciones` | R | Crear registro de atención |
| `GET` | `/consultorio/atenciones/:id` | R, M | Obtener atención con detalle y pagos |
| `POST` | `/consultorio/atenciones/:id/pagos` | R | Registrar pago (parcial o total) |
| `POST` | `/consultorio/atenciones/:id/anular` | R | Anular atención (solo si no PAGADA) |

### POST `/consultorio/atenciones` — Body
```json
{
  "pacienteId": "string",
  "medicoId": "string",
  "citaId": "string?",
  "tipoPago": "EFECTIVO | QR | TARJETA_CREDITO | ...",
  "observaciones": "string?",
  "detalle": [
    {
      "servicioId": "string",
      "tipoTratamiento": "CONSULTA | OBTURACION | ...",
      "descripcionTratamiento": "string?",
      "referenciaClin": "string?",
      "cantidad": 1,
      "precioUnitario": 150.00,
      "descuento": 0,
      "nota": "string?"
    }
  ]
}
```

### POST `/consultorio/atenciones/:id/pagos` — Body
```json
{
  "monto": 150.00,
  "metodo": "EFECTIVO | QR | ...",
  "referencia": "string?",
  "nota": "string?",
  // Contexto de caja — requerido cuando el pago completa el total (para generar venta)
  "aperturaCierreCajaId": "string?",
  "puntoVentaId": "string?",
  "turnoId": "string?"
}
```

**Comportamiento**: Cuando la suma de pagos ≥ total de la atención:
1. `estadoPago → PAGADO`, `estado → PAGADA`
2. Se crea una `Venta` en el módulo ventas con `referenciaTipo = "ATENCION_MEDICA"`

### Socket.IO eventos emitidos
```ts
socket.to(`tenant:${tenantId}`).emit("consultorio:atencion:changed", {
  atencionId, pacienteId, medicoId, estadoPago, estado, total, tenantId
})
```

---

## 9. Receta Médica

| Method | Path | Rol | Descripción |
|--------|------|-----|-------------|
| `GET` | `/consultorio/recetas` | R, M | Listar recetas (parametrizable) |
| `POST` | `/consultorio/recetas` | M | Emitir receta médica (genera audit log) |
| `GET` | `/consultorio/recetas/:id` | R, M | Obtener receta con detalle (audit) |
| `POST` | `/consultorio/recetas/:id/anular` | M | Anular receta |

### POST `/consultorio/recetas` — Body
```json
{
  "atencionId": "string",
  "pacienteId": "string",
  "medicoId": "string",
  "indicacionesGenerales": "string?",
  "diagnosticoCie10": "string?",
  "fechaVencimiento": "ISO8601?",
  "detalle": [
    {
      "productoId": "string? (null = texto libre)",
      "medicamento": "string",
      "principioActivo": "string?",
      "concentracion": "string?",
      "presentacion": "string?",
      "dosis": "string",
      "frecuencia": "string",
      "duracion": "string",
      "via": "ORAL | INTRAVENOSA | ...",
      "cantidadPrescrita": 1,
      "indicaciones": "string?",
      "permiteSustitucion": true
    }
  ]
}
```

### Socket.IO eventos emitidos
```ts
socket.to(`tenant:${tenantId}`).emit("consultorio:receta:changed", {
  recetaId, pacienteId, medicoId, estado, tenantId
})
```

---

## 10. Audit Log (solo lectura para ADMIN)

| Method | Path | Rol | Descripción |
|--------|------|-----|-------------|
| `GET` | `/consultorio/auditoria` | A | Listar accesos a datos médicos sensibles |

### GET `/consultorio/auditoria` — Response 200
```json
{
  "data": [
    {
      "id": "string",
      "userId": "string",
      "accion": "LEER_HISTORIA | LEER_RECETA | LEER_PACIENTE",
      "recursoTipo": "string",
      "recursoId": "string",
      "ip": "string?",
      "timestamp": "ISO8601"
    }
  ],
  "meta": { "take": 20, "total": 150, "hasMore": true, "nextCursor": "string?" }
}
```

---

## Respuesta de Error Estándar

```json
{
  "error": "CITA_SOLAPADA | DNI_YA_REGISTRADO | CONFLICTO_VERSION | ATENCION_YA_PAGADA | ...",
  "message": "string (human-readable)",
  "statusCode": 409
}
```

| Error de Dominio | HTTP |
|-----------------|------|
| `CitaSolapada` | 409 |
| `DNIYaRegistrado` | 409 |
| `ConflictoVersionError` | 409 |
| `AtencionYaPagada` | 422 |
| `PagoExcedeTotalError` | 422 |
| `ConsultorioNoEncontrado` | 404 |
| `CitaNoEncontrada` | 404 |

---

## Eventos Socket.IO — Contrato Completo

Todos los eventos se emiten a la sala `tenant:${tenantId}`:

```ts
interface ConsultorioServerToClientEvents {
  "consultorio:cita:changed": (payload: {
    citaId: string; medicoId: string; pacienteId: string;
    fechaHora: string; estado: string; tenantId: string
  }) => void

  "consultorio:atencion:changed": (payload: {
    atencionId: string; pacienteId: string; medicoId: string;
    estadoPago: string; estado: string; total: string; tenantId: string
  }) => void

  "consultorio:receta:changed": (payload: {
    recetaId: string; pacienteId: string; medicoId: string;
    estado: string; tenantId: string
  }) => void

  "consultorio:historia:created": (payload: {
    historiaId: string; pacienteId: string; medicoId: string;
    especialidad: string; tenantId: string
  }) => void
}
```
