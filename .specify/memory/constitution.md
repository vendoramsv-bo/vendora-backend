<!--
SYNC IMPACT REPORT — VENDORA Constitution

Version change: 1.4.0 → 1.5.0
Amendment: Eliminación de tRPC del stack tecnológico. API REST pura con
           Hono + @hono/zod-openapi como única capa de transporte HTTP.

Modified Principles:
  - All sections were placeholder tokens; fully replaced.

Added Sections:
  - Visión del Proyecto (project scope, verticals, extensibility model)
  - Artículo I   — Stack Tecnológico
  - Artículo II  — Arquitectura: Monolito Modular Hexagonal
  - Artículo III — Multi-tenancy
  - Artículo IV  — Consultas Parametrizables
  - Artículo V   — Capa de Datos
  - Artículo VI  — Tiempo Real
  - Artículo VII — Autenticación y Autorización
  - Artículo VIII — Calidad y Testing
  - Artículo IX  — Convenciones de Código
  - Gobernanza (with full amendment log)

Removed Sections:
  - Generic template placeholders: SECTION_2_NAME, SECTION_3_NAME

Templates Requiring Updates:
  - .specify/templates/plan-template.md  ✅ Aligned — Constitution Check is a generic placeholder
  - .specify/templates/spec-template.md  ✅ Aligned — no VENDORA-specific conflicts
  - .specify/templates/tasks-template.md ✅ Aligned — testing discipline aligns with Artículo VIII

Follow-up TODOs:
  - TODO(RATIFICATION_DATE): Original formal adoption date is not recorded in the source document.
    Set this field once the team formally ratifies this constitution.
-->

# VENDORA Constitution

## Visión del Proyecto

VENDORA es una plataforma SaaS multi-tenant **extensible** que integra verticales de negocio
sobre un núcleo compartido, en un único backend. La plataforma incorpora nuevas verticales con
el tiempo sin reescribir las existentes.

**Verticales del conjunto inicial:**
- **TuTienda** — comercio retail (catálogo, ventas, inventario)
- **TuConsultorio** — gestión de clínicas/consultorios médicos
- **TuRestaurant** — administración de restaurantes
- **Núcleo Tenant** — identidad, caja, catálogo y reportes compartidos

**Extensibilidad:** Un mismo Tenant puede activar cualquier combinación de verticales mediante
flags (`esTienda`, `esConsultorio`, `esRestaurante`, …). El conjunto de flags crece con cada
vertical nueva sin afectar a las anteriores. Verticales futuras (hotel, gimnasio, taller,
inmobiliaria, etc.) se incorporan como módulos aditivos que reutilizan el núcleo compartido.

## Core Principles

### Artículo I — Stack Tecnológico (NO-NEGOCIABLE)

Estas elecciones son obligatorias. No se introducen alternativas sin enmienda constitucional.

**Backend (repositorio independiente):**
- Runtime: Node.js LTS (≥ 20) · Lenguaje: TypeScript en modo `strict`
- Framework HTTP: Hono · API REST (web propia y terceros): Hono + `@hono/zod-openapi`
- Tiempo real: Socket.IO con Redis adapter (multi-instancia)
- ORM: Prisma 7 (`prismaSchemaFolder` + `multiSchema`) · BD: PostgreSQL
- Autenticación: Better-Auth (plugins Organization + Admin)
- Validación: Zod (única fuente de verdad: valida, tipa y documenta)
- Jobs en background: BullMQ + Redis
- Cache y pub/sub: Redis (triple uso: cache, colas BullMQ, adapter Socket.IO)
- Almacenamiento: Cloudflare R2 (URLs prefirmadas) · Email transaccional: Resend
- Tests: Vitest + Testcontainers (PostgreSQL real con todos los schemas) · Logs: Pino

**Frontend (repositorio separado):** Consume el backend vía REST (OpenAPI). Deploy en
Cloudflare Pages. El frontend NO comparte runtime con el backend.

**Deploy — Render (NO-NEGOCIABLE):**
El backend se despliega en Render (serverful — servidores persistentes de larga duración).
Esta elección es obligatoria porque la arquitectura depende de conexiones WebSocket persistentes
(Socket.IO) y workers de cola de larga vida (BullMQ), que no encajan en plataformas serverless
edge. Un solo repositorio produce dos procesos via `render.yaml`:

```
Repositorio backend → Render Blueprint: render.yaml
├── Web Service      → Hono + REST (OpenAPI) + Socket.IO
├── Background Worker → consumidores BullMQ
├── PostgreSQL       → gestionado por Render
└── Key Value (Redis) → gestionado por Render
```

Reglas de deployment:
- Web Service y Background Worker son procesos separados del mismo build (distinto punto de entrada).
- Implementar graceful shutdown (SIGTERM/SIGINT): cerrar WebSockets y drenar la cola.
- Healthchecks separados: liveness y readiness.
- Co-localizar Web Service, PostgreSQL y Redis en la misma región.

**Prohibiciones explícitas:**
- NO desplegar el backend en serverless edge (Cloudflare Workers, Vercel Functions).
- NO microservicios. NO Kubernetes.
- NO reemplazar Socket.IO por Durable Objects ni BullMQ por Cloudflare Queues.
- NO estructura de monorepo ni workspaces multi-paquete para el backend.

### Artículo II — Arquitectura: Monolito Modular Hexagonal (NO-NEGOCIABLE)

**II.1 — Una sola base de código, módulos extensibles con fronteras estrictas**

El backend es un monolito modular: una sola base de código desplegada como dos procesos del
mismo build. Se organiza en módulos verticales sobre un núcleo compartido; cada módulo espeja
un schema de PostgreSQL.

Módulos del núcleo compartido (siempre presentes):
`autenticacion · tenant · compartido · catalogo · almacen · ventas · social`

Módulos de vertical (conjunto inicial extensible):
`consultorio · restaurante`

Agregar una vertical DEBE seguir este procedimiento:
1. Definir su propio schema de PostgreSQL (Artículo V).
2. Crear su módulo con estructura hexagonal completa (Artículo II.2).
3. Agregar su flag de capability al Tenant y su guard (Artículo III.4).
4. Reutilizar el núcleo compartido; NO duplicar catálogo, caja ni ventas.

Las dependencias entre módulos son explícitas y unidireccionales. Las verticales pueden
depender del núcleo, pero el núcleo NUNCA depende de una vertical concreta.

**II.2 — Arquitectura Hexagonal (Ports & Adapters) por módulo**

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
    ├── *.rest.ts      ← rutas REST + OpenAPI (Hono + zod-openapi)
    └── *.schema.ts    ← Zod
```

Reglas inquebrantables:
1. `domain/` NO importa Prisma, Hono, Socket.IO ni ninguna librería de infraestructura.
2. `application/` solo conoce puertos (interfaces), nunca implementaciones concretas.
3. `infrastructure/` implementa los puertos definidos en el dominio.
4. Los adaptadores de entrada son delgados: validar → delegar → formatear. Cero lógica de negocio.
5. La lógica de negocio se escribe UNA SOLA VEZ en `application/` y se expone por múltiples
   adaptadores sin duplicarse.

**II.3 — Servicios agnósticos del transporte**

Un caso de uso DEBE poder ejecutarse desde REST, BullMQ o un test sin cambios.
El transporte es un detalle de implementación.

### Artículo III — Multi-tenancy (NO-NEGOCIABLE)

- **III.1 — Aislamiento por Tenant:** Todo dato pertenece a un Tenant. Ninguna query puede
  escapar de su tenant.
- **III.2 — Resolución del tenant activo:** Cada request resuelve `tenantId` y `userId` desde
  la sesión de Better-Auth (`session.activeOrganizationId`). El handshake de Socket.IO usa el
  mismo token.
- **III.3 — Prisma scopeado obligatorio:** Las queries usan un cliente Prisma extendido que:
  (a) inyecta automáticamente `tenantId` en `create` para modelos con tenant;
  (b) filtra automáticamente por `tenantId` en `findMany`/`findUnique`/etc.;
  (c) rellena automáticamente `createdById` y `updatedById` en las 39 tablas principales.
- **III.4 — Guards por capability:** Los endpoints de cada vertical verifican el flag
  correspondiente (`esTienda` / `esConsultorio` / `esRestaurante`) antes de ejecutarse.

### Artículo IV — Consultas Parametrizables (NO-NEGOCIABLE)

Toda recuperación de listas DEBE aceptar un contrato uniforme de parámetros y NUNCA exponer
queries sin acotar.

**Parámetros obligatorios soportados:**
1. **Cantidad:** `take` (máximo 100, default 20).
2. **Paginación:** cursor (preferida) u offset (`skip`).
3. **Filtro:** `{ field, op, value }` — operadores: `equals|contains|startsWith|endsWith|gt|gte|lt|lte|in`.
4. **Orden:** `{ field, order }` — `order ∈ asc|desc`, default `createdAt desc`.
5. **Búsqueda:** `search` opcional sobre campos designados.

**Campos permitidos acotados (seguridad):** Cada recurso declara explícitamente qué campos son
filtrables y ordenables mediante `makeQueryParamsSchema(filterables, ordenables)`. El cliente NO
puede filtrar ni ordenar por campos arbitrarios.

**Respuesta paginada uniforme:**
```ts
{ data: T[], meta: { take, total, hasMore, nextCursor } }
```

**Implementación de referencia:** El patrón canónico vive en `core/query-params.ts`
(`makeQueryParamsSchema`, `toPrismaArgs`, `paginate`). Todos los módulos lo reutilizan;
NO se reimplementa paginación ad-hoc.

### Artículo V — Capa de Datos

- **V.1 — Schema Prisma modularizado:** Entrada en `prisma/schema.prisma` (generator +
  datasource). Modelos en `prisma/models/NN-<schema>.prisma` por dominio. Cada modelo lleva
  `@@schema("<nombre_en_español>")`. Configuración vía `prisma.config.ts` (Prisma 7).
- **V.2 — Nomenclatura:** Schemas de PostgreSQL en español. Conjunto inicial: `autenticacion`,
  `tenant`, `compartido`, `catalogo`, `almacen`, `ventas`, `consultorio`, `restaurante`,
  `social`. Nuevas verticales agregan su propio schema en español sin renombrar los existentes.
  Modelos y campos en español, salvo tablas de Better-Auth que usan `@@map()` a sus nombres
  requeridos (`organization`, `member`, etc.).
- **V.3 — Auditoría:** Las 39 tablas principales designadas incluyen `createdById` y
  `updatedById` (referencias a `User.id`, pobladas por la Prisma extension). Tablas de detalle,
  logs y sociales NO se auditan.
- **V.4 — Caja y catálogo universales:** `Venta`, `Producto`, `AperturaCierreDeCaja` y el
  catálogo completo viven a nivel Tenant. Cualquier vertical vende por el mismo flujo de caja.

### Artículo VI — Tiempo Real (NO-NEGOCIABLE)

- **VI.1 — Broadcast por tenant:** Las mutaciones relevantes emiten un evento Socket.IO a la
  sala `tenant:${tenantId}`. Los usuarios conectados del mismo tenant actualizan su UI sin
  recargar.
- **VI.2 — Eventos desde la capa de aplicación:** Los eventos se emiten DENTRO del caso de
  uso (vía el puerto `Notificador`), NO en el adaptador. Una mutación vía REST también notifica
  a los usuarios web. Una sola fuente de verdad para los eventos.
- **VI.3 — Eventos tipados:** Existe un contrato `ServerToClientEvents` compartido (paquete de
  tipos) que tipa los sockets tanto en backend como en frontend.
- **VI.4 — Salas por módulo opcionales:** Además de `tenant:${id}`, se pueden usar sub-salas
  por contexto (`tenant:${id}:cocina`, `tenant:${id}:caja`) para dirigir eventos a roles
  específicos.

### Artículo VII — Autenticación y Autorización

- **VII.1 — Better-Auth como única fuente de identidad:** `User`, `Session`, `Account`,
  `Verification` mapeados a tablas de Better-Auth. `Tenant` → `organization`, `TenantMember`
  → `member`, `Invitacion` → `invitation` vía el plugin Organization.
- **VII.2 — Roles por vertical:** El campo `role` del `member` es libre por vertical:
  - Tienda: `PROPIETARIO|ADMIN|VENDEDOR|BODEGUERO`
  - Consultorio: `ADMIN|MEDICO|RECEPCIONISTA`
  - Restaurante: `PROPIETARIO|ADMIN|ENCARGADO|VENDEDOR|CHEF|MESERO`
- **VII.3 — Token unificado:** El mismo token de sesión autentica HTTP y WebSocket.
  El handshake de Socket.IO valida la misma sesión de Better-Auth.

### Artículo VIII — Calidad y Testing

- **VIII.1 — El dominio se testea sin infraestructura:** Las entidades y casos de uso se
  testean con repositorios e implementaciones de puertos EN MEMORIA (fakes), sin tocar Prisma
  ni Socket.IO. Esto es posible gracias a la arquitectura hexagonal del Artículo II.
- **VIII.2 — Tests de integración con base real:** Los adaptadores de infraestructura (Prisma
  repositories) se testean contra un PostgreSQL real vía Testcontainers, con todos los schemas
  migrados.
- **VIII.3 — Validación en el borde:** Todo input externo (REST, jobs) se valida con
  Zod ANTES de llegar a la capa de aplicación. El dominio asume que sus inputs ya son válidos
  en tipo.
- **VIII.4 — Type-safety end-to-end:** El spec OpenAPI se genera automáticamente desde los
  schemas Zod (`@hono/zod-openapi`) y se publica como paquete npm (p.ej. `@vendora/api-types`)
  para consumidores REST (frontend y terceros). Los tipos `ServerToClientEvents` de Socket.IO
  se distribuyen en el mismo paquete. NO se usan workspaces de monorepo.

### Artículo IX — Convenciones de Código

- **IX.1 — Idioma:** Código de dominio, nombres de modelos, variables y comentarios en español.
  Términos técnicos universales (repository, usecase, adapter, port) pueden quedar en inglés
  por convención de la arquitectura hexagonal.
- **IX.2 — Estructura de un módulo nuevo:** Todo módulo nuevo replica la estructura hexagonal
  del Artículo II.2. No se permite lógica de negocio fuera de `domain/` y `application/`.
- **IX.3 — Errores:** Los errores de negocio son clases de dominio (`*.errors.ts`). Los
  adaptadores REST los mapean a códigos HTTP. El dominio NO conoce códigos HTTP.
- **IX.4 — Sin lógica en adaptadores:** Controllers REST DEBEN seguir el patrón
  validar → llamar caso de uso → formatear respuesta. Si un adaptador tiene un `if` de negocio,
  está mal ubicado.

## Gobernanza

Esta constitución prevalece sobre cualquier decisión ad-hoc. Los artículos marcados
NO-NEGOCIABLE SOLO pueden modificarse mediante enmienda explícita de este documento.

**Procedimiento de enmienda:**
1. Actualizar este documento en `.specify/memory/constitution.md`.
2. Propagar cambios a specs, planes y tareas dependientes.
3. Incrementar la versión según semver:
   - MAJOR: cambios incompatibles en principios/arquitectura/governance.
   - MINOR: nueva sección o guía materialmente expandida.
   - PATCH: correcciones, aclaraciones, ajustes de redacción.
4. Registrar el cambio en el Registro de Enmiendas con descripción del impacto.
5. `/speckit-plan` DEBE validar cada decisión contra estos artículos y reportar
   violaciones antes de generar tareas. Cualquier desviación requiere justificación
   explícita en la sección Complexity Tracking del plan.

**Registro de Enmiendas:**
- **1.5.1** — Artículo I y V.1: versión de Prisma actualizada de `6+` a `7`.
- **1.5.0** — Artículo I: tRPC eliminado del stack. La API tipada se reemplaza por
  REST puro con Hono + `@hono/zod-openapi` (genera spec OpenAPI desde schemas Zod).
  Artículos II.2, II.3, VIII.3, VIII.4, IX.3, IX.4 actualizados en consecuencia.
  El frontend consume REST en lugar de tRPC; los tipos se comparten vía el spec OpenAPI
  publicado como paquete npm.
- **1.4.0** — Artículo I (Deployment) y VIII.4: backend definido como repositorio
  independiente en Render. Web Service + Background Worker del mismo build. Tipos compartidos
  vía paquete npm publicado, no vía workspaces de monorepo.
- **1.3.0** — Renombrado: proyecto pasa de `TuPlataformaAmiga` a **VENDORA**. Verticales
  simplificadas: `TuTiendaAmiga` → TuTienda, `TuConsultorioAmigo` → TuConsultorio.
  TuRestaurant se mantiene. Cambio puramente nominal; no afecta arquitectura ni schemas.
- **1.2.0** — Arquitectura declarada explícitamente abierta a la extensión. El conjunto de
  módulos/verticales deja de ser un número fijo. Se documenta el procedimiento para incorporar
  una vertical nueva.
- **1.1.0** — Render fijado como plataforma de deploy del backend. Frontend a Cloudflare Pages.
  Prohibición explícita de serverless edge para el backend.
- **1.0.0** — Versión inicial consolidando los 9 artículos.

**Version**: 1.5.1 | **Ratified**: TODO(RATIFICATION_DATE): fecha de adopción formal no registrada en el documento fuente | **Last Amended**: 2026-05-21
