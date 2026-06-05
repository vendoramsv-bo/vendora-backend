# Constitución del Proyecto — VENDORA

> Documento fundacional para Spec-Driven Development con GitHub Spec-Kit.
> Ubicación destino: `.specify/memory/constitution.md`
> Estos principios son **NO-NEGOCIABLES**. Todo `/speckit.plan`, `/speckit.tasks`
> y `/speckit.implement` debe adherirse a ellos. Cualquier desviación requiere
> enmienda explícita de esta constitución.

---

## Visión del proyecto

VENDORA es una plataforma SaaS multi-tenant **extensible** que integra
verticales de negocio sobre un núcleo compartido, en un único backend. La
plataforma está diseñada para incorporar nuevas verticales con el tiempo sin
reescribir las existentes.

**Verticales del conjunto inicial:**

- **TuTienda** — comercio retail (catálogo, ventas, inventario)
- **TuConsultorio** — gestión de clínicas/consultorios médicos
- **TuRestaurant** — administración de restaurantes
- **Núcleo Tenant** — identidad, caja, catálogo y reportes compartidos

**Verticales futuras (ejemplos posibles):** hotel, gimnasio, taller mecánico,
inmobiliaria, peluquería, etc. Cada una se incorpora como un módulo aditivo
que reutiliza el núcleo compartido (ver Artículo II.1).

Un mismo Tenant puede activar cualquier combinación de verticales mediante
flags (`esTienda`, `esConsultorio`, `esRestaurante`, …). El conjunto de flags
crece con cada vertical nueva sin afectar a las anteriores.

---

## Artículo I — Stack tecnológico (versiones exactas)

Estas elecciones son obligatorias. No se introducen alternativas sin enmienda.

### Backend (proyecto independiente)
- **Runtime:** Node.js LTS (≥ 20)
- **Lenguaje:** TypeScript en modo `strict`
- **Framework HTTP:** Hono
- **API REST (móviles y terceros):** Hono + `@hono/zod-openapi`
- **Tiempo real:** Socket.IO (con Redis adapter para multi-instancia)
- **ORM:** Prisma 6+ (multi-file `prismaSchemaFolder` + `multiSchema`)
- **Base de datos:** PostgreSQL (schemas en español, ampliables)
- **Autenticación:** Better-Auth (plugins Organization + Admin)
- **Validación:** Zod (única fuente de verdad: valida, tipa y documenta)
- **Jobs en background:** BullMQ + Redis
- **Cache y pub/sub:** Redis (triple uso: cache, colas BullMQ, adapter Socket.IO)
- **Almacenamiento de archivos:** Cloudflare R2 (URLs prefirmadas) o Edgestore
- **Email transaccional:** Resend
- **Tests:** Vitest + Testcontainers (PostgreSQL real con todos los schemas)
- **Logs:** Pino (estructurados, etiquetados por tenant)

### Frontend (proyecto separado)
- Consume el backend vía REST para tosoa los casos. El frontend NO comparte runtime con el backend.
- Plataforma de deploy: **Cloudflare Pages** (CDN global, ideal para estáticos 
  de Next/React) o **Vercel**. El frontend SÍ puede vivir en el edge porque es stateless.

### Deployment — Render (NO-NEGOCIABLE)

El backend se despliega en **Render**, plataforma serverful (servidores
persistentes de larga duración). Esta elección es obligatoria porque la
arquitectura depende de conexiones WebSocket persistentes (Socket.IO) y workers
de cola de larga vida (BullMQ), que NO encajan en plataformas serverless edge.

**Topología desde un único proyecto backend:**

El backend es **un solo proyecto/repositorio independiente** (no un monorepo).
De ese mismo código se despliegan dos procesos en Render que comparten el build,
la base de datos y Redis:

```
Proyecto backend (repo único)  →  Render 
├── Web Service        → Hono + REST + Socket.IO
│                         (maneja HTTP y conexiones WebSocket persistentes)
├── Background Worker   → consumidores BullMQ
│                         (menú diario 7am, recordatorios de cita, reportes, etc.)
├── PostgreSQL          → gestionado por Render (schemas del proyecto)
└── Key Value (Redis)   → gestionado por Render
                          (triple uso: cache + colas BullMQ + adapter Socket.IO)
```

**Reglas de deployment:**
- El backend vive en **su propio repositorio**, separado del frontend. No se
  usa estructura de monorepo ni workspaces multi-paquete.
- El Web Service y el Background Worker son procesos **separados** que salen del
  mismo build del proyecto backend (mismos módulos, distinto punto de entrada),
  y comparten la misma base de datos y Redis.
- Co-localizar Web Service, PostgreSQL y Redis en la **misma región** para
  minimizar latencia.
- Socket.IO mantiene keepalive (ping/pong) automático para detectar conexiones
  obsoletas y sobrevivir reinicios de instancia.
- Implementar **graceful shutdown** (SIGTERM/SIGINT): cerrar conexiones
  WebSocket abiertas y drenar la cola antes de terminar.
- Healthchecks separados: liveness y readiness.
- Build reproducible vía Dockerfile multi-stage o runtime nativo de Node.

**Prohibiciones explícitas:**
- NO desplegar el backend en plataformas serverless edge (Cloudflare Workers,
  Vercel Functions) — rompen Socket.IO y BullMQ.
- NO microservicios. NO Kubernetes.
- NO reemplazar Socket.IO por Durable Objects ni BullMQ por Cloudflare Queues
  para forzar un deploy en edge.

---

## Artículo II — Arquitectura: Monolito Modular Hexagonal (NO-NEGOCIABLE)

### II.1 — Una sola base de código, módulos extensibles con fronteras estrictas
El backend es un **monolito modular**: una sola base de código que se despliega
como dos procesos del mismo build (Web Service + Background Worker, ver
Artículo I). Se organiza en **módulos verticales** que se montan sobre un
**núcleo compartido**, donde cada módulo espeja un schema de PostgreSQL.

**Esta arquitectura es ABIERTA a la extensión.** El conjunto de módulos NO es
fijo: la plataforma está diseñada para incorporar nuevas verticales de negocio
(nuevos SaaS) sin modificar las existentes. Agregar una vertical es una
operación aditiva — un schema nuevo, un módulo nuevo con su estructura
hexagonal, sus flags de capability en el Tenant — que no altera el núcleo ni
los demás módulos (principio Open/Closed).

**Módulos del núcleo compartido (siempre presentes):**
```
autenticacion · tenant · compartido · catalogo · almacen · ventas · inventario · social
```
Estos sostienen identidad, multi-tenancy, catálogo comercial, inventario, caja
universal e interacciones sociales. Cualquier vertical los reutiliza.

**Módulos de vertical de negocio (extensibles, conjunto inicial):**
```
consultorio · restaurante
```
A futuro pueden sumarse otras verticales (p. ej. `hotel`, `gimnasio`,
`taller`, `inmobiliaria`, etc.). Cada nueva vertical:
1. Define su propio schema de PostgreSQL (Artículo V).
2. Crea su módulo con la estructura hexagonal completa (Artículo II.2).
3. Agrega su flag de capability al Tenant (`esHotel`, `esGimnasio`, …) y su
   guard correspondiente (Artículo III.4).
4. Reutiliza el núcleo compartido (catálogo, caja, ventas, inventario) en lugar de
   duplicar esos conceptos.

> El conteo exacto de módulos es **informativo, no normativo**: refleja el
> estado actual del proyecto, no un límite. `/speckit.plan` y `/speckit.analyze`
> NO deben tratar la incorporación de una nueva vertical como violación
> constitucional, siempre que respete los puntos 1–4 anteriores.

Las dependencias entre módulos son **explícitas y unidireccionales**. Un
módulo solo importa de otro a través de sus puertos públicos, nunca de su
infraestructura interna. Las verticales pueden depender del núcleo compartido,
pero el núcleo NUNCA depende de una vertical concreta (así el núcleo permanece
agnóstico al conjunto de SaaS instalados). El Web Service y el Worker comparten
los mismos módulos: el Worker monta los casos de uso para ejecutarlos desde la
cola, el Web Service los monta para exponerlos vía REST/Socket.IO.

### II.2 — Arquitectura Hexagonal (Ports & Adapters) por módulo
Cada módulo se organiza en cuatro capas con dependencias **siempre hacia
adentro**:

```
modules/<modulo>/
├── domain/            ← Entidades + reglas de negocio puras + PUERTOS (interfaces)
│   ├── *.entity.ts    ← invariantes de negocio, CERO imports técnicos
│   ├── *.errors.ts    ← errores de dominio
│   └── ports/         ← interfaces (Repository, Notificador, etc.)
├── application/       ← Casos de uso. Orquestan dominio + puertos.
│   └── *.usecase.ts
├── infrastructure/    ← Adaptadores de SALIDA. Implementan los puertos.
│   ├── *.prisma.repository.ts
│   └── *.socket.notificador.ts
└── adapters/          ← Adaptadores de ENTRADA. Exponen los casos de uso.
    ├── *.rest.ts      ← rutas REST + OpenAPI
    └── *.schema.ts    ← Zod
```

**Reglas inquebrantables:**
1. El **dominio** (`domain/`) NO importa Prisma, Hono, Socket.IO ni
   ninguna librería de infraestructura. Solo TypeScript puro.
2. La **aplicación** (`application/`) solo conoce **puertos** (interfaces),
   nunca implementaciones concretas. Recibe dependencias por inyección.
3. La **infraestructura** implementa los puertos definidos en el dominio.
4. Los **adaptadores de entrada** (REST/jobs/sockets) cablean las
   implementaciones concretas a los casos de uso, y son delgados: validan,
   delegan y formatean. Cero lógica de negocio.
5. La lógica de negocio se escribe **una sola vez** en `application/` y se
   expone por múltiples adaptadores (REST, jobs) sin duplicarse.

### II.3 — Servicios agnósticos del transporte
Un caso de uso debe poder ejecutarse desde REST, desde un job de
BullMQ o desde un test, sin cambios. El transporte es un detalle.

---

## Artículo III — Multi-tenancy (NO-NEGOCIABLE)

### III.1 — Aislamiento por Tenant
Todo dato pertenece a un Tenant. Ninguna query puede "escaparse" de su tenant.

### III.2 — Resolución del tenant activo
Cada request resuelve `tenantId` y `userId` desde la sesión de Better-Auth
(`session.activeOrganizationId`). El handshake de Socket.IO usa el mismo token.

### III.3 — Prisma scopeado obligatorio
Las queries usan un cliente Prisma extendido que:
- Inyecta automáticamente `tenantId` en `create` para modelos con tenant.
- Filtra automáticamente por `tenantId` en `findMany`/`findUnique`/etc.
- Rellena automáticamente `createdById` y `updatedById` (auditoría) en las
  tablas principales designadas.

### III.4 — Guards por capability
Los endpoints de cada vertical verifican el flag correspondiente
(`esTienda` / `esConsultorio` / `esRestaurante`) antes de ejecutarse.

---

## Artículo IV — Consultas parametrizables (NO-NEGOCIABLE)

Toda recuperación de listas DEBE aceptar un contrato uniforme de parámetros y
NUNCA exponer queries sin acotar.

### IV.1 — Parámetros obligatorios soportados
1. **Cantidad de registros** (`take`, máximo 100, default 20).
2. **Paginación** por cursor (preferida) u offset (`skip`).
3. **Filtro por campo específico** (`filter: { field, op, value }`), con
   operadores `equals|contains|startsWith|endsWith|gt|gte|lt|lte|in`.
4. **Ordenamiento por campo específico** (`orderBy: { field, order }`), con
   `order` ∈ `asc|desc`, default `createdAt desc`.
5. **Búsqueda de texto libre** opcional (`search`) sobre campos designados.

### IV.2 — Campos permitidos acotados (seguridad)
Cada recurso declara explícitamente qué campos son **filtrables** y cuáles
**ordenables** mediante `makeQueryParamsSchema(filterables, ordenables)`. El
cliente NO puede filtrar ni ordenar por campos arbitrarios (previene queries
sin índice y fugas de información).

### IV.3 — Respuesta paginada uniforme
Toda lista responde con la forma:
```ts
{ data: T[], meta: { take, total, hasMore, nextCursor } }
```

### IV.4 — Implementación de referencia
El patrón canónico vive en `core/query-params.ts` (`makeQueryParamsSchema`,
`toPrismaArgs`, `paginate`). Todos los módulos lo reutilizan; no se reimplementa
paginación ad-hoc.

---

## Artículo V — Capa de datos

### V.1 — Schema Prisma modularizado
- Entrada en `prisma/schema.prisma` (generator + datasource).
- Modelos divididos en `prisma/NN-<schema>.prisma` por dominio.
- Cada modelo lleva `@@schema("<nombre_en_español>")`.
- Configuración vía `prisma.config.ts` (Prisma 6+).

### V.2 — Nomenclatura
- Schemas de PostgreSQL en **español**. Conjunto inicial: `autenticacion`,
  `tenant`, `compartido`, `catalogo`, `almacen`, `ventas`, `consultorio`, `inventario`
  `restaurante`, `social`. Cada nueva vertical de negocio agrega su propio
  schema en español (p. ej. `hotel`, `gimnasio`) sin renombrar los existentes.
- Modelos y campos en **español**, salvo las tablas de Better-Auth que usan
  `@@map()` a sus nombres requeridos (`organization`, `member`, etc.).

### V.3 — Auditoría
Las 39 tablas principales designadas incluyen `createdById` y `updatedById`
(referencias a `User.id` sin relación formal, pobladas por la Prisma extension).
Las tablas de detalle, logs y sociales NO se auditan (heredan del padre o el
`userId` propio).

### V.4 — Caja y catálogo universales
`Venta`, `Producto`, `AperturaCierreDeCaja` y todo el catálogo viven a nivel
Tenant. Cualquier vertical vende productos/servicios por el mismo flujo de caja.
Los reportes consolidados del tenant son una sola query.

---

## Artículo VI — Tiempo real (NO-NEGOCIABLE)

### VI.1 — Broadcast por tenant
Las mutaciones relevantes (crear/actualizar/eliminar de tenant, producto,
tienda, venta, reserva, etc.) emiten un evento Socket.IO a la sala
`tenant:${tenantId}`. Los usuarios conectados del mismo tenant actualizan su
UI sin recargar.

### VI.2 — Eventos emitidos desde la capa de aplicación
Los eventos se emiten **dentro del caso de uso** (vía el puerto `Notificador`),
NO en el adaptador. Así una mutación vía REST (móvil) también notifica a los
usuarios web. Una sola fuente de verdad para los eventos.

### VI.3 — Eventos tipados
Existe un contrato `ServerToClientEvents` compartido (paquete de tipos) que
tipa los sockets tanto en backend como en frontend.

### VI.4 — Salas por módulo opcionales
Además de `tenant:${id}`, se pueden usar sub-salas por contexto
(`tenant:${id}:cocina`, `tenant:${id}:caja`) para dirigir eventos a roles
específicos.

---

## Artículo VII — Autenticación y autorización

### VII.1 — Better-Auth como única fuente de identidad
`User`, `Session`, `Account`, `Verification` mapeados a tablas de Better-Auth.
`Tenant` → `organization`, `TenantMember` → `member`, `Invitacion` → `invitation`
vía el plugin Organization.

### VII.2 — Roles por vertical
El campo `role` del `member` es libre por vertical:
- Tienda: `PROPIETARIO|ADMIN|VENDEDOR|COMPRADOR|ALMACENERO`
- Consultorio: `PROPIETARIO|ADMIN|MEDICO|RECEPCIONISTA`
- Restaurante: `PROPIETARIO|ADMIN|ENCARGADO|VENDEDOR|CHEF|MESERO`

### VII.3 — El mismo token autentica HTTP y WebSocket
El handshake de Socket.IO valida la misma sesión de Better-Auth.

---

## Artículo VIII — Calidad y testing

### VIII.1 — El dominio se testea sin infraestructura
Las entidades y casos de uso se testean con repositorios e implementaciones de
puertos **en memoria** (fakes), sin tocar Prisma ni Socket.IO. Esto es posible
gracias al Artículo II.

### VIII.2 — Tests de integración con base real
Los adaptadores de infraestructura (Prisma repositories) se testean contra un
PostgreSQL real vía Testcontainers, con todos los schemas migrados.

### VIII.3 — Validación en el borde
Todo input externo (REST, jobs) se valida con Zod antes de llegar a la
capa de aplicación. El dominio asume que sus inputs ya son válidos en tipo.

### VIII.4 — Type-safety end-to-end
Como backend y frontend son repositorios independientes (sin monorepo), los
tipos se comparten mediante un **paquete npm publicado** (registry privado), no
vía workspaces:
- Los `ServerToClientEvents` de Socket.IO se publican en el mismo paquete.
- El spec OpenAPI se genera desde los schemas Zod para consumidores REST
  (móviles y terceros), que generan su cliente a partir de ese spec.

---

## Artículo IX — Convenciones de código

### IX.1 — Idioma
Código de dominio, nombres de modelos, variables y comentarios en **español**.
Términos técnicos universales (repository, usecase, adapter, port) pueden
quedar en inglés por convención de la arquitectura hexagonal.

### IX.2 — Estructura de un módulo nuevo
Todo módulo nuevo replica la estructura hexagonal del Artículo II.2. No se
permite lógica de negocio fuera de `domain/` y `application/`.

### IX.3 — Errores
Los errores de negocio son clases de dominio (`*.errors.ts`) que los
adaptadores mapean a códigos HTTP. El dominio no conoce códigos HTTP.

### IX.4 — Sin lógica en adaptadores
Controllers REST: validar → llamar caso de uso → formatear respuesta.
Si un adaptador tiene un `if` de negocio, está mal ubicado.

---

## Gobernanza

Esta constitución prevalece sobre cualquier decisión ad-hoc. Las enmiendas
requieren actualizar este documento y propagar los cambios a los specs y planes
dependientes. `/speckit.plan` debe validar cada decisión contra estos artículos
y reportar cualquier violación antes de generar tareas.

**Versión:** 1.4.0
**Última actualización:** propagar con cada enmienda.

### Registro de enmiendas
- **1.4.0** — Artículo I (Deployment) y VIII.4: el backend se define como **un
  solo proyecto/repositorio independiente desplegable en Render**, NO un
  monorepo. Los dos procesos (Web Service + Background Worker) salen del mismo
  build de ese proyecto único. El frontend permanece en su propio repositorio.
  Los tipos compartidos (`ServerToClientEvents`) se distribuyen vía
  paquete npm publicado, no vía workspaces de monorepo.
- **1.3.0** — Renombrado: el proyecto pasa de `TuPlataformaAmiga` a **VENDORA**.
  Verticales simplificadas: `TuTiendaAmiga` → **TuTienda**, `TuConsultorioAmigo`
  → **TuConsultorio**. `TuRestaurant` se mantiene. Cambio puramente nominal; no
  afecta arquitectura, schemas ni flags de capability.
- **1.2.0** — Visión y Artículo II.1: la arquitectura se declara explícitamente
  **abierta a la extensión**. El conjunto de módulos/verticales deja de ser un
  número fijo ("9 módulos") y pasa a ser un núcleo compartido + verticales
  extensibles. Se documenta el procedimiento para incorporar una vertical nueva
  (schema + módulo hexagonal + flag de capability + reutilización del núcleo) y
  se aclara que `/speckit.plan` y `/speckit.analyze` NO deben tratar una nueva
  vertical como violación constitucional. Artículo V.2 y Visión actualizados en
  consecuencia.
- **1.1.0** — Artículo I: se fija **Render** como plataforma de deploy del
  backend (topología de dos servicios: Web Service + Background Worker), con
  PostgreSQL y Redis gestionados. Frontend a **Cloudflare Pages**. Se prohíbe
  explícitamente desplegar el backend en serverless edge (rompe Socket.IO y
  BullMQ). Reemplaza la mención previa de Railway/Fly.io.
- **1.0.0** — Versión inicial consolidando los 9 artículos.
