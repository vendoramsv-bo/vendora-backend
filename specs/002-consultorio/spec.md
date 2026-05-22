# Feature Spec: Módulo de Consultorio Médico

## Overview

Construir el módulo de consultorio médico, disponible solo para tenants con la
capacidad de consultorio activada (`esConsultorio = true`).

## User Stories

### US1 [P1] — Perfil de Consultorio
El consultorio define sus especialidades, número de registro y datos de identificación.

**Criterios de aceptación:**
- Un tenant con `esConsultorio=true` puede crear y editar su PerfilConsultorio
- El perfil almacena nombre, especialidades, número de registro, dirección, teléfono, email, logo
- Solo el PROPIETARIO o admin puede modificar el perfil
- Endpoint: `GET/PUT /api/consultorio/perfil`

---

### US2 [P1] — Gestión de Médicos
Los médicos son miembros del tenant con perfil extendido (especialidad, matrícula, biografía, foto) y horarios de atención por día y franja horaria.

**Criterios de aceptación:**
- Crear/editar/listar/eliminar perfiles de médico asociados a usuarios miembros del tenant
- Cada médico tiene: especialidad, matrícula profesional, biografía, URL foto, activo/inactivo
- Horarios de atención: día de la semana, hora inicio, hora fin, duración slot (minutos)
- Solo el PROPIETARIO/admin puede crear/editar médicos
- Endpoints: `GET/POST /api/consultorio/medicos`, `GET/PUT/DELETE /api/consultorio/medicos/:id`
- Endpoints: `GET/POST /api/consultorio/medicos/:id/horarios`, `DELETE /api/consultorio/medicos/:id/horarios/:horarioId`

---

### US3 [P1] — Gestión de Pacientes
Personas atendidas, con datos demográficos, tipo de sangre, alergias y datos de seguro médico.

**Criterios de aceptación:**
- Crear/editar/listar/buscar pacientes del consultorio
- Datos: nombre, apellido, fecha nacimiento, sexo, DNI/documento, teléfono, email, dirección
- Datos clínicos: tipo de sangre, alergias (texto), datos de seguro médico (nombre aseguradora, número póliza)
- Búsqueda por nombre, apellido, DNI
- Listados parametrizables (paginación, orden)
- Endpoints: `GET/POST /api/consultorio/pacientes`, `GET/PUT /api/consultorio/pacientes/:id`

---

### US4 [P1] — Catálogo de Servicios Médicos
Catálogo de prestaciones (consulta, radiografía, etc.) con duración y precio base.

**Criterios de aceptación:**
- CRUD de servicios médicos del consultorio
- Campos: nombre, descripción, duración (minutos), precio base, activo/inactivo
- Solo PROPIETARIO/admin puede crear/editar
- Endpoints: `GET/POST /api/consultorio/servicios`, `GET/PUT/DELETE /api/consultorio/servicios/:id`

---

### US5 [P1] — Gestión de Citas
Se agenda una cita entre paciente y médico para una fecha/hora. Se valida que el médico no tenga otra cita solapada. Una cita pendiente se puede confirmar (solo si es futura) o cancelar (solo si no fue atendida). Se envían recordatorios por email/SMS/WhatsApp.

**Estados:** `pendiente` → `confirmada` → `atendida` | `cancelada` | `no_asistio`

**Criterios de aceptación:**
- Crear cita: valida solapamiento de horario del médico
- Confirmar: solo si estado=pendiente y fechaHora es futura
- Cancelar: solo si estado != atendida
- Marcar como atendida / no_asistio
- Recordatorios: email al paciente y médico (Resend); SMS/WhatsApp como stub extensible
- Eventos en tiempo real: `cita:creada`, `cita:estadoCambiado` a todos los conectados del tenant
- Listados: por médico, por paciente, por fecha, por estado; paginados
- Endpoints: `GET/POST /api/consultorio/citas`, `GET/PATCH /api/consultorio/citas/:id`
- Endpoints: `POST /api/consultorio/citas/:id/confirmar`, `POST /api/consultorio/citas/:id/cancelar`, `POST /api/consultorio/citas/:id/atendida`, `POST /api/consultorio/citas/:id/no-asistio`

---

### US6 [P2] — Historia Clínica
Cada consulta genera una historia clínica con motivo, diagnóstico, tratamiento y observaciones. Según la especialidad tiene extensiones. Se adjuntan archivos y se registran vacunaciones.

**Extensiones por especialidad:**
- Odontología: odontograma por pieza dental (ExtensionOdontologica)
- Pediatría: peso, talla, percentiles de crecimiento (ExtensionPediatrica)
- Medicina general: signos vitales (ExtensionMedicinaGeneral + SignosVitales)

**Criterios de aceptación:**
- Crear historia clínica asociada a una cita (una historia por cita)
- Crear/editar extensión según especialidad del médico
- Registrar signos vitales (presión, temperatura, peso, talla, frecuencia cardíaca, saturación)
- Adjuntar archivos (ArchivoClinico): nombre, URL, tipo MIME, tamaño
- Registrar vacunaciones (Vacunacion): nombre vacuna, lote, fecha, próxima dosis
- Listado de historias por paciente
- Endpoints: `GET/POST /api/consultorio/historias`, `GET/PUT /api/consultorio/historias/:id`
- Endpoints: `POST /api/consultorio/historias/:id/archivos`, `POST /api/consultorio/historias/:id/vacunaciones`

---

### US7 [P2] — Atención Médica (Registro Económico)
El registro económico de la consulta (no es factura). Tiene médico, paciente, servicios/tratamientos con totales y pagos parciales. Al cobrar se enlaza con una venta del tenant (caja unificada).

**Criterios de aceptación:**
- Crear atención médica vinculada a una historia clínica o cita
- AtencionDetalle: servicioId, descripción libre, tipo tratamiento, cantidad, precio unitario, descuento, subtotal
- AtencionPago: monto, método de pago, fecha; puede ser parcial
- Estado: `pendiente` → `pagado_parcial` → `pagado` | `anulado`
- Al completar pago → crear venta en módulo de ventas (hook/evento, stub extensible)
- Emitir evento `atencion:estadoCambiado` en tiempo real
- Endpoints: `GET/POST /api/consultorio/atenciones`, `GET/PATCH /api/consultorio/atenciones/:id`
- Endpoints: `POST /api/consultorio/atenciones/:id/pagos`, `POST /api/consultorio/atenciones/:id/anular`

---

### US8 [P2] — Receta Médica
El médico prescribe medicamentos. Cada ítem puede referenciar un producto del catálogo o ser texto libre. La receta tiene posología, permite sustitución por genéricos, tiene vigencia y estados.

**Estados:** `emitida` → `parcial` | `despachada` | `vencida` | `anulada`

**Criterios de aceptación:**
- Crear receta vinculada a historia clínica o atención médica
- RecetaItem: medicamento (productoId o texto libre), dosis, frecuencia, duración, vía administración, indicaciones, permiteSustitucion
- Vigencia: fecha emisión + fecha vencimiento (default 30 días)
- Anular receta (estado → anulada)
- Emitir evento `receta:emitida` en tiempo real
- Endpoints: `GET/POST /api/consultorio/recetas`, `GET /api/consultorio/recetas/:id`
- Endpoints: `POST /api/consultorio/recetas/:id/anular`

---

## Cross-Cutting Requirements

- **Guard de tenant**: todo endpoint requiere `esConsultorio=true` en el tenant activo
- **Auditoría**: todos los registros principales almacenan `createdById` y `updatedById`
- **Listados parametrizables**: paginación (`take`, `skip`), ordenamiento, filtros via `QueryParams`
- **Eventos en tiempo real**: citas, atenciones y recetas emiten eventos Socket.IO a la sala `tenant:{id}`
- **Rate limiting**: heredado del servidor Hono
- **Validación**: Zod schemas en adapters, errores de dominio tipados
