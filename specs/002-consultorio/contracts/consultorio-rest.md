# REST API Contract: Módulo Consultorio

## Base path: `/api/consultorio`

**Auth:** Todos los endpoints requieren sesión activa (`requireAuth`).  
**Tenant:** Todos requieren tenant activo (`requireTenantActivo`).  
**Guard:** Todos requieren `esConsultorio=true` (`requireConsultorio`).  
**Paginación:** Listas aceptan `?take=20&skip=0&orderBy=createdAt&order=desc&search=...`.

---

## US1 — Perfil de Consultorio

### GET /api/consultorio/perfil
Obtiene el perfil del consultorio del tenant activo.

**Response 200:**
```json
{
  "id": "cuid",
  "tenantId": "cuid",
  "especialidades": ["ODONTOLOGIA", "MEDICINA_GENERAL"],
  "nroRegistro": "SEDAG-0001",
  "estado": "ACTIVO",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```
**Response 404:** `{ "error": "CONSULTORIO_NO_ENCONTRADO" }` — si el tenant aún no creó su perfil.

---

### PUT /api/consultorio/perfil
Crea o actualiza el perfil del consultorio. Solo PROPIETARIO/ADMIN.

**Request body:**
```json
{
  "especialidades": ["ODONTOLOGIA"],
  "nroRegistro": "SEDAG-0001"
}
```

**Response 200:** perfil actualizado (mismo shape que GET).
**Response 403:** `{ "error": "PERMISO_DENEGADO" }` — si no tiene rol suficiente.

---

## US2 — Médicos

### GET /api/consultorio/medicos
Lista médicos del consultorio. Paginado.

**Query params adicionales:** `?estado=ACTIVO`

**Response 200:**
```json
{
  "data": [{
    "id": "cuid",
    "memberId": "cuid",
    "especialidad": "ODONTOLOGIA",
    "nroRegistro": "MP-12345",
    "bio": "...",
    "fotoUrl": "https://...",
    "estado": "ACTIVO",
    "horariosAtencion": []
  }],
  "meta": { "take": 20, "total": 5, "hasMore": false }
}
```

---

### POST /api/consultorio/medicos
Crea perfil de médico para un miembro del tenant. Solo PROPIETARIO/ADMIN.

**Request body:**
```json
{
  "memberId": "cuid",
  "especialidad": "ODONTOLOGIA",
  "nroRegistro": "MP-12345",
  "bio": "Odontólogo con 10 años de experiencia",
  "fotoUrl": "https://..."
}
```

**Response 201:** médico creado.
**Response 409:** `{ "error": "MEDICO_YA_EXISTE" }` — si el miembro ya tiene perfil de médico.

---

### GET /api/consultorio/medicos/:id
Obtiene médico por ID con sus horarios.

**Response 200:** médico con `horariosAtencion[]`.
**Response 404:** `{ "error": "MEDICO_NO_ENCONTRADO" }`.

---

### PUT /api/consultorio/medicos/:id
Actualiza perfil de médico. Solo PROPIETARIO/ADMIN.

**Request body:** campos opcionales: `especialidad`, `nroRegistro`, `bio`, `fotoUrl`, `estado`.

**Response 200:** médico actualizado.

---

### DELETE /api/consultorio/medicos/:id
Desactiva (soft delete) el perfil de médico. Solo PROPIETARIO/ADMIN.

**Response 204:** sin contenido.
**Response 409:** `{ "error": "MEDICO_TIENE_CITAS_PENDIENTES" }`.

---

### GET /api/consultorio/medicos/:id/horarios
Lista horarios de atención del médico.

**Response 200:** `{ "data": [{ "id", "diaSemana", "horaInicio", "horaFin", "activo" }] }`

---

### POST /api/consultorio/medicos/:id/horarios
Agrega un horario de atención.

**Request body:**
```json
{ "diaSemana": 1, "horaInicio": "08:00", "horaFin": "12:00" }
```

**Response 201:** horario creado.
**Response 409:** `{ "error": "HORARIO_DUPLICADO" }`.

---

### DELETE /api/consultorio/medicos/:id/horarios/:horarioId
Elimina un horario de atención.

**Response 204:** sin contenido.

---

## US3 — Pacientes

### GET /api/consultorio/pacientes
Lista pacientes del consultorio. Paginado.

**Query params adicionales:** `?search=apellido` (busca en nombre, apellido, DNI).

**Response 200:**
```json
{
  "data": [{
    "id": "cuid",
    "nombre": "María",
    "apellido": "García",
    "fechaNacimiento": "1990-05-15",
    "genero": "F",
    "telefono": "+591...",
    "email": "...",
    "tipoSangre": "O+",
    "estado": "ACTIVO"
  }],
  "meta": { "take": 20, "total": 150, "hasMore": true }
}
```

---

### POST /api/consultorio/pacientes
Registra un nuevo paciente.

**Request body:**
```json
{
  "nombre": "María",
  "apellido": "García",
  "fechaNacimiento": "1990-05-15",
  "genero": "F",
  "telefono": "+591...",
  "email": "m.garcia@email.com",
  "tipoSangre": "O+",
  "alergias": "Penicilina",
  "seguroNombre": "CNS",
  "seguroNumero": "123456"
}
```

**Response 201:** paciente creado.
**Response 409:** `{ "error": "PACIENTE_EMAIL_DUPLICADO" }`.

---

### GET /api/consultorio/pacientes/:id
Obtiene paciente con sus vacunaciones y últimas citas.

**Response 200:** paciente con `vacunaciones[]`, `citasRecientes[]`.

---

### PUT /api/consultorio/pacientes/:id
Actualiza datos del paciente.

**Response 200:** paciente actualizado.

---

### GET /api/consultorio/pacientes/:id/vacunaciones
Lista vacunaciones del paciente.

**Response 200:** `{ "data": [{ "id", "vacuna", "dosis", "fechaAplicacion", "proximaDosis", "lote" }] }`

---

### POST /api/consultorio/pacientes/:id/vacunaciones
Registra una vacunación.

**Request body:**
```json
{
  "vacuna": "Hepatitis B",
  "dosis": "2da dosis",
  "fechaAplicacion": "2026-05-22",
  "proximaDosis": "2026-11-22",
  "lote": "LOT-2026-001"
}
```

**Response 201:** vacunación creada.

---

## US4 — Servicios Médicos

### GET /api/consultorio/servicios
Lista servicios del catálogo. Paginado.

**Response 200:**
```json
{
  "data": [{ "id", "nombre", "especialidad", "descripcion", "duracionMin", "precioBase", "estado" }],
  "meta": { "take": 20, "total": 10, "hasMore": false }
}
```

---

### POST /api/consultorio/servicios
Crea un servicio médico. Solo PROPIETARIO/ADMIN.

**Request body:**
```json
{
  "nombre": "Consulta general",
  "especialidad": "MEDICINA_GENERAL",
  "descripcion": "Consulta médica estándar",
  "duracionMin": 30,
  "precioBase": 150.00
}
```

**Response 201:** servicio creado.
**Response 409:** `{ "error": "SERVICIO_NOMBRE_DUPLICADO" }`.

---

### GET /api/consultorio/servicios/:id
Obtiene servicio por ID.

---

### PUT /api/consultorio/servicios/:id
Actualiza servicio. Solo PROPIETARIO/ADMIN.

---

### DELETE /api/consultorio/servicios/:id
Desactiva servicio (soft delete). Solo PROPIETARIO/ADMIN.

**Response 409:** `{ "error": "SERVICIO_EN_USO" }` — si tiene citas o atenciones activas.

---

## US5 — Citas

### GET /api/consultorio/citas
Lista citas. Paginado.

**Query params:** `?medicoId=...&pacienteId=...&estado=PENDIENTE&fechaDesde=ISO&fechaHasta=ISO`

**Response 200:**
```json
{
  "data": [{
    "id": "cuid",
    "paciente": { "id", "nombre", "apellido", "telefono" },
    "medico": { "id", "especialidad" },
    "servicio": { "id", "nombre" },
    "fechaHora": "ISO8601",
    "duracionMin": 30,
    "estado": "PENDIENTE",
    "motivo": "...",
    "canalOrigen": "WEB"
  }],
  "meta": { "take": 20, "total": 45, "hasMore": true }
}
```

---

### POST /api/consultorio/citas
Agenda una nueva cita. Valida solapamiento de médico.

**Request body:**
```json
{
  "pacienteId": "cuid",
  "medicoId": "cuid",
  "servicioId": "cuid",
  "fechaHora": "2026-06-01T09:00:00Z",
  "duracionMin": 30,
  "motivo": "Dolor molar",
  "canalOrigen": "WEB"
}
```

**Response 201:** cita creada. Encola recordatorio email.
**Response 409:** `{ "error": "CITA_SOLAPADA" }` — si el médico tiene otra cita en ese horario.
**Response 404:** `{ "error": "MEDICO_NO_ENCONTRADO" }` / `{ "error": "PACIENTE_NO_ENCONTRADO" }`.

---

### GET /api/consultorio/citas/:id
Obtiene cita con detalle completo.

---

### POST /api/consultorio/citas/:id/confirmar
Confirma la cita. Solo si `estado=PENDIENTE` y `fechaHora > now()`.

**Response 200:** cita con `estado=CONFIRMADA`.
**Response 422:** `{ "error": "CITA_NO_CONFIRMABLE" }` — si la fecha ya pasó o no está pendiente.

---

### POST /api/consultorio/citas/:id/cancelar
Cancela la cita. Solo si `estado ≠ ATENDIDA`.

**Request body (opcional):** `{ "motivo": "El paciente no pudo asistir" }`

**Response 200:** cita con `estado=CANCELADA`.
**Response 422:** `{ "error": "CITA_YA_ATENDIDA" }`.

---

### POST /api/consultorio/citas/:id/atendida
Marca la cita como atendida.

**Response 200:** cita con `estado=ATENDIDA`.

---

### POST /api/consultorio/citas/:id/no-asistio
Marca la cita como no asistida.

**Response 200:** cita con `estado=NO_ASISTIO`.

---

## US6 — Historia Clínica

### GET /api/consultorio/historias
Lista historias clínicas. Paginado.

**Query params:** `?pacienteId=...&medicoId=...&especialidad=...`

---

### POST /api/consultorio/historias
Crea historia clínica.

**Request body:**
```json
{
  "pacienteId": "cuid",
  "medicoId": "cuid",
  "citaId": "cuid",
  "especialidad": "ODONTOLOGIA",
  "motivoConsulta": "Dolor en molar superior",
  "diagnostico": "Caries clase II",
  "tratamiento": "Obturación con resina"
}
```

**Response 201:** historia clínica creada.

---

### GET /api/consultorio/historias/:id
Obtiene historia clínica con todas sus extensiones, adjuntos.

---

### PUT /api/consultorio/historias/:id
Actualiza historia clínica.

---

### PUT /api/consultorio/historias/:id/odontologia
Crea o actualiza extensión de odontología.

**Request body:**
```json
{
  "odontograma": { "21": { "estado": "CARIES", "tratamiento": "OBTURACION" } },
  "procedimiento": "Obturación resina",
  "dienteNumero": "21",
  "estadoDiente": "POST_TRATAMIENTO"
}
```

---

### PUT /api/consultorio/historias/:id/pediatria
Crea o actualiza extensión de pediatría.

**Request body:**
```json
{
  "pesoKg": 12.5,
  "tallaCm": 85.0,
  "perimetroCefalico": 46.0,
  "percentilPeso": "P50",
  "percentilTalla": "P75",
  "desarrolloPsicomotor": "Normal para la edad"
}
```

---

### PUT /api/consultorio/historias/:id/general
Crea o actualiza extensión de medicina general (signos vitales).

**Request body:**
```json
{
  "presionArterial": "120/80",
  "temperatura": 36.5,
  "frecuenciaCardiaca": 72,
  "frecuenciaRespiratoria": 16,
  "saturacionO2": 98.0
}
```

---

### PUT /api/consultorio/historias/:id/perinatal
Crea o actualiza extensión perinatal (formulario CLAP).

---

### POST /api/consultorio/historias/:id/perinatal/controles
Agrega un control prenatal.

---

### POST /api/consultorio/historias/:id/adjuntos
Adjunta un archivo a la historia clínica.

**Request body:**
```json
{
  "tipo": "RADIOGRAFIA",
  "url": "https://r2.vendora.app/...",
  "nombreArchivo": "rx-molar-21.jpg"
}
```

**Response 201:** adjunto creado.

---

## US7 — Atención Médica

### GET /api/consultorio/atenciones
Lista atenciones médicas. Paginado.

**Query params:** `?medicoId=...&pacienteId=...&estado=EN_CURSO&estadoPago=PENDIENTE`

**Response 200:**
```json
{
  "data": [{
    "id": "cuid",
    "pacienteNombre": "María García",
    "medicoNombre": "Dr. López",
    "fechaAtencion": "ISO8601",
    "total": "250.00",
    "estadoPago": "PENDIENTE",
    "estado": "EN_CURSO"
  }],
  "meta": { ... }
}
```

---

### POST /api/consultorio/atenciones
Crea una atención médica.

**Request body:**
```json
{
  "pacienteId": "cuid",
  "medicoId": "cuid",
  "citaId": "cuid",
  "detalle": [{
    "servicioId": "cuid",
    "tipoTratamiento": "OBTURACION",
    "descripcionTratamiento": "Obturación resina compuesta",
    "referenciaClin": "Diente 21",
    "cantidad": 1,
    "precioUnitario": 200.00,
    "descuento": 0
  }],
  "observaciones": "Paciente con sensibilidad"
}
```

**Response 201:** atención creada con `subtotal`, `total` calculados.

---

### GET /api/consultorio/atenciones/:id
Obtiene atención con detalle y pagos.

---

### PATCH /api/consultorio/atenciones/:id
Actualiza observaciones u otros campos editables.

---

### POST /api/consultorio/atenciones/:id/pagos
Registra un pago (parcial o total).

**Request body:**
```json
{
  "monto": 100.00,
  "metodo": "EFECTIVO",
  "referencia": null,
  "nota": "Abono inicial"
}
```

**Response 200:** atención con `estadoPago` actualizado (PARCIAL o PAGADO).
**Response 422:** `{ "error": "PAGO_EXCEDE_TOTAL" }` — si monto > saldo pendiente.

---

### POST /api/consultorio/atenciones/:id/anular
Anula la atención. Solo si `estadoPago ≠ PAGADO`.

**Response 200:** atención con `estado=ANULADA`.

---

## US8 — Receta Médica

### GET /api/consultorio/recetas
Lista recetas. Paginado.

**Query params:** `?medicoId=...&pacienteId=...&estado=EMITIDA`

---

### POST /api/consultorio/recetas
Emite una receta médica.

**Request body:**
```json
{
  "atencionId": "cuid",
  "indicacionesGenerales": "Tomar con alimentos, evitar alcohol",
  "diagnosticoCie10": "J00",
  "fechaVencimiento": "2026-06-21",
  "detalle": [{
    "medicamento": "Paracetamol 500mg comprimidos",
    "principioActivo": "Paracetamol",
    "dosis": "1 comprimido",
    "frecuencia": "Cada 8 horas",
    "duracion": "Por 5 días",
    "via": "ORAL",
    "cantidadPrescrita": 15,
    "indicaciones": "Tomar con agua",
    "permiteSustitucion": true,
    "productoId": null
  }]
}
```

**Response 201:** receta emitida con `numeroReceta` generado.

---

### GET /api/consultorio/recetas/:id
Obtiene receta con detalle completo.

---

### POST /api/consultorio/recetas/:id/anular
Anula la receta. Solo si `estado ≠ DESPACHADA`.

**Response 200:** receta con `estado=ANULADA`.
**Response 422:** `{ "error": "RECETA_DESPACHADA" }`.

---

## Códigos de error de dominio

| Código                      | HTTP | Descripción                               |
|-----------------------------|------|-------------------------------------------|
| CONSULTORIO_NO_HABILITADO   | 403  | El tenant no tiene esConsultorio=true     |
| CONSULTORIO_NO_ENCONTRADO   | 404  | No existe perfil de consultorio           |
| MEDICO_NO_ENCONTRADO        | 404  |                                           |
| MEDICO_YA_EXISTE            | 409  | El miembro ya tiene perfil de médico      |
| MEDICO_TIENE_CITAS_PENDIENTES | 409 | No se puede desactivar                   |
| PACIENTE_NO_ENCONTRADO      | 404  |                                           |
| PACIENTE_EMAIL_DUPLICADO    | 409  |                                           |
| HORARIO_DUPLICADO           | 409  |                                           |
| SERVICIO_NO_ENCONTRADO      | 404  |                                           |
| SERVICIO_NOMBRE_DUPLICADO   | 409  |                                           |
| SERVICIO_EN_USO             | 409  |                                           |
| CITA_NO_ENCONTRADA          | 404  |                                           |
| CITA_SOLAPADA               | 409  | El médico ya tiene cita en ese horario    |
| CITA_NO_CONFIRMABLE         | 422  | Estado incorrecto o fecha pasada          |
| CITA_YA_ATENDIDA            | 422  |                                           |
| HISTORIA_NO_ENCONTRADA      | 404  |                                           |
| ATENCION_NO_ENCONTRADA      | 404  |                                           |
| PAGO_EXCEDE_TOTAL           | 422  | El pago supera el saldo pendiente         |
| ATENCION_YA_PAGADA          | 422  |                                           |
| RECETA_NO_ENCONTRADA        | 404  |                                           |
| RECETA_DESPACHADA           | 422  | No se puede anular una receta despachada  |
| PERMISO_DENEGADO            | 403  |                                           |
