# Research: TuConsultorio — Decisiones de Diseño

**Feature**: 015-tu-consultorio  
**Date**: 2026-06-05  
**Phase**: Plan (Phase 0 output)

---

## Decision 1: `Cita.pacienteId` — citas creadas por consumidores online

**Decision**: Hacer `pacienteId` nullable + agregar `consumerUserId String?` + agregar `origenOnline Boolean @default(false)`.

**Rationale**: El modelo `Cita` actual requiere `pacienteId` NOT NULL, pero un consumidor que agenda en línea NO es un `Paciente` registrado en el consultorio. Hacerlo nullable es la opción más limpia: no inventa un registro de paciente ficticio, no crea un modelo paralelo (lo que violaría la clarificación Q1 de la spec) y permite al staff "convertir" la cita online en una cita clínica completa asignando un `pacienteId` más adelante.

Se agrega `consumerUserId String?` (en lugar de depender de `createdById`) para:
- Permitir consultas directas de "mis citas" del consumidor sin ambigüedad
- Distinguir el caso "staff ingresó en nombre del consumidor" vs "consumidor agendó directamente"
- Indexar eficientemente `(consumerUserId, origenOnline)`

**Alternatives considered**:
- Auto-crear un `Paciente` mínimo desde el usuario consumidor: Rechazado — mezcla la identidad del paciente clínico con el usuario del sistema; el staff tendría registros de pacientes duplicados.
- Modelo separado `CitaOnline`: Rechazado explícitamente por la clarificación Q1 de la spec.
- Usar solo `createdById` para "mis citas": Rechazado — `createdById` es ambiguo (puede ser staff ingresando datos).

---

## Decision 2: Estado de citas — enum dedicado `EstadoCita`

**Decision**: Crear `EstadoCita` en `@@schema("consultorio")` en lugar de agregar `CANCELADA_CLIENTE` al enum genérico `Estado`.

**Rationale**: El enum genérico `Estado` en `20-compartido.prisma` es compartido por docenas de modelos. Agregar `CANCELADA_CLIENTE` lo contamina con semántica clínica específica. `EstadoCita` permite modelar exactamente los estados del ciclo de vida de una cita médica sin afectar otros módulos.

Estados: `PENDIENTE`, `CONFIRMADA`, `ATENDIDA`, `CANCELADA`, `CANCELADA_CLIENTE`, `RECHAZADA`, `NO_ASISTIO`.

**Migration note**: Cambiar `Cita.estado` de `Estado` a `EstadoCita` requiere una migración SQL que convierte los valores existentes. Dado que el estado actual del campo usa `Estado.PENDIENTE` y `Estado.ACTIVO` (valores que existen en ambos enums), la migración es un `ALTER TYPE ... RENAME VALUE` + cast de columna.

**Alternatives considered**:
- Agregar `CANCELADA_CLIENTE` a `Estado`: Rechazado — contamina el enum compartido con semántica específica de citas.
- Usar `String` (texto libre): Rechazado — pierde validación a nivel de base de datos.

---

## Decision 3: Campos públicos del Consultorio — extensión del modelo existente

**Decision**: Agregar campos de perfil público directamente al modelo `Consultorio` en `10-tenant.prisma`, siguiendo exactamente el patrón del modelo `Restaurante`.

**Rationale**: `Restaurante` ya tiene `horarios Json?`, `fotos String[]`, `contactoPublico Json?`. Replicar el mismo patrón en `Consultorio` mantiene consistencia arquitectónica y simplifica el desarrollo.

Campos a agregar:
- `horarios Json?` — `HorarioConsultorio[]` con `{ diaSemana: 0-6, horaInicio: "HH:MM", horaFin: "HH:MM", activo: boolean }`
- `contactoPublico Json?` — `{ telefono?, email?, redesSociales? }`
- `tipoServicio TipoServicioConsultorio @default(PRESENCIAL)` — enum nuevo en `60-consultorio.prisma`
- `fotos String[]` — URLs de fotos del local

No se crea un modelo `ConsultorioPerfil` separado porque el `Consultorio` es ya ese perfil (1-a-1 con Tenant).

**Alternatives considered**:
- Modelo `ConsultorioPerfil` separado (1-a-1): Rechazado — overhead innecesario; `Consultorio` es ya un perfil extendido del tenant.
- Usar los campos de `Tenant` (`descripcion`, `logo`): Los campos de descripción e identidad pública básica vienen del `Tenant`; solo se agregan los campos específicos del consultorio médico.

---

## Decision 4: Visibilidad de médicos y servicios — flags en modelos existentes

**Decision**: Agregar `visiblePublico Boolean @default(false)` a `Medico` y a `ServicioMedico`, más `mostrarPrecio Boolean @default(false)` a `ServicioMedico`.

**Rationale**: No se crea un catálogo público separado (assumption de la spec). Los flags de visibilidad son la forma más simple y directa de controlar qué aparece públicamente sin duplicar datos.

**Medico.visiblePublico**: cuando `true`, el médico aparece en el perfil público del consultorio.  
**ServicioMedico.visiblePublico**: cuando `true`, el servicio aparece en el catálogo público.  
**ServicioMedico.mostrarPrecio**: cuando `true`, se incluye `precioBase` en la respuesta pública.

**Alternatives considered**:
- Vista separada de servicios/médicos públicos: Rechazado — overhead de sincronización innecesario.

---

## Decision 5: Modelos sociales — patrón Consultorio* en `80-social.prisma`

**Decision**: 7 nuevos modelos en `80-social.prisma` (`@@schema("social")`), siguiendo el patrón `Restaurante*`.

Modelos:
1. `ConsultorioReaccion` — `@@unique([consultorioId, userId])`
2. `ConsultorioComentario` — árbol 2 niveles con auto-relación
3. `ConsultorioComentarioReaccion` — `@@unique([comentarioId, userId])`
4. `ConsultorioValoracion` — `@@unique([consultorioId, userId])`
5. `ConsultorioPregunta` — con `ConsultorioRespuesta[]`
6. `ConsultorioRespuesta`
7. `ConsultorioFavorito` — `@@unique([consultorioId, userId])`
8. `ConsultorioSeguidor` — `@@unique([consultorioId, userId])`

**Publicaciones**: Se reutiliza el modelo `Publicacion` existente (en `social` schema) ya con `tenantId`; no se agrega un campo `referenciaTipo` porque las publicaciones ya quedan implícitamente asociadas al consultorio por `tenantId` + el staff que publica.

**Alternatives considered**:
- Añadir `referenciaTipo` a `Publicacion`: Rechazado — complejidad innecesaria; el patrón TuRestaurante ya usa `tenantId` directamente sin `referenciaTipo`.

---

## Decision 6: Cálculo de disponibilidad de slots — algoritmo en memoria

**Decision**: Calcular disponibilidad de slots dinámicamente en el use case (`consultar-disponibilidad.usecase.ts`), sin persistir slots.

**Algorithm**:
1. Obtener `HorarioAtencion[]` del médico para los días del rango solicitado.
2. Obtener `Cita[]` del médico en el rango (estado ≠ CANCELADA, CANCELADA_CLIENTE, RECHAZADA).
3. Para cada día del rango: expandir el horario en slots de `duracionMin` minutos (del servicio seleccionado).
4. Filtrar slots que coincidan con citas existentes.
5. Devolver slots libres.

**Conflict detection**: Al crear una cita online, el use case vuelve a consultar citas existentes en el slot elegido (dentro de una transacción Prisma). Si hay conflicto, retorna error `SLOT_NO_DISPONIBLE`. Optimistic concurrency (sin locks explícitos) es suficiente para la escala inicial.

**Alternatives considered**:
- Tabla `SlotReservado` persiste cada slot: Rechazado — complejidad de sincronización; innecesario con la escala inicial.
- Optimistic locking con versión: Rechazado — la detección por consulta previa dentro de transacción es suficiente.

---

## Decision 7: Arquitectura de módulos — consultorio vs restaurante

**Decision**: El código de TuConsultorio se distribuye entre dos módulos existentes:
- `src/modules/consultorio/` → perfil público, directorio, servicios públicos, citas online
- `src/modules/social/` → interacciones sociales del consultorio (patrón idéntico a restaurante)

**Rationale**: Sigue exactamente el patrón de TuRestaurante (feature 013) que también distribuyó su lógica entre `modules/restaurante/` y `modules/social/`. Mantiene la coherencia arquitectónica del proyecto.

---

## Decision 8: Notificadores — provider pattern, dos nuevos notificadores

**Decision**: Crear `IConsultorioPublicoNotificador` (para citas online y eventos del perfil) e `IConsultorioSocialNotificador` (para eventos sociales), cada uno con su socket implementation + provider.

Rooms Socket.IO:
- `tenant:${tenantId}` — todos los eventos del tenant
- `tenant:${tenantId}:consultorio` — sub-room específico del consultorio

**Alternatives considered**:
- Reutilizar el `ConsultorioSocketNotificador` existente: Rechazado — el notificador existente es para el módulo clínico interno (citas internas, recordatorios). Mezclar eventos públicos con internos complica el control de acceso.
