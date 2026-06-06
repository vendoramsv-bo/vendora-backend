# Data Model: TuConsultorio — Cambios de Schema Prisma

**Feature**: 015-tu-consultorio  
**Date**: 2026-06-05  
**Phase**: Plan (Phase 1 output)

---

## Resumen de cambios

| Archivo | Tipo | Detalle |
|---------|------|---------|
| `prisma/10-tenant.prisma` | MODIFICAR | `Consultorio`: agregar 4 campos + 8 relaciones sociales |
| `prisma/60-consultorio.prisma` | MODIFICAR | `Medico`: agregar `visiblePublico`; `ServicioMedico`: agregar `visiblePublico` + `mostrarPrecio`; `Cita`: hacer `pacienteId` nullable, agregar `origenOnline` + `consumerUserId` |
| `prisma/60-consultorio.prisma` | NUEVO | Enum `EstadoCita` (reemplaza `Estado` en `Cita.estado`) |
| `prisma/60-consultorio.prisma` | NUEVO | Enum `TipoServicioConsultorio` |
| `prisma/80-social.prisma` | NUEVO | 7 modelos `Consultorio*` sociales |

Total: **9 cambios de modelos existentes** + **7 modelos nuevos** + **2 enums nuevos**

---

## `prisma/10-tenant.prisma` — Modificar `Consultorio`

```prisma
model Consultorio {
  id          String    @id @default(cuid())
  tenantId    String    @unique
  tenant      Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  // Configuración clínica
  especialidades String[]  // ["ODONTOLOGIA","PEDIATRIA","MEDICINA_GENERAL"]
  nroRegistro    String?   // número de habilitación del establecimiento
  estado         Estado    @default(PENDIENTE)

  // ── NUEVOS: Perfil público ──────────────────────────────────────────────────
  horarios        Json?     // HorarioConsultorio[] — { diaSemana: 0-6, horaInicio: "HH:MM", horaFin: "HH:MM", activo: true }
  contactoPublico Json?     // ContactoPublico — { telefono?, email?, redesSociales?: { nombre, url }[] }
  tipoServicio    TipoServicioConsultorio @default(PRESENCIAL)
  fotos           String[]  // URLs de fotos del consultorio
  // ───────────────────────────────────────────────────────────────────────────

  createdAt      DateTime  @default(now())
  updatedAt      DateTime? @updatedAt
  createdById    String?
  updatedById    String?

  // Relaciones clínicas
  medicos          Medico[]
  pacientes        Paciente[]
  citas            Cita[]
  serviciosMedicos ServicioMedico[]
  atencionesMedicas AtencionMedica[]
  recetasMedicas    RecetaMedica[]

  // ── NUEVAS: Relaciones sociales del perfil público ──────────────────────────
  reacciones    ConsultorioReaccion[]
  comentarios   ConsultorioComentario[]
  valoraciones  ConsultorioValoracion[]
  preguntas     ConsultorioPregunta[]
  favoritos     ConsultorioFavorito[]
  seguidores    ConsultorioSeguidor[]
  // ───────────────────────────────────────────────────────────────────────────

  @@schema("tenant")
}
```

---

## `prisma/60-consultorio.prisma` — Modificar modelos existentes

### `Medico` — agregar `visiblePublico`

```prisma
model Medico {
  // ... campos existentes sin cambios ...
  visiblePublico Boolean @default(false)   // ← NUEVO
  // ... relaciones existentes sin cambios ...
}
```

### `ServicioMedico` — agregar `visiblePublico` + `mostrarPrecio`

```prisma
model ServicioMedico {
  // ... campos existentes sin cambios ...
  visiblePublico Boolean @default(false)   // ← NUEVO
  mostrarPrecio  Boolean @default(false)   // ← NUEVO — si false, precioBase no se expone en endpoints públicos
  // ... relaciones existentes sin cambios ...
}
```

### `Cita` — nullable `pacienteId`, nuevo `origenOnline`, nuevo `consumerUserId`, cambio de enum

```prisma
model Cita {
  id             String      @id @default(cuid())
  consultorioId  String
  consultorio    Consultorio @relation(fields: [consultorioId], references: [id], onDelete: Cascade)

  // ── CAMBIADO: pacienteId ahora nullable (null cuando origenOnline=true) ──
  pacienteId     String?
  paciente       Paciente?   @relation(fields: [pacienteId], references: [id], onDelete: Cascade)
  // ── NUEVOS ────────────────────────────────────────────────────────────────
  consumerUserId String?     // userId del consumidor que agendó en línea; null para citas internas
  origenOnline   Boolean     @default(false)
  // ─────────────────────────────────────────────────────────────────────────

  medicoId       String
  medico         Medico      @relation(fields: [medicoId], references: [id], onDelete: Cascade)
  servicioId     String?
  servicio       ServicioMedico? @relation(fields: [servicioId], references: [id], onDelete: SetNull)
  fechaHora      DateTime
  duracionMin    Int         @default(30)

  // ── CAMBIADO: Estado -> EstadoCita (incluye CANCELADA_CLIENTE) ────────────
  estado         EstadoCita  @default(PENDIENTE)
  // ─────────────────────────────────────────────────────────────────────────

  motivo         String?
  canalOrigen    String?     // WEB, TELEFONO, PRESENCIAL
  notas          String?
  createdAt      DateTime    @default(now())
  updatedAt      DateTime?   @updatedAt
  createdById    String?
  updatedById    String?

  recordatorios    RecordatorioCita[]
  historiaClinica  HistoriaClinica?
  atencionMedica   AtencionMedica?

  @@index([consultorioId, medicoId, fechaHora])
  @@index([consultorioId, pacienteId])
  @@index([consumerUserId, origenOnline])   // ← NUEVO índice para "mis citas"
  @@schema("consultorio")
}
```

---

## `prisma/60-consultorio.prisma` — Nuevos enums

```prisma
// ── NUEVO ──────────────────────────────────────────────────────────────────────
enum EstadoCita {
  PENDIENTE          // cita creada, esperando confirmación del staff
  CONFIRMADA         // staff confirmó la cita
  ATENDIDA           // paciente fue atendido
  CANCELADA          // cancelada por el staff o admin
  CANCELADA_CLIENTE  // cancelada por el consumidor online (solo origenOnline=true)
  RECHAZADA          // staff rechazó la solicitud online
  NO_ASISTIO         // el paciente/consumidor no se presentó
  @@schema("consultorio")
}

// ── NUEVO ──────────────────────────────────────────────────────────────────────
enum TipoServicioConsultorio {
  PRESENCIAL
  TELECONSULTA
  AMBOS
  @@schema("consultorio")
}
```

**Nota de migración**: El campo `Cita.estado` pasa de tipo `Estado` (schema `compartido`) a `EstadoCita` (schema `consultorio`). La migración SQL debe hacer un `ALTER COLUMN` con CAST. Los valores existentes mapeables son: `Estado.PENDIENTE → EstadoCita.PENDIENTE`, `Estado.CONFIRMADA → EstadoCita.CONFIRMADA`, `Estado.ACTIVO → EstadoCita.PENDIENTE` (fallback). Los estados sin correspondencia directa deben revisarse caso por caso.

---

## `prisma/80-social.prisma` — 7 nuevos modelos Consultorio*

```prisma
// ─── Consultorio social models ─────────────────────────────────────────────────

model ConsultorioReaccion {
  id            String      @id @default(cuid())
  consultorioId String
  consultorio   Consultorio @relation(fields: [consultorioId], references: [id], onDelete: Cascade)
  userId        String
  user          User        @relation("reaccionesConsultorio", fields: [userId], references: [id], onDelete: Cascade)
  tipo          TipoReaccion
  createdAt     DateTime    @default(now())

  @@unique([consultorioId, userId])
  @@index([consultorioId])
  @@index([userId])
  @@schema("social")
}

model ConsultorioComentario {
  id            String                            @id @default(cuid())
  consultorioId String
  consultorio   Consultorio                       @relation(fields: [consultorioId], references: [id], onDelete: Cascade)
  userId        String
  user          User                              @relation("comentariosConsultorio", fields: [userId], references: [id], onDelete: Cascade)
  contenido     String
  editado       Boolean                           @default(false)
  estado        Estado                            @default(ACTIVO)
  padreId       String?
  padre         ConsultorioComentario?            @relation("ComentarioConsultorioRespuestas", fields: [padreId], references: [id])
  respuestas    ConsultorioComentario[]           @relation("ComentarioConsultorioRespuestas")
  reacciones    ConsultorioComentarioReaccion[]
  createdAt     DateTime                          @default(now())
  updatedAt     DateTime?                         @updatedAt

  @@index([consultorioId])
  @@index([userId])
  @@index([padreId])
  @@schema("social")
}

model ConsultorioComentarioReaccion {
  id           String                @id @default(cuid())
  comentarioId String
  comentario   ConsultorioComentario @relation(fields: [comentarioId], references: [id], onDelete: Cascade)
  userId       String
  user         User                  @relation("reaccionesComentarioConsultorio", fields: [userId], references: [id], onDelete: Cascade)
  tipo         TipoReaccion
  createdAt    DateTime              @default(now())

  @@unique([comentarioId, userId])
  @@index([comentarioId])
  @@schema("social")
}

model ConsultorioValoracion {
  id            String      @id @default(cuid())
  consultorioId String
  consultorio   Consultorio @relation(fields: [consultorioId], references: [id], onDelete: Cascade)
  userId        String
  user          User        @relation("valoracionesConsultorio", fields: [userId], references: [id], onDelete: Cascade)
  puntuacion    Int
  resena        String?
  estado        Estado      @default(ACTIVO)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime?   @updatedAt

  @@unique([consultorioId, userId])
  @@index([consultorioId])
  @@schema("social")
}

model ConsultorioPregunta {
  id            String                   @id @default(cuid())
  consultorioId String
  consultorio   Consultorio              @relation(fields: [consultorioId], references: [id], onDelete: Cascade)
  userId        String
  user          User                     @relation("preguntasConsultorio", fields: [userId], references: [id], onDelete: Cascade)
  pregunta      String
  estado        Estado                   @default(ACTIVO)
  createdAt     DateTime                 @default(now())
  updatedAt     DateTime?                @updatedAt
  respuestas    ConsultorioRespuesta[]

  @@index([consultorioId])
  @@index([userId])
  @@schema("social")
}

model ConsultorioRespuesta {
  id         String              @id @default(cuid())
  preguntaId String
  pregunta   ConsultorioPregunta @relation(fields: [preguntaId], references: [id], onDelete: Cascade)
  userId     String
  user       User                @relation("respuestasConsultorio", fields: [userId], references: [id], onDelete: Cascade)
  respuesta  String
  estado     Estado              @default(ACTIVO)
  createdAt  DateTime            @default(now())
  updatedAt  DateTime?           @updatedAt

  @@index([preguntaId])
  @@schema("social")
}

model ConsultorioFavorito {
  id            String      @id @default(cuid())
  consultorioId String
  consultorio   Consultorio @relation(fields: [consultorioId], references: [id], onDelete: Cascade)
  userId        String
  user          User        @relation("favoritosConsultorio", fields: [userId], references: [id], onDelete: Cascade)
  createdAt     DateTime    @default(now())

  @@unique([consultorioId, userId])
  @@index([userId])
  @@schema("social")
}

model ConsultorioSeguidor {
  id            String      @id @default(cuid())
  consultorioId String
  consultorio   Consultorio @relation(fields: [consultorioId], references: [id], onDelete: Cascade)
  userId        String
  user          User        @relation("seguidoresConsultorio", fields: [userId], references: [id], onDelete: Cascade)
  createdAt     DateTime    @default(now())

  @@unique([consultorioId, userId])
  @@index([consultorioId])
  @@index([userId])
  @@schema("social")
}
```

---

## JSON shapes

### `HorarioConsultorio` (campo `Consultorio.horarios`)

```typescript
type HorarioConsultorio = {
  diaSemana: 0 | 1 | 2 | 3 | 4 | 5 | 6  // 0=Lun, 6=Dom
  horaInicio: string  // "08:00"
  horaFin: string     // "17:00"
  activo: boolean
}[]
```

### `ContactoPublico` (campo `Consultorio.contactoPublico`)

```typescript
type ContactoPublico = {
  telefono?: string
  email?: string
  redesSociales?: { nombre: string; url: string }[]
}
```

---

## Índices de consulta clave

| Tabla | Índice | Uso |
|-------|--------|-----|
| `Cita` | `(consumerUserId, origenOnline)` | "Mis citas" del consumidor |
| `Cita` | `(consultorioId, medicoId, fechaHora)` | Cálculo de disponibilidad |
| `ConsultorioValoracion` | `(consultorioId)` | Promedio de valoraciones |
| `ConsultorioSeguidor` | `(consultorioId)` | Conteo de seguidores |
| `ConsultorioPregunta` | `(consultorioId, estado)` | Listado público de preguntas |
