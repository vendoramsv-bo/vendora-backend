# Quickstart: TuConsultorio — Guía de Implementación

**Feature**: 015-tu-consultorio  
**Date**: 2026-06-05  
**Para**: Desarrollador implementando `/speckit-implement`

---

## Contexto

Este módulo extiende el consultorio médico existente con visibilidad pública, agendamiento online y social. Sigue exactamente el patrón de TuRestaurante (feature 013). Si hay duda sobre cómo implementar algo, consultar los archivos de `src/modules/restaurante/` y `src/modules/social/` para los modelos `Restaurante*`.

---

## Archivos clave existentes a leer antes de empezar

| Archivo | Por qué leerlo |
|---------|---------------|
| `src/modules/restaurante/application/perfil-publico/activar-perfil-publico.usecase.ts` | Patrón de activar perfil público |
| `src/modules/restaurante/infrastructure/restaurante-publico.prisma.repository.ts` | Patrón de repository |
| `src/modules/social/infrastructure/restaurante-social.prisma.repository.ts` | Patrón de social repository |
| `src/modules/social/adapters/social.router.ts` | Cómo agregar nuevos routers al social app |
| `src/core/query-params.ts` | Helpers `makeQueryParamsSchema` y `paginate` |
| `prisma/60-consultorio.prisma` | Schema consultorio existente |
| `prisma/10-tenant.prisma` línea 322 | Modelo `Consultorio` |

---

## Fase 1: Schema Prisma

### Orden de modificaciones

1. **`prisma/60-consultorio.prisma`**: Agregar enum `EstadoCita`, enum `TipoServicioConsultorio`, modificar `Medico`, `ServicioMedico`, `Cita` (ver `data-model.md` para los snippets exactos).

2. **`prisma/10-tenant.prisma`**: Agregar campos públicos y relaciones sociales al modelo `Consultorio` (ver `data-model.md`).

3. **`prisma/80-social.prisma`**: Agregar 7 modelos `Consultorio*` al final del archivo (ver `data-model.md`).

4. **Ejecutar**:
```powershell
npx prisma generate --config prisma/prisma.config.ts
npx prisma migrate dev --name "feature-015-tu-consultorio" --config prisma/prisma.config.ts
```

> **Importante**: La migración cambia `Cita.estado` de tipo `Estado` a `EstadoCita`. Revisar el SQL generado y añadir manualmente el cast si Prisma no lo genera correctamente.

---

## Fase 2: Módulo consultorio — Perfil público, Directorio, Servicios, Citas online

### Estructura de carpetas a crear

```
src/modules/consultorio/
├── domain/
│   ├── ports/
│   │   ├── IConsultorioPublicoRepository.ts
│   │   └── IConsultorioPublicoNotificador.ts
│   └── consultorio-publico.errors.ts
├── application/
│   ├── perfil-publico/
│   │   ├── activar-perfil-publico.usecase.ts
│   │   ├── desactivar-perfil-publico.usecase.ts
│   │   ├── actualizar-configuracion-publica.usecase.ts
│   │   └── obtener-perfil-publico.usecase.ts
│   ├── directorio-publico/
│   │   └── listar-directorio.usecase.ts
│   ├── servicios-publicos/
│   │   └── listar-servicios-publicos.usecase.ts
│   └── cita-online/
│       ├── consultar-disponibilidad.usecase.ts
│       ├── crear-cita-online.usecase.ts
│       ├── listar-mis-citas.usecase.ts
│       └── cancelar-cita-online.usecase.ts
├── infrastructure/
│   ├── consultorio-publico.prisma.repository.ts
│   ├── consultorio-publico.socket.notificador.ts
│   └── consultorio-publico.notificador.provider.ts
└── adapters/
    ├── consultorio-publica.rest.ts          (GET público — directorio, perfil, servicios, slots)
    ├── consultorio-consumer-citas.rest.ts   (POST consumer — citas online + mis-citas)
    ├── consultorio-staff-publico.rest.ts    (POST/PATCH staff — perfil, médicos, servicios, citas online)
    └── consultorio.schema.ts               (schemas Zod compartidos)
```

### Patrón de `IConsultorioPublicoRepository`

```typescript
export interface IConsultorioPublicoRepository {
  // Perfil
  resolveConsultorioInfo(slug: string): Promise<{ consultorioId: string; tenantId: string }>
  activarPerfil(tenantId: string, actorId: string): Promise<void>
  desactivarPerfil(tenantId: string, actorId: string): Promise<void>
  actualizarConfiguracion(consultorioId: string, data: Partial<ConsultorioPublicoConfig>): Promise<ConsultorioPublicoConfig>
  obtenerPerfil(slug: string): Promise<ConsultorioPublicoRaw | null>

  // Directorio
  listarDirectorio(params: DirectorioParams): Promise<{ data: ConsultorioDirectorioItem[]; total: number }>

  // Servicios
  listarServiciosPublicos(consultorioId: string, params: ServiciosParams): Promise<{ data: ServicioPublicoRaw[]; total: number }>
  setVisibilidadServicio(servicioId: string, consultorioId: string, visiblePublico: boolean, mostrarPrecio?: boolean): Promise<void>
  setVisibilidadMedico(medicoId: string, consultorioId: string, visiblePublico: boolean): Promise<void>

  // Disponibilidad
  getMedicoHorarios(medicoId: string, consultorioId: string): Promise<HorarioAtencion[]>
  getCitasEnRango(medicoId: string, desde: Date, hasta: Date): Promise<CitaRaw[]>

  // Citas online
  crearCitaOnline(data: CrearCitaOnlineInput): Promise<CitaRaw>
  getCitaById(citaId: string): Promise<CitaRaw | null>
  cancelarCitaOnline(citaId: string, consumerUserId: string): Promise<CitaRaw>
  listarMisCitas(consumerUserId: string, params: MisCitasParams): Promise<{ data: CitaRaw[]; total: number }>
  confirmarCitaOnline(citaId: string, consultorioId: string): Promise<CitaRaw>
  rechazarCitaOnline(citaId: string, consultorioId: string, motivo?: string): Promise<CitaRaw>
  listarCitasOnline(consultorioId: string, params: CitasOnlineParams): Promise<{ data: CitaRaw[]; total: number }>
}
```

### Cálculo de slots — `consultar-disponibilidad.usecase.ts`

```typescript
// Pseudocódigo
async ejecutar(slug, medicoId, servicioId, fechaDesde, fechaHasta) {
  const { consultorioId } = await repo.resolveConsultorioInfo(slug)
  const horarios = await repo.getMedicoHorarios(medicoId, consultorioId)
  const citas = await repo.getCitasEnRango(medicoId, fechaDesde, fechaHasta)
  const servicio = await repo.getServicio(servicioId, consultorioId)
  
  const slots = []
  for each día in rango(fechaDesde, fechaHasta):
    const horarioDia = horarios.find(h => h.diaSemana === díaSemana(día) && h.activo)
    if (!horarioDia) continue
    
    let cursor = parseHora(día, horarioDia.horaInicio)
    const fin = parseHora(día, horarioDia.horaFin)
    
    while cursor + servicio.duracionMin <= fin:
      const ocupado = citas.some(c => solapan(c.fechaHora, c.duracionMin, cursor, servicio.duracionMin))
      slots.push({ fechaHora: cursor, disponible: !ocupado })
      cursor += servicio.duracionMin * 60_000 // ms
  
  return { data: slots }
}
```

### Crear cita online — detección de conflicto concurrente

```typescript
// En repository, usar transacción:
async crearCitaOnline(data) {
  return prisma.$transaction(async (tx) => {
    // Verificar conflicto dentro de la transacción
    const conflicto = await tx.cita.findFirst({
      where: {
        medicoId: data.medicoId,
        fechaHora: data.fechaHora,
        estado: { notIn: ["CANCELADA", "CANCELADA_CLIENTE", "RECHAZADA"] }
      }
    })
    if (conflicto) throw new Error("SLOT_NO_DISPONIBLE")
    
    return tx.cita.create({
      data: {
        consultorioId: data.consultorioId,
        medicoId: data.medicoId,
        servicioId: data.servicioId,
        pacienteId: null,          // online booking — sin paciente registrado
        consumerUserId: data.consumerUserId,
        origenOnline: true,
        fechaHora: data.fechaHora,
        duracionMin: data.duracionMin,
        estado: "PENDIENTE",
        canalOrigen: "WEB",
        motivo: data.motivo,
        createdById: data.consumerUserId,
      }
    })
  })
}
```

---

## Fase 3: Módulo social — Consultorio social

### Estructura de carpetas a crear

```
src/modules/social/
├── domain/
│   ├── ports/
│   │   ├── IConsultorioSocialRepository.ts   (clonar IRestauranteSocialRepository)
│   │   └── IConsultorioSocialNotificador.ts  (clonar IRestauranteSocialNotificador)
│   └── consultorio-social.errors.ts
├── application/
│   ├── consultorio/                           (7 use cases — clonar restaurante/)
│   │   ├── reaccionar-consultorio.usecase.ts
│   │   ├── comentar-consultorio.usecase.ts
│   │   ├── responder-comentario-consultorio.usecase.ts
│   │   ├── valorar-consultorio.usecase.ts
│   │   ├── preguntar-consultorio.usecase.ts
│   │   ├── toggle-seguir-consultorio.usecase.ts
│   │   └── toggle-favorito-consultorio.usecase.ts
│   └── publicacion-consultorio/               (2 use cases)
│       ├── publicar-novedad-consultorio.usecase.ts
│       └── listar-publicaciones-consultorio.usecase.ts
├── infrastructure/
│   ├── consultorio-social.prisma.repository.ts     (clonar restaurante-social.prisma.repository.ts)
│   ├── consultorio-social.socket.notificador.ts    (clonar restaurante-social.socket.notificador.ts)
│   └── consultorio-social.notificador.provider.ts
└── adapters/
    ├── consultorio-social-publica.rest.ts      (GET público)
    ├── consultorio-social-consumer.rest.ts     (POST consumer)
    ├── consultorio-social-staff.rest.ts        (GET/POST/PATCH staff)
    └── social.router.ts                        (MODIFICAR — agregar nuevas rutas)
```

### Wiring en `social.router.ts`

```typescript
// Agregar al socialApp (rutas autenticadas consumer):
socialApp.route("/consultorios", consultorioSocialConsumerRouter)

// Agregar al socialApp staff:
socialApp.route("/staff/consultorios", consultorioSocialStaffRouter)

// Agregar al publicSocialApp:
publicSocialApp.route("/consultorios", consultorioSocialPublicaRouter)
```

---

## Fase 4: Wiring en `src/server/index.ts`

```typescript
// Agregar imports:
import { ConsultorioPublicoSocketNotificador } from "../modules/consultorio/infrastructure/consultorio-publico.socket.notificador.js"
import { setConsultorioPublicoNotificador } from "../modules/consultorio/infrastructure/consultorio-publico.notificador.provider.js"
import { ConsultorioSocialSocketNotificador } from "../modules/social/infrastructure/consultorio-social.socket.notificador.js"
import { setConsultorioSocialNotificador } from "../modules/social/infrastructure/consultorio-social.notificador.provider.js"
import { consultorioPublicaRouter } from "../modules/consultorio/adapters/consultorio-publica.rest.js"
import { consultorioConsumerCitasRouter } from "../modules/consultorio/adapters/consultorio-consumer-citas.rest.js"
import { consultorioStaffPublicoRouter } from "../modules/consultorio/adapters/consultorio-staff-publico.rest.js"

// Agregar rutas:
app.route("/api/public/consultorios", consultorioPublicaRouter)
app.route("/api/consumer/consultorios", consultorioConsumerCitasRouter)
app.route("/api/consultorio", consultorioStaffPublicoRouter)

// Agregar notificadores:
setConsultorioPublicoNotificador(new ConsultorioPublicoSocketNotificador(io))
setConsultorioSocialNotificador(new ConsultorioSocialSocketNotificador(io))
```

---

## Patrones críticos a respetar

1. **Guard `esConsultorio`**: Todos los endpoints de staff deben verificar `tenant.esConsultorio === true` antes de proceder.

2. **`requireRol("PROPIETARIO", "ADMIN")`**: Middleware existente en el proyecto para restringir a roles específicos.

3. **`resolveConsultorioInfo(slug)`**: Siempre usar para resolver slug → consultorioId + tenantId, con validación de que `esConsultorio = true`.

4. **Paginación**: Los listados usan `paginate()` de `core/query-params.ts` (offset-based). El módulo social usa cursor-based con `makeMeta()` — revisar `restaurante-social.prisma.repository.ts` para el patrón.

5. **Emisión de eventos sociales**: Emitir a `tenant:${tenantId}` Y `tenant:${tenantId}:consultorio` (igual que restaurante).

6. **Sin datos clínicos privados**: Ningún endpoint público o consumer debe exponer `HistoriaClinica`, `AtencionMedica`, `RecetaMedica`, `Paciente` ni datos de facturación.

---

## Tests

Seguir el patrón de `src/modules/restaurante/__tests__/` y `src/modules/social/__tests__/`:

- **Unit tests**: Usar repositorios en memoria (fake) para use cases
- **Integration tests**: Testcontainers con PostgreSQL real (todos los schemas migrados)
- **Happy path**: activar perfil → listar directorio → ver perfil → consultar slots → crear cita online → cancelar cita → valorar → seguir
