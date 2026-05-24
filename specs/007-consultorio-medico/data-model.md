# Data Model: Módulo de Consultorio Médico

**Feature**: 007-consultorio-medico  
**Date**: 2026-05-24  
**Prisma schemas**: `tenant` (Consultorio) + `consultorio` (todos los demás)  
**Reference**: `prisma/10-tenant.prisma` (Consultorio) · `prisma/60-consultorio.prisma`

---

## Entidades y Relaciones

### Tier 0 — Core (tenant schema)

```
Consultorio
  id             String PK
  tenantId       String UNIQUE → Tenant
  especialidades String[]         // ["ODONTOLOGIA","PEDIATRIA","MEDICINA_GENERAL"]
  nroRegistro    String?
  estado         Estado
  createdById    String?
  updatedById    String?
  → medicos[], pacientes[], citas[], serviciosMedicos[], atencionesMedicas[], recetasMedicas[]
```

---

### Tier 1 — Actores Clínicos (consultorio schema)

```
Medico
  id             String PK
  consultorioId  String → Consultorio
  memberId       String UNIQUE → TenantMember  (rol: MEDICO)
  especialidad   String
  nroRegistro    String?   // matrícula profesional  @@unique([consultorioId, nroRegistro])
  bio            String?
  fotoUrl        String?
  estado         Estado
  createdById / updatedById

  → horariosAtencion[], citas[], historiasClinicas[], atencionesMedicas[], recetasMedicas[]

HorarioAtencion
  id             String PK
  medicoId       String → Medico (cascade)
  diaSemana      Int          // 0=Lun … 6=Dom
  horaInicio     String       // "08:00"
  horaFin        String       // "12:00"
  activo         Boolean
  @@unique([medicoId, diaSemana, horaInicio])

Paciente                                                      ← SCHEMA CHANGE PENDIENTE
  id             String PK
  consultorioId  String → Consultorio
  dni            String?   ← NEW  @@unique([consultorioId, dni])
  nombre         String
  apellido       String
  fechaNacimiento DateTime?
  genero         String?
  telefono       String?
  email          String?   @@unique([consultorioId, email])
  direccion      String?
  tipoSangre     String?
  alergias       String?
  seguroNombre   String?
  seguroNumero   String?
  canalNotificacion String?  ← NEW  // EMAIL | SMS | WHATSAPP
  estado         Estado
  createdById / updatedById

  → citas[], historiasClinicas[], vacunaciones[], atencionesMedicas[], recetasMedicas[]
```

---

### Tier 2 — Catálogo

```
ServicioMedico
  id             String PK
  consultorioId  String → Consultorio
  nombre         String   @@unique([consultorioId, nombre])
  especialidad   String?
  descripcion    String?
  duracionMin    Int @default(30)
  precioBase     Decimal(10,2)
  estado         Estado
  createdById / updatedById

  → citas[], atencionesDetalle[]
```

---

### Tier 3 — Flujo Central

```
Cita
  id             String PK
  consultorioId  String → Consultorio
  pacienteId     String → Paciente (cascade)
  medicoId       String → Medico (cascade)
  servicioId     String? → ServicioMedico (setNull)
  fechaHora      DateTime
  duracionMin    Int @default(30)
  estado         EstadoCita      // PENDIENTE | CONFIRMADA | ATENDIDA | CANCELADA | NO_ASISTIO
  motivo         String?
  canalOrigen    String?         // WEB | TELEFONO | PRESENCIAL
  notas          String?
  createdById / updatedById
  @@index([consultorioId, medicoId, fechaHora])
  @@index([consultorioId, pacienteId])

  → recordatorios[], historiaClinica?, atencionMedica?

RecordatorioCita
  id          String PK
  citaId      String → Cita (cascade)
  canal       String   // EMAIL | SMS | WHATSAPP  (tomado de Paciente.canalNotificacion)
  enviadoEn   DateTime
  estadoEnvio String @default("ENVIADO")
```

**Estado de Cita — transiciones válidas:**

```
PENDIENTE  →  CONFIRMADA  (solo si fechaHora > now())
PENDIENTE  →  CANCELADA
PENDIENTE  →  NO_ASISTIO
CONFIRMADA →  ATENDIDA
CONFIRMADA →  CANCELADA
CONFIRMADA →  NO_ASISTIO
```

**Regla de solapamiento**: Al crear una cita, se verifica que no exista otra cita del mismo médico con estado `PENDIENTE` o `CONFIRMADA` cuyo intervalo `[fechaHora, fechaHora + duracionMin]` se solape con el nuevo intervalo.

---

### Tier 4 — Historia Clínica

```
HistoriaClinica
  id              String PK
  consultorioId   String
  pacienteId      String → Paciente (cascade)
  medicoId        String → Medico (cascade)
  citaId          String? UNIQUE → Cita (setNull)
  especialidad    String    // ODONTOLOGIA | PEDIATRIA | MEDICINA_GENERAL | OTRO
  motivoConsulta  String
  diagnostico     String?
  tratamiento     String?
  observaciones   String?
  fecha           DateTime
  createdById / updatedById
  @@index([pacienteId, fecha])
  @@index([medicoId, fecha])

  → hcOdontologia?, hcPediatria?, hcGeneral?, hcPerinatal?
  → adjuntos[]

HcOdontologia (extensión 1-a-1)
  id           String PK
  historiaId   String UNIQUE → HistoriaClinica (cascade)
  odontograma  Json    // { "11": { "estado": "CARIES", "tratamiento": "OBTURACION" } }
  procedimiento String?
  dienteNumero  String?
  estadoDiente  String?

HcPediatria (extensión 1-a-1)
  id                  String PK
  historiaId          String UNIQUE → HistoriaClinica (cascade)
  pesoKg              Decimal(5,2)?
  tallaCm             Decimal(5,2)?
  perimetroCefalico   Decimal(5,2)?
  percentilPeso       String?
  percentilTalla      String?
  desarrolloPsicomotor String?
  observacionNutricional String?

HcGeneral (extensión 1-a-1)
  id                    String PK
  historiaId            String UNIQUE → HistoriaClinica (cascade)
  presionArterial       String?
  temperatura           Decimal(4,1)?
  frecuenciaCardiaca    Int?
  frecuenciaRespiratoria Int?
  saturacionO2          Decimal(4,1)?
  recetaMedica          String?      // texto libre — ref. a RecetaMedica v2
  examenesOlicitados    String?

AdjuntoClinico
  id           String PK
  historiaId   String → HistoriaClinica (cascade)
  tipo         String   // IMAGEN | LABORATORIO | RADIOGRAFIA | OTRO
  url          String
  nombreArchivo String
  subidoEn     DateTime
```

---

### Tier 5 — Vacunaciones

```
Vacunacion
  id              String PK
  pacienteId      String → Paciente (cascade)
  vacuna          String
  dosis           String?
  fechaAplicacion DateTime
  proximaDosis    DateTime?
  medicoId        String?
  lote            String?
  @@index([pacienteId])
```

---

### Tier 6 — Atención Médica y Cobro

```
AtencionMedica
  id                String PK
  consultorioId     String → Consultorio
  pacienteId        String → Paciente (cascade)
  pacienteNombre / pacienteApellido / pacienteTelefono  (snapshot)
  medicoId          String → Medico (restrict)
  medicoNombre / medicoEspecialidad                     (snapshot)
  citaId            String? UNIQUE → Cita (setNull)
  fechaAtencion     DateTime
  totalServicios    Int
  totalCantidad     Int
  subtotal / descuento / total  Decimal(10,2)
  tipoPago          TipoPagoMedico
  estadoPago        EstadoPagoMedico  // PENDIENTE | PARCIAL | PAGADO
  observaciones     String?
  estado            EstadoAtencion    // EN_CURSO | COMPLETADA | PAGADA | ANULADA
  createdById / updatedById
  @@index([consultorioId, medicoId, fechaAtencion])
  @@index([consultorioId, pacienteId])

  → detalle[], pagos[], recetas[]

AtencionDetalle
  id                  String PK
  atencionId          String → AtencionMedica (cascade)
  servicioId          String → ServicioMedico (restrict)
  servicioNombre / especialidad               (snapshot)
  tipoTratamiento     TipoTratamiento
  descripcionTratamiento String?
  referenciaClin      String?    // "Diente 21", "Brazo derecho"
  cantidad            Int
  precioUnitario / descuento / subtotal  Decimal(10,2)
  nota                String?
  @@unique([atencionId, servicioId, tipoTratamiento])

AtencionPago
  id           String PK
  atencionId   String → AtencionMedica (cascade)
  monto        Decimal(10,2)
  metodo       TipoPagoMedico
  referencia   String?
  nota         String?
  pagadoEn     DateTime
  registradoPor String?
```

**Integración con caja unificada (FR-024)**:  
Cuando `estadoPago` llega a `PAGADO`, se crea una `Venta` en el módulo ventas con:
- `referenciaTipo = "ATENCION_MEDICA"`
- `referenciaId = atencion.id`
- `detalles` mapeados desde `AtencionDetalle` usando los servicios como productos de texto libre  
El vínculo de retorno se localiza vía `Venta.referenciaId` sin agregar `ventaId` a AtencionMedica.

---

### Tier 7 — Receta Médica

```
RecetaMedica
  id                  String PK
  consultorioId       String → Consultorio
  atencionId          String → AtencionMedica (cascade)
  pacienteId          String → Paciente (cascade)
  medicoId            String → Medico (restrict)
  pacienteNombre / pacienteApellido / medicoNombre / medicoEspecialidad / medicoRegistro  (snapshot)
  numeroReceta        String  @@unique([consultorioId, numeroReceta])  // "REC-2026-00045"
  indicacionesGenerales String?
  diagnosticoCie10    String?
  fechaEmision        DateTime
  fechaVencimiento    DateTime?
  estado              EstadoReceta   // EMITIDA | PARCIAL | DESPACHADA | VENCIDA | ANULADA
  observaciones       String?
  createdById / updatedById
  @@index([pacienteId, fechaEmision])
  @@index([medicoId, fechaEmision])

  → detalle[]

RecetaMedicaDetalle
  id                  String PK
  recetaId            String → RecetaMedica (cascade)
  productoId          String? → Producto (setNull)    // null = texto libre
  medicamento         String   (snapshot)
  principioActivo     String?
  concentracion       String?
  presentacion        String?
  dosis               String
  frecuencia          String
  duracion            String
  via                 ViaAdministracion
  cantidadPrescrita   Int @default(1)
  indicaciones        String?
  permiteSustitucion  Boolean @default(true)
  estado              EstadoRecetaDetalle
  @@index([recetaId])
  @@index([productoId])
```

**Transición automática a VENCIDA**: El job de BullMQ `expirar-recetas` corre diariamente y actualiza a VENCIDA las recetas donde `fechaVencimiento < now()` y `estado IN [EMITIDA, PARCIAL]`.

---

### Tier 8 — Audit Trail (NUEVO — HIPAA)

```
AuditoriaAcceso                                               ← SCHEMA CHANGE PENDIENTE
  id            String PK
  tenantId      String
  consultorioId String
  userId        String
  accion        String    // LEER_HISTORIA | LEER_RECETA | LEER_PACIENTE | etc.
  recursoTipo   String    // HISTORIA_CLINICA | RECETA_MEDICA | PACIENTE
  recursoId     String
  ip            String?
  timestamp     DateTime @default(now())
  @@index([consultorioId, recursoId])
  @@index([userId, timestamp])
  @@schema("consultorio")
```

---

## Enums

| Enum | Valores |
|------|---------|
| `EstadoAtencion` | EN_CURSO, COMPLETADA, PAGADA, ANULADA |
| `EstadoPagoMedico` | PENDIENTE, PARCIAL, PAGADO |
| `TipoPagoMedico` | EFECTIVO, QR, TARJETA_CREDITO, TARJETA_DEBITO, TRANSFERENCIA, SEGURO_MEDICO, CONVENIO, OTRO |
| `TipoTratamiento` | CONSULTA, CONTROL, EMERGENCIA, LIMPIEZA_DENTAL, OBTURACION, EXTRACCION, ENDODONCIA, CORONA, PROTESIS, ORTODONCIA, BLANQUEAMIENTO, RADIOGRAFIA_DENTAL, CIRUGIA_ORAL, CONTROL_CRECIMIENTO, VACUNACION, EVALUACION_DESARROLLO, DESPARASITACION, RECETA_MEDICA, SOLICITUD_EXAMENES, INTERPRETACION_EXAMENES, CURACION, INYECTABLE, NEBULIZACION, SUTURA, RETIRO_SUTURA, PROCEDIMIENTO_MENOR, OTRO |
| `EstadoReceta` | EMITIDA, PARCIAL, DESPACHADA, VENCIDA, ANULADA |
| `EstadoRecetaDetalle` | PENDIENTE, PARCIAL, DESPACHADO, CANCELADO |
| `ViaAdministracion` | ORAL, SUBLINGUAL, INTRAVENOSA, INTRAMUSCULAR, SUBCUTANEA, TOPICA, OFTALMICA, OTICA, NASAL, RECTAL, VAGINAL, INHALATORIA, OTRO |

---

## Schema Changes Pendientes en Prisma

Las siguientes modificaciones al schema aún no están aplicadas:

| Archivo | Cambio |
|---------|--------|
| `prisma/60-consultorio.prisma` | Paciente: agregar `dni String?` + `@@unique([consultorioId, dni])` |
| `prisma/60-consultorio.prisma` | Paciente: agregar `canalNotificacion String?` |
| `prisma/60-consultorio.prisma` | Agregar modelo `AuditoriaAcceso` |

Todos los demás modelos del spec ya están presentes en el schema.

---

## Invariantes de Negocio Clave

1. **Solapamiento de citas**: Un médico no puede tener dos citas con estado `PENDIENTE`/`CONFIRMADA` cuyos intervalos se solapen.
2. **Transición de citas**: Solo PENDIENTE → CONFIRMADA si `fechaHora > now()`. Solo cancelable si no fue ATENDIDA.
3. **Audit obligatorio**: Todo acceso (lectura) a `HistoriaClinica`, `RecetaMedica` o datos sensibles de `Paciente` genera un registro en `AuditoriaAcceso`.
4. **DNI único por consultorio**: Dos pacientes del mismo consultorio no pueden compartir DNI.
5. **Pago y venta**: Cuando `estadoPago = PAGADO`, el sistema crea automáticamente una `Venta` en el módulo ventas con `referenciaTipo = "ATENCION_MEDICA"`.
6. **Bloqueo optimista**: Updates de Cita, AtencionMedica e HistoriaClinica verifican que `updatedAt` recibido del cliente coincida con el valor en BD antes de aplicar el cambio.
7. **Receta vencida**: Transición automática a VENCIDA cuando `fechaVencimiento < now()`.
