# Especificación — Migración a OpenAPI documentado (`@hono/zod-openapi`)

## Objetivo

Poblar `GET /api/openapi.json` con la totalidad de los endpoints del backend
usando la integración nativa de `@hono/zod-openapi`. Hoy el spec devuelve
`{ "paths": {} }` porque todos los routers usan `new Hono()` con rutas plain
(`.get`, `.post`…) en lugar de `createRoute` + `app.openapi()`.

Al terminar, cualquier cliente (Swagger UI, herramienta de generación de SDK,
Scalar, etc.) debe poder consumir `/api/openapi.json` y obtener la descripción
completa de todos los endpoints: operationId, parámetros, cuerpo de request y
shape de la respuesta exitosa.

---

## Alcance — módulos y endpoints

Todos los archivos `.rest.ts` y `*-router.ts` de `src/modules/`. A continuación
el inventario agrupado por módulo. Los prefijos de montaje están en
`src/server/hono.ts` e `src/server/index.ts`.

### AUTENTICACIÓN — `/api/auth/**` + `DELETE /api/user`
- Rutas de Better-Auth delegadas al handler catch-all (`all /auth/*`)
- `DELETE /api/user` — eliminar cuenta del usuario autenticado

### TENANT — `/api/tenant`
- `GET /` — listar tenants del usuario (paginado)
- `GET /actual` — tenant activo + propietario
- `GET /miembros` — miembros del tenant activo (paginado)
- `GET /invitaciones` — invitaciones pendientes (requiere PROPIETARIO o ADMIN)

### CATÁLOGO — `/api/catalogo`
- `GET /cla-actividades`, `GET /actividades`, `POST /actividades`, `DELETE /actividades/:id`
- `GET /cla-unidades`, `GET /unidades`, `POST /unidades`, `PUT /unidades/:id`
- `GET /categorias`, `POST /categorias`, `GET /categorias/:id`, `PUT /categorias/:id`, `PATCH /categorias/:id/estado`
- `GET /productos`, `POST /productos`, `GET /productos/verificar-codigo`
- `POST /productos/alta-masiva`
- `GET /productos/:id`, `PUT /productos/:id`, `DELETE /productos/:id`, `PATCH /productos/:id/estado`
- `GET /productos/:id/precio-historico`
- `GET /productos/:id/atributos`, `POST /productos/:id/atributos`
- `POST /productos/:id/atributos/:attrId/valores`, `DELETE /productos/:id/atributos/:attrId/valores/:valId`
- `GET /productos/:id/variantes`, `POST /productos/:id/variantes`, `PUT /productos/:id/variantes/:varId`
- `GET /productos/:id/variantes/propuesta`, `POST /productos/:id/variantes/confirmar`
- `PATCH /productos/:id/variantes/:varId/estado`
- `GET /productos/:id/precios-volumen`, `POST /productos/:id/precios-volumen`, `DELETE /productos/:id/precios-volumen/:pvId`
- `GET /productos/:id/opciones`, `POST /productos/:id/opciones`, `PUT /productos/:id/opciones/:opId`
- `GET /productos/:id/ofertas`, `POST /productos/:id/ofertas`, `PUT /productos/:id/ofertas/:ofId`

### ALMACÉN — `/api/almacen`
- `GET /ingresos`, `POST /ingresos`, `GET /ingresos/:ingresoId`, `PATCH /ingresos/:ingresoId`, `POST /ingresos/:ingresoId/aprobar`
- `GET /salidas`, `POST /salidas`, `GET /salidas/:salidaId`, `PATCH /salidas/:salidaId`, `POST /salidas/:salidaId/aprobar`
- `GET /recuentos`, `POST /recuentos` (almacén de insumos)
- `GET /insumos`, `POST /insumos`, `GET /insumos/:id`, `PATCH /insumos/:id`, `PATCH /insumos/:id/estado`, `DELETE /insumos/:id`
- `GET /insumos/:id/movimientos`, `POST /insumos/:id/ajuste`
- `GET /variantes/:varianteId/stock`, `GET /variantes/:varianteId/movimientos`
- `POST /inicializar`
- `GET /ajustes`, `POST /ajustes`, `GET /ajustes/:ajusteId`, `PATCH /ajustes/:ajusteId`, `POST /ajustes/:ajusteId/aprobar`
- `GET /recuentos`, `POST /recuentos`, `GET /recuentos/:recuentoId`, `PATCH /recuentos/:recuentoId`, `POST /recuentos/:recuentoId/aprobar` (inventario)
- `GET /productos/:productoId/receta`, `PUT /productos/:productoId/receta`, `DELETE /productos/:productoId/receta`
- `POST /consumo`

### VENTAS — `/api/ventas`
- **Cajas:** `GET /cajas`, `GET /cajas/:id`, `POST /cajas/abrir`, `POST /cajas/:id/cerrar`, `POST /cajas/:id/ingresos`, `POST /cajas/:id/egresos`
- **Clientes:** `GET /clientes`, `POST /clientes`, `GET /clientes/:id`, `PATCH /clientes/:id`, `PATCH /clientes/:id/estado`
- **Proveedores:** `GET /proveedores`, `POST /proveedores`, `GET /proveedores/:id`, `PATCH /proveedores/:id`, `PATCH /proveedores/:id/estado`, `DELETE /proveedores/:id`
- **Compras:** `GET /compras`, `POST /compras`, `GET /compras/:id`, `PATCH /compras/:id`, `DELETE /compras/:id`
- `POST /compras/:id/detalles`, `PATCH /compras/:id/detalles/:detalleId`, `DELETE /compras/:id/detalles/:detalleId`
- `POST /compras/:id/costos`, `PATCH /compras/:id/costos/:costoId`, `DELETE /compras/:id/costos/:costoId`
- `POST /compras/:id/confirmar`
- **Gastos:** `GET /gastos`, `POST /gastos`, `PATCH /gastos/:id`, `DELETE /gastos/:id`
- **Pedidos:** `GET /pedidos`, `GET /pedidos/:id`, `POST /pedidos`, `PATCH /pedidos/:id/estado`, `POST /pedidos/:id/convertir-en-venta`
- **Puntos de venta:** `GET /puntos-venta`, `POST /puntos-venta`, `PATCH /puntos-venta/:id`, `PATCH /puntos-venta/:id/estado`
- **Turnos:** `GET /turnos`, `POST /turnos`, `PATCH /turnos/:id`, `PATCH /turnos/:id/estado`
- **Ventas:** `GET /ventas`, `GET /ventas/:id`, `POST /ventas`, `POST /ventas/:id/confirmar`
- **Reportes:** `GET /ventas/reporte-consolidado`

### CONSULTORIO — `/api/consultorio`
- **Perfil:** `GET /perfil`, `PUT /perfil`, `GET /auditoria`
- **Médicos:** `GET /medicos`, `POST /medicos`, `GET /medicos/:id`, `PUT /medicos/:id`, `DELETE /medicos/:id`
- `GET /medicos/:id/horarios`, `POST /medicos/:id/horarios`, `DELETE /medicos/:id/horarios/:horarioId`
- **Pacientes:** `GET /pacientes`, `POST /pacientes`, `GET /pacientes/:id`, `PUT /pacientes/:id`
- `GET /pacientes/:id/vacunaciones`, `POST /pacientes/:id/vacunaciones`
- **Citas:** `GET /citas`, `POST /citas`, `GET /citas/:id`, `POST /citas/:id/confirmar`, `POST /citas/:id/cancelar`, `POST /citas/:id/no-asistio`
- **Historias clínicas:** `GET /historias`, `POST /historias`, `GET /historias/:id`, `PUT /historias/:id`
- `PUT /historias/:id/odontologia`, `PUT /historias/:id/pediatria`, `PUT /historias/:id/general`, `PUT /historias/:id/perinatal`
- `POST /historias/:id/perinatal/controles`, `POST /historias/:id/adjuntos`
- **Atenciones médicas:** `GET /atenciones`, `POST /atenciones`, `GET /atenciones/:id`, `PATCH /atenciones/:id`, `POST /atenciones/:id/pagos`, `POST /atenciones/:id/anular`
- **Recetas médicas:** `GET /recetas`, `POST /recetas`, `GET /recetas/:id`, `POST /recetas/:id/anular`
- **Servicios médicos:** `GET /servicios`, `POST /servicios`, `GET /servicios/:id`, `PUT /servicios/:id`
- **Vacunaciones:** `GET /pacientes/:pacienteId/vacunaciones`, `POST /pacientes/:pacienteId/vacunaciones`, `DELETE /pacientes/:pacienteId/vacunaciones/:id`

### CONSULTORIO PÚBLICO Y CONSUMER — `/api/public/consultorios`, `/api/consumer/consultorios`, `/api/consultorio`
- `GET /public/consultorios` — directorio público (con filtros y paginación)
- `GET /public/consultorios/:slug` — perfil público
- `GET /public/consultorios/:slug/servicios` — servicios públicos
- `GET /public/consultorios/:slug/disponibilidad` — disponibilidad de agenda
- `POST /consumer/consultorios/:slug/citas` — solicitar cita en línea
- `GET /consumer/mis-citas` — mis citas activas
- `PATCH /consumer/mis-citas/:citaId/cancelar` — cancelar cita
- `POST /consultorio/activar-perfil-publico`, `POST /consultorio/desactivar-perfil-publico`
- `PATCH /consultorio/configuracion-publica`
- `PATCH /consultorio/medicos/:medicoId/visibilidad`, `PATCH /consultorio/servicios/:servicioId/visibilidad`
- `GET /consultorio/citas-online`, `PATCH /consultorio/citas-online/:citaId/confirmar`, `PATCH /consultorio/citas-online/:citaId/rechazar`

### RESTAURANTE — `/api/restaurante`, `/api/public/restaurante`, `/api/public/restaurantes`, `/api/staff/restaurante/perfil`, `/api/consumer`
- **Perfil staff:** `GET /perfil`, `PUT /perfil`
- **Tiempos de comida:** `GET /tiempos-comida`, `POST /tiempos-comida`, `GET /tiempos-comida/:id`, `PUT /tiempos-comida/:id`, `DELETE /tiempos-comida/:id`
- **Menús (staff):** `GET /menus`, `POST /menus`, `GET /menus/:id`, `PUT /menus/:id`, `PATCH /menus/:id/estado`
- **Ítems de menú:** `GET /menus/:menuId/items`, `POST /menus/:menuId/items`, `PUT /menus/:menuId/items/:itemId`, `DELETE /menus/:menuId/items/:itemId`
- **Reservas (staff):** `GET /reservas`, `GET /reservas/:id`, `PATCH /reservas/:id/estado`, `POST /reservas/:id/pagar`
- **Cocina:** `GET /cocina`, `PATCH /cocina/items/:detalleId/estado`
- **Publicaciones RRSS:** `GET /publicaciones`, `POST /publicaciones`, `GET /publicaciones/:id`, `DELETE /publicaciones/:id`
- **Perfil público staff:** `POST /activar`, `POST /desactivar`, `GET /configuracion`, `PATCH /configuracion`
- **Directorio público:** `GET /public/restaurantes` — directorio con filtros/paginación
- **Perfil público:** `GET /public/restaurantes/:slug`
- **Menús públicos:** `GET /public/restaurantes/:slug/menus`, `GET /public/restaurantes/:slug/menus/:menuId`
- **Reservas públicas:** `POST /public/restaurantes/:slug/reservas`
- **Consumer reservas:** `GET /consumer/mis-reservas`

### TIENDA — `/api/tenant`, `/api/public/tiendas`
- `PATCH /tenant/tienda/activar`, `PATCH /tenant/tienda/desactivar`
- `GET /tenant/tienda/configuracion`, `PATCH /tenant/tienda/configuracion`
- `GET /tenant/tienda/destacados`, `POST /tenant/tienda/destacados`, `DELETE /tenant/tienda/destacados/:productoId`, `PATCH /tenant/tienda/destacados/reordenar`
- `GET /public/tiendas` — directorio público
- `GET /public/tiendas/:slug` — perfil de tienda
- `GET /public/tiendas/:slug/productos` — catálogo público

### SOCIAL — `/api/social`, `/api/public/social`
- **Producto (consumer):** `POST /social/productos/:productoId/reaccionar`, `POST /social/productos/:productoId/comentarios`, `PUT /social/comentarios/producto/:comentarioId`, `DELETE /social/comentarios/producto/:comentarioId`, `POST /social/productos/:productoId/valorar`, `POST /social/productos/:productoId/preguntas`, `POST /social/preguntas/producto/:preguntaId/respuestas`, `POST /social/productos/:productoId/favorito`
- **Producto (público):** `GET /public/social/tiendas/:slug/productos/:productoId/reacciones`, `GET /public/social/tiendas/:slug/productos/:productoId/comentarios`, `GET /public/social/tiendas/:slug/productos/:productoId/valoraciones`, `GET /public/social/tiendas/:slug/productos/:productoId/preguntas`
- **Publicaciones (público):** `GET /public/social/publicaciones`, `GET /public/social/publicaciones/:id`
- **Publicaciones (staff):** `GET /social/publicaciones`, `POST /social/publicaciones`, `PUT /social/publicaciones/:id`, `PATCH /social/publicaciones/:id/estado`, `DELETE /social/publicaciones/:id`
- `POST /social/publicaciones/:id/reaccionar`, `POST /social/publicaciones/:id/comentarios`, `PUT /social/comentarios/publicacion/:comentarioId`, `DELETE /social/comentarios/publicacion/:comentarioId`, `POST /social/publicaciones/:id/compartir`
- **Restaurante (consumer):** `POST /social/consumer/restaurantes/:slug/reaccionar`, `/comentarios`, `/:comentarioId/responder`, `/valorar`, `/preguntas`, `/seguir`, `/favorito`
- **Restaurante (público):** `GET /public/social/restaurantes/:slug/reacciones`, `/comentarios`, `/valoraciones`, `/preguntas`, `/seguidores/count`, `/publicaciones`
- **Restaurante (staff):** `GET /social/staff/restaurantes/:slug/preguntas`, `POST /.../responder`, `PATCH /.../ocultar`, `PATCH /.../mostrar`, `POST .../novedades`
- **Consultorio (consumer):** `POST /social/consumer/consultorios/:slug/reaccionar`, `/comentarios`, `/:comentarioId/responder`, `/valorar`, `/preguntas`, `/seguir`, `/favorito`
- **Consultorio (público):** `GET /public/social/consultorios/:slug/reacciones`, `/comentarios`, `/valoraciones`, `/preguntas`, `/seguidores/count`, `/publicaciones`
- **Consultorio (staff):** `GET /social/staff/consultorios/:slug/preguntas`, `POST /.../responder`, `PATCH /.../ocultar/mostrar`, `POST .../novedades`
- **Tienda (consumer+staff):** `POST /social/tiendas/:slug/reaccionar`, `/comentarios`, `/valorar`, `/preguntas`, `/favorito`, `/seguir`; `PATCH /social/tiendas/:slug/preguntas/:id/ocultar`, `.../mostrar`; `GET /social/tiendas/:slug/favorito`
- **Tienda (público):** `GET /public/social/:slug/reacciones`, `/comentarios`, `/valoraciones`, `/preguntas`, `/seguidores/count`

---

## Requisitos funcionales

### RF-1 — Spec poblado
`GET /api/openapi.json` retorna un documento OpenAPI 3.1 completo con al
menos: `paths`, `components.schemas`, info de auth (`bearerAuth`).

### RF-2 — Tags por módulo
Cada operación lleva al menos un tag que identifica el módulo. Tags propuestos:
`Autenticación`, `Tenant`, `Catálogo`, `Almacén`, `Ventas`, `Consultorio`,
`Consultorio Público`, `Restaurante`, `Restaurante Público`, `Tienda`, `Social`.

### RF-3 — Seguridad declarada
Los endpoints que hoy usan `requireAuth` deben declarar
`security: [{ bearerAuth: [] }]`. Los endpoints públicos (sin guard) quedan sin
`security` o con `security: []`.

### RF-4 — Schemas de request reutilizados
Los schemas Zod ya existen en `src/modules/*/adapters/*.schema.ts`. La migración
**los reutiliza, no los duplica**. Si un endpoint no tenía schema Zod explícito
(validaba inline), se extrae a su schema file.

### RF-5 — Shape de respuesta exitosa
Cada `createRoute` declara al menos la respuesta `200` (o `201` en creaciones)
con su schema Zod. Las respuestas de error comunes (`401`, `403`, `404`, `422`)
se declaran una sola vez en `src/core/openapi-responses.ts` y se referencian.

### RF-6 — Sin cambios de comportamiento
La migración es cosmética en la capa de routing: el handler interno
(use-case, repositorio) no cambia. Los guards de rol/auth existentes se
mantienen dentro del handler o se adaptan al pattern de middleware de
`OpenAPIHono`.

### RF-7 — TypeScript clean
`npx tsc --noEmit` → 0 errores tras la migración.

### RF-8 — Swagger UI disponible
Se expone `GET /api/docs` con `@hono/swagger-ui` apuntando al spec generado
en `/api/openapi.json`.

---

## Patrón de migración (receta exacta)

### Antes
```ts
// src/modules/catalogo/adapters/categoria.rest.ts
import { Hono } from "hono"
export const categoriaRouter = new Hono<HonoEnv>()

categoriaRouter.get("/", requireAuth, async (c) => { ... })
categoriaRouter.post("/", requireAuth, requireRol(["PROPIETARIO","ADMIN"]), async (c) => { ... })
```

### Después
```ts
// src/modules/catalogo/adapters/categoria.rest.ts
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import { CategoriaCreateSchema, CategoriaListQuerySchema } from "./catalogo.schema.js"
import { okResponse, createdResponse, errorResponses } from "../../../core/openapi-responses.js"

export const categoriaRouter = new OpenAPIHono<HonoEnv>()

categoriaRouter.openapi(
  createRoute({
    method: "get", path: "/",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    request: { query: CategoriaListQuerySchema },
    responses: {
      200: okResponse("Lista de categorías", z.array(CategoriaItemSchema)),
      ...errorResponses,
    },
  }),
  requireAuth,
  async (c) => { /* handler sin cambios */ },
)
```

### Archivo de helpers: `src/core/openapi-responses.ts`
```ts
import { z } from "@hono/zod-openapi"

export const errorResponses = {
  401: { description: "No autenticado" },
  403: { description: "Sin permiso" },
  404: { description: "No encontrado" },
  422: { description: "Validación fallida" },
}

export function okResponse(description: string, schema: z.ZodTypeAny) {
  return { description, content: { "application/json": { schema } } }
}

export function createdResponse(description: string, schema: z.ZodTypeAny) {
  return { description, content: { "application/json": { schema } } }
}
```

### Ajuste en `src/server/hono.ts`
Los routers ya montados con `app.route()` necesitan que sus instancias sean
`OpenAPIHono`. Como `OpenAPIHono extends Hono`, el cambio es transparente para
el host app. El doc endpoint existente en `hono.ts` no cambia.

Agregar `@hono/swagger-ui`:
```ts
import { swaggerUI } from "@hono/swagger-ui"
app.get("/api/docs", swaggerUI({ url: "/api/openapi.json" }))
```

---

## Orden de implementación recomendado

Migrar módulo a módulo para mantener el proyecto compilando en todo momento:

1. `src/core/openapi-responses.ts` — crear helpers compartidos (no rompe nada)
2. `tenant` — pocos endpoints, ideal para validar el patrón
3. `catalogo` — muchos schemas Zod ya definidos, sirve como referencia
4. `almacen` → `ventas` → `consultorio` → `restaurante` → `tienda` → `social`
5. `autenticacion` — catch-all de Better-Auth se documenta con descripción genérica; `DELETE /user` con schema explícito
6. Agregar Swagger UI en `hono.ts`
7. Verificar `npx tsc --noEmit` → 0 errores

---

## Restricciones y consideraciones

- **No migrar** los sub-routers que no están en `src/modules/` (workers, BullMQ).
- Los routers montados en `src/server/index.ts` (`authRouter`, `tenantRouter`,
  `tiendaStaffRouter`, etc.) deben cambiar su tipo a `OpenAPIHono` para que el
  host app de `crearApp()` pueda recolectar sus rutas en el spec. Si esto es
  complejo, esos routers pueden documentarse con un stub `createRoute` que solo
  declara metadata sin tocar el handler.
- Los handlers de Better-Auth son opacos. Documentarlos con un único
  `createRoute` que describe el catch-all y referencias a la doc oficial de
  Better-Auth.
- Los schemas de respuesta pueden ser parciales en una primera pasada (usando
  `z.unknown()` o `z.record(z.unknown())` para shapes complejos) siempre que
  TypeScript compile sin errores. El refinamiento de responses es incremental.
- La clave `operationId` debe ser única globalmente. Usar el patrón
  `{módulo}_{verbo}_{recurso}` en camelCase: `catalogo_listar_categorias`,
  `ventas_crear_venta`, etc.

---

## Criterios de aceptación

| # | Criterio |
|---|----------|
| AC-1 | `GET /api/openapi.json` retorna paths con más de 100 entradas |
| AC-2 | `GET /api/docs` renderiza Swagger UI con el spec completo |
| AC-3 | `npx tsc --noEmit` → 0 errores |
| AC-4 | Todos los endpoints de módulos internos (tenant-scoped) muestran `security: bearerAuth` |
| AC-5 | Endpoints del directorio público (`/api/public/**`) no requieren `bearerAuth` |
| AC-6 | No hay cambios en la lógica de negocio (use-cases, repositorios, dominio) |
| AC-7 | Los schemas Zod de request ya existentes en `*.schema.ts` se reutilizan sin duplicar |
