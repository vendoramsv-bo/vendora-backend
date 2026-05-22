# Data Model: Módulo de Consultorio Médico

> **NOTA:** Este modelo de datos es PRE-EXISTENTE y AUTORITATIVO.
> Vive en `prisma/60-consultorio.prisma` y `prisma/10-tenant.prisma`.
> Este documento es solo referencia — no modifica los schemas Prisma.

## Schemas PostgreSQL involucrados

| Schema       | Modelos                                                              |
|--------------|----------------------------------------------------------------------|
| `tenant`     | `Consultorio` (perfil del consultorio)                               |
| `consultorio`| `Medico`, `HorarioAtencion`, `Paciente`, `ServicioMedico`, `Cita`, `RecordatorioCita`, `HistoriaClinica`, `HcOdontologia`, `HcPediatria`, `HcGeneral`, `HcPerinatal`, `HcPerinatalControl`, `AdjuntoClinico`, `Vacunacion`, `AtencionMedica`, `AtencionDetalle`, `AtencionPago`, `RecetaMedica`, `RecetaMedicaDetalle` |

---

## Entidades Principales

### Consultorio (`tenant.Consultorio`)
Perfil clínico del tenant. Existe una instancia por tenant (`tenantId @unique`).

| Campo         | Tipo       | Notas                                         |
|---------------|------------|-----------------------------------------------|
| id            | String     | CUID, PK                                      |
| tenantId      | String     | @unique, FK → Tenant                          |
| especialidades| String[]   | ["ODONTOLOGIA","PEDIATRIA","MEDICINA_GENERAL"] |
| nroRegistro   | String?    | Número de habilitación del establecimiento    |
| estado        | Estado     | PENDIENTE / ACTIVO / INACTIVO                 |
| createdById   | String?    | Auditoría                                     |
| updatedById   | String?    | Auditoría                                     |

**Relaciones hacia:** `Medico[]`, `Paciente[]`, `Cita[]`, `ServicioMedico[]`, `AtencionMedica[]`, `RecetaMedica[]`

---

### Medico (`consultorio.Medico`)
Miembro del tenant con perfil de médico.

| Campo         | Tipo        | Notas                                      |
|---------------|-------------|--------------------------------------------|
| id            | String      | CUID, PK                                   |
| consultorioId | String      | FK → Consultorio                           |
| memberId      | String      | @unique, FK → TenantMember                 |
| especialidad  | String      | ODONTOLOGIA, PEDIATRIA, MEDICINA_GENERAL… |
| nroRegistro   | String?     | Matrícula profesional                      |
| bio           | String?     | Biografía                                  |
| fotoUrl       | String?     | URL foto de perfil                         |
| estado        | Estado      | ACTIVO / INACTIVO                          |
| createdById   | String?     | Auditoría                                  |
| updatedById   | String?     | Auditoría                                  |

**Índices:** `@@unique([consultorioId, nroRegistro])`
**Relaciones hacia:** `HorarioAtencion[]`, `Cita[]`, `HistoriaClinica[]`, `AtencionMedica[]`, `RecetaMedica[]`

---

### HorarioAtencion (`consultorio.HorarioAtencion`)
Franjas horarias de atención del médico por día de la semana.

| Campo      | Tipo    | Notas                           |
|------------|---------|---------------------------------|
| id         | String  | CUID, PK                        |
| medicoId   | String  | FK → Medico                     |
| diaSemana  | Int     | 0=Lun, 1=Mar … 6=Dom           |
| horaInicio | String  | "08:00"                         |
| horaFin    | String  | "12:00"                         |
| activo     | Boolean | default true                    |

**Índices:** `@@unique([medicoId, diaSemana, horaInicio])`

---

### Paciente (`consultorio.Paciente`)
Persona atendida en el consultorio.

| Campo          | Tipo     | Notas                         |
|----------------|----------|-------------------------------|
| id             | String   | CUID, PK                      |
| consultorioId  | String   | FK → Consultorio              |
| nombre         | String   |                               |
| apellido       | String   |                               |
| fechaNacimiento| DateTime?|                               |
| genero         | String?  |                               |
| telefono       | String?  |                               |
| email          | String?  | @unique por consultorio       |
| direccion      | String?  |                               |
| tipoSangre     | String?  |                               |
| alergias       | String?  | Texto libre                   |
| seguroNombre   | String?  | Nombre aseguradora/obra social|
| seguroNumero   | String?  | Número de póliza              |
| estado         | Estado   | ACTIVO / INACTIVO             |
| createdById    | String?  | Auditoría                     |
| updatedById    | String?  | Auditoría                     |

**Índices:** `@@unique([consultorioId, email])`, `@@index([consultorioId, apellido])`

---

### ServicioMedico (`consultorio.ServicioMedico`)
Catálogo de prestaciones médicas del consultorio.

| Campo         | Tipo    | Notas                           |
|---------------|---------|---------------------------------|
| id            | String  | CUID, PK                        |
| consultorioId | String  | FK → Consultorio                |
| nombre        | String  | @unique por consultorio         |
| especialidad  | String? | Especialidad relacionada        |
| descripcion   | String? |                                 |
| duracionMin   | Int     | default 30                      |
| precioBase    | Decimal | Decimal(10,2) default 0         |
| estado        | Estado  | ACTIVO / INACTIVO               |
| createdById   | String? | Auditoría                       |
| updatedById   | String? | Auditoría                       |

---

### Cita (`consultorio.Cita`)
Cita agendada entre paciente y médico.

| Campo         | Tipo          | Notas                                     |
|---------------|---------------|-------------------------------------------|
| id            | String        | CUID, PK                                  |
| consultorioId | String        | FK → Consultorio                          |
| pacienteId    | String        | FK → Paciente                             |
| medicoId      | String        | FK → Medico                               |
| servicioId    | String?       | FK → ServicioMedico (opcional)            |
| fechaHora     | DateTime      | Fecha y hora de inicio                    |
| duracionMin   | Int           | default 30 minutos                        |
| estado        | Estado        | PENDIENTE/CONFIRMADA/ATENDIDA/CANCELADA/NO_ASISTIO |
| motivo        | String?       | Motivo de la consulta                     |
| canalOrigen   | String?       | WEB, TELEFONO, PRESENCIAL                 |
| notas         | String?       |                                           |
| createdById   | String?       | Auditoría                                 |
| updatedById   | String?       | Auditoría                                 |

**Índices:** `@@index([consultorioId, medicoId, fechaHora])`, `@@index([consultorioId, pacienteId])`
**Relaciones hacia:** `RecordatorioCita[]`, `HistoriaClinica?`, `AtencionMedica?`

**Estados y transiciones:**
```
PENDIENTE → CONFIRMADA (si fechaHora > now())
PENDIENTE → CANCELADA
CONFIRMADA → ATENDIDA
CONFIRMADA → CANCELADA
CONFIRMADA → NO_ASISTIO
ATENDIDA → (final)
CANCELADA → (final)
NO_ASISTIO → (final)
```

---

### RecordatorioCita (`consultorio.RecordatorioCita`)
Log de recordatorios enviados para una cita.

| Campo      | Tipo    | Notas                           |
|------------|---------|---------------------------------|
| id         | String  | CUID, PK                        |
| citaId     | String  | FK → Cita                       |
| canal      | String  | EMAIL, SMS, WHATSAPP            |
| enviadoEn  | DateTime|                               |
| estadoEnvio| String  | ENVIADO, PENDIENTE, ERROR       |

---

### HistoriaClinica (`consultorio.HistoriaClinica`)
Registro clínico de una consulta.

| Campo          | Tipo    | Notas                                        |
|----------------|---------|----------------------------------------------|
| id             | String  | CUID, PK                                     |
| consultorioId  | String  | FK (lógico) → Consultorio                    |
| pacienteId     | String  | FK → Paciente                                |
| medicoId       | String  | FK → Medico                                  |
| citaId         | String? | @unique, FK → Cita (una historia por cita)   |
| especialidad   | String  | ODONTOLOGIA / PEDIATRIA / MEDICINA_GENERAL / PERINATAL / OTRO |
| motivoConsulta | String  |                                              |
| diagnostico    | String? |                                              |
| tratamiento    | String? |                                              |
| observaciones  | String? |                                              |
| fecha          | DateTime| Fecha de la consulta                         |
| createdById    | String? | Auditoría                                    |
| updatedById    | String? | Auditoría                                    |

**Relaciones opcionales 1-a-1:** `HcOdontologia?`, `HcPediatria?`, `HcGeneral?`, `HcPerinatal?`
**Relaciones hacia:** `AdjuntoClinico[]`

---

### Extensiones de HistoriaClinica

#### HcOdontologia
| Campo       | Tipo   | Notas                                         |
|-------------|--------|-----------------------------------------------|
| historiaId  | String | @unique, FK → HistoriaClinica                 |
| odontograma | Json   | `{ "11": { "estado": "CARIES", "tratamiento": "OBTURACION" }, ... }` |
| procedimiento | String? |                                             |
| dienteNumero | String? |                                              |
| estadoDiente | String? |                                              |

#### HcPediatria
| Campo                  | Tipo     | Notas                      |
|------------------------|----------|----------------------------|
| historiaId             | String   | @unique, FK                |
| pesoKg                 | Decimal? | Decimal(5,2)               |
| tallaCm                | Decimal? | Decimal(5,2)               |
| perimetroCefalico      | Decimal? | Decimal(5,2)               |
| percentilPeso          | String?  |                            |
| percentilTalla         | String?  |                            |
| desarrolloPsicomotor   | String?  |                            |
| observacionNutricional | String?  |                            |

#### HcGeneral (signos vitales y notas clínicas)
| Campo                | Tipo     | Notas           |
|----------------------|----------|-----------------|
| historiaId           | String   | @unique, FK     |
| presionArterial      | String?  | "120/80"        |
| temperatura          | Decimal? | Decimal(4,1)    |
| frecuenciaCardiaca   | Int?     |                 |
| frecuenciaRespiratoria | Int?   |                 |
| saturacionO2         | Decimal? | Decimal(4,1)    |
| recetaMedica         | String?  | Texto libre     |
| examenesOlicitados   | String?  |                 |

#### HcPerinatal + HcPerinatalControl
Formulario CLAP/OPS completo para control perinatal. Ver modelo en `prisma/60-consultorio.prisma`.

---

### AdjuntoClinico (`consultorio.AdjuntoClinico`)
Archivos adjuntos a una historia clínica.

| Campo         | Tipo    | Notas                               |
|---------------|---------|-------------------------------------|
| historiaId    | String  | FK → HistoriaClinica                |
| tipo          | String  | IMAGEN, LABORATORIO, RADIOGRAFIA, OTRO |
| url           | String  | URL del archivo (Cloudflare R2)     |
| nombreArchivo | String  |                                     |
| subidoEn      | DateTime|                                    |

---

### Vacunacion (`consultorio.Vacunacion`)
Registro de vacunas aplicadas a un paciente.

| Campo          | Tipo     | Notas            |
|----------------|----------|------------------|
| pacienteId     | String   | FK → Paciente    |
| vacuna         | String   | Nombre de vacuna |
| dosis          | String?  |                  |
| fechaAplicacion| DateTime |                  |
| proximaDosis   | DateTime?|                  |
| medicoId       | String?  | FK lógico        |
| lote           | String?  |                  |

---

### AtencionMedica (`consultorio.AtencionMedica`)
Registro económico de una consulta.

| Campo            | Tipo            | Notas                                   |
|------------------|-----------------|-----------------------------------------|
| id               | String          | CUID, PK                                |
| consultorioId    | String          | FK → Consultorio                        |
| pacienteId       | String          | FK → Paciente                           |
| pacienteNombre   | String          | Snapshot                                |
| pacienteApellido | String          | Snapshot                                |
| medicoId         | String          | FK → Medico                             |
| medicoNombre     | String          | Snapshot                                |
| medicoEspecialidad | String        | Snapshot                                |
| citaId           | String?         | @unique, FK → Cita                      |
| fechaAtencion    | DateTime        |                                         |
| subtotal         | Decimal         | Decimal(10,2)                           |
| descuento        | Decimal         | Decimal(10,2)                           |
| total            | Decimal         | Decimal(10,2)                           |
| tipoPago         | TipoPagoMedico  | EFECTIVO/QR/TARJETA_CREDITO/…           |
| estadoPago       | EstadoPagoMedico| PENDIENTE/PARCIAL/PAGADO                |
| estado           | EstadoAtencion  | EN_CURSO/COMPLETADA/PAGADA/ANULADA      |
| observaciones    | String?         |                                         |
| createdById      | String?         | Auditoría                               |
| updatedById      | String?         | Auditoría                               |

**Relaciones hacia:** `AtencionDetalle[]`, `AtencionPago[]`, `RecetaMedica[]`

---

### AtencionDetalle (`consultorio.AtencionDetalle`)
Línea de servicio/tratamiento de una AtencionMedica.

| Campo                | Tipo            | Notas                           |
|----------------------|-----------------|---------------------------------|
| atencionId           | String          | FK → AtencionMedica             |
| servicioId           | String          | FK → ServicioMedico             |
| servicioNombre       | String          | Snapshot                        |
| especialidad         | String          | Snapshot                        |
| tipoTratamiento      | TipoTratamiento | Enum de ~25 tipos               |
| descripcionTratamiento | String?       | Detalle libre                   |
| referenciaClin       | String?         | Diente, zona, etc.              |
| cantidad             | Int             | default 1                       |
| precioUnitario       | Decimal         | Decimal(10,2)                   |
| descuento            | Decimal         | Decimal(10,2)                   |
| subtotal             | Decimal         | Decimal(10,2)                   |

**Índices:** `@@unique([atencionId, servicioId, tipoTratamiento])`

---

### AtencionPago (`consultorio.AtencionPago`)
Pago parcial o total de una AtencionMedica.

| Campo        | Tipo          | Notas                          |
|--------------|---------------|--------------------------------|
| atencionId   | String        | FK → AtencionMedica            |
| monto        | Decimal       | Decimal(10,2)                  |
| metodo       | TipoPagoMedico|                               |
| referencia   | String?       | Nro. transferencia, QR, etc.   |
| nota         | String?       |                                |
| pagadoEn     | DateTime      |                                |
| registradoPor| String?       | Nombre del recepcionista       |

---

### RecetaMedica (`consultorio.RecetaMedica`)
Prescripción médica.

| Campo               | Tipo        | Notas                              |
|---------------------|-------------|------------------------------------|
| id                  | String      | CUID, PK                           |
| consultorioId       | String      | FK → Consultorio                   |
| atencionId          | String      | FK → AtencionMedica                |
| pacienteId          | String      | FK → Paciente                      |
| medicoId            | String      | FK → Medico                        |
| numeroReceta        | String      | @unique por consultorio. "REC-2026-00001" |
| indicacionesGenerales | String?   |                                    |
| diagnosticoCie10    | String?     |                                    |
| fechaEmision        | DateTime    | default now()                      |
| fechaVencimiento    | DateTime?   | default +30 días                   |
| estado              | EstadoReceta| EMITIDA/PARCIAL/DESPACHADA/VENCIDA/ANULADA |
| createdById         | String?     | Auditoría                          |
| updatedById         | String?     | Auditoría                          |

**Índices:** `@@unique([consultorioId, numeroReceta])`
**Relaciones hacia:** `RecetaMedicaDetalle[]`

---

### RecetaMedicaDetalle (`consultorio.RecetaMedicaDetalle`)
Ítem de medicamento en una RecetaMedica.

| Campo             | Tipo                | Notas                           |
|-------------------|---------------------|---------------------------------|
| recetaId          | String              | FK → RecetaMedica               |
| productoId        | String?             | FK → Producto (catálogo tenant) |
| medicamento       | String              | Snapshot: "Paracetamol 500mg"   |
| principioActivo   | String?             |                                 |
| concentracion     | String?             |                                 |
| presentacion      | String?             |                                 |
| dosis             | String              | "1 comprimido"                  |
| frecuencia        | String              | "Cada 8 horas"                  |
| duracion          | String              | "Por 5 días"                    |
| via               | ViaAdministracion   | ORAL/IV/IM/…                    |
| cantidadPrescrita | Int                 | default 1                       |
| indicaciones      | String?             | Instrucciones específicas       |
| permiteSustitucion| Boolean             | default true                    |
| estado            | EstadoRecetaDetalle | PENDIENTE/PARCIAL/DESPACHADO/CANCELADO |

---

## Enums

| Enum                | Valores                                                    |
|---------------------|------------------------------------------------------------|
| EstadoAtencion      | EN_CURSO, COMPLETADA, PAGADA, ANULADA                      |
| EstadoPagoMedico    | PENDIENTE, PARCIAL, PAGADO                                 |
| TipoPagoMedico      | EFECTIVO, QR, TARJETA_CREDITO, TARJETA_DEBITO, TRANSFERENCIA, SEGURO_MEDICO, CONVENIO, OTRO |
| TipoTratamiento     | CONSULTA, CONTROL, EMERGENCIA, LIMPIEZA_DENTAL, OBTURACION, EXTRACCION, … (25 tipos) |
| EstadoReceta        | EMITIDA, PARCIAL, DESPACHADA, VENCIDA, ANULADA             |
| EstadoRecetaDetalle | PENDIENTE, PARCIAL, DESPACHADO, CANCELADO                  |
| ViaAdministracion   | ORAL, SUBLINGUAL, INTRAVENOSA, INTRAMUSCULAR, SUBCUTANEA, TOPICA, OFTALMICA, OTICA, NASAL, RECTAL, VAGINAL, INHALATORIA, OTRO |
| Estado (global)     | ACTIVO, INACTIVO, PENDIENTE (definido en tenant schema)    |

---

## Diagrama de relaciones clave

```
Tenant (tenant schema)
  └── Consultorio (1:1, tenant schema)
        ├── Medico[] (consultorio schema)
        │     └── HorarioAtencion[]
        ├── Paciente[] (consultorio schema)
        │     └── Vacunacion[]
        ├── ServicioMedico[] (consultorio schema)
        ├── Cita[] (consultorio schema)
        │     ├── RecordatorioCita[]
        │     ├── HistoriaClinica? (1:1)
        │     │     ├── HcOdontologia? (1:1)
        │     │     ├── HcPediatria? (1:1)
        │     │     ├── HcGeneral? (1:1)
        │     │     ├── HcPerinatal? (1:1)
        │     │     │     └── HcPerinatalControl[]
        │     │     └── AdjuntoClinico[]
        │     └── AtencionMedica? (1:1)
        │           ├── AtencionDetalle[]
        │           ├── AtencionPago[]
        │           └── RecetaMedica[]
        │                 └── RecetaMedicaDetalle[]
        ├── AtencionMedica[] (via consultorioId)
        └── RecetaMedica[] (via consultorioId)
```
