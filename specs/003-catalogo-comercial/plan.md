# Implementation Plan: Catálogo Comercial

**Branch**: `003-catalogo-comercial` | **Date**: 2026-05-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/003-catalogo-comercial/spec.md`

---

## Summary

Implementar el módulo `catalogo` del backend VENDORA: gestión completa del catálogo comercial del tenant, incluyendo actividades económicas, unidades de medida, categorías jerárquicas, productos con variantes, precios por volumen, opciones adicionales, ofertas y notificaciones en tiempo real. Sigue el patrón hexagonal del proyecto usando el schema Prisma `catalogo` existente en `prisma/30-catalogo.prisma`.

---

## Technical Context

**Language/Version**: TypeScript 5.8 (strict mode) · Node.js LTS ≥ 20
**Framework HTTP**: Hono 4.7 + `@hono/zod-openapi`
**ORM**: Prisma 7 (`multiSchema`) · BD: PostgreSQL (schema `catalogo`)
**Tiempo real**: Socket.IO con Redis adapter
**Validación**: Zod
**Testing**: Vitest 3
**Storage**: N/A (imágenes como URLs)
**Target Platform**: Render (serverful)
**Performance Goals**: listados < 1s para 10.000 productos; eventos real-time < 2s
**Constraints**: Tenant scoping obligatorio en todas las queries. Sin guard de vertical (disponible a todos los tenants).
**Scale/Scope**: Un módulo nuevo con ~40 archivos fuente + 15 tests unitarios

---

## Constitution Check

| Artículo | Regla | Estado |
|----------|-------|--------|
| I | Stack: Hono + Zod + Prisma 7 + Socket.IO + BullMQ | ✅ Cumple |
| II.1 | Módulo propio en `src/modules/catalogo/` con fronteras estrictas | ✅ Cumple |
| II.2 | Hexagonal: domain / application / infrastructure / adapters | ✅ Cumple |
| II.3 | Use cases ejecutables desde REST, BullMQ o test sin cambios | ✅ Cumple |
| III.1 | Aislamiento por tenant en todas las queries | ✅ Cumple |
| III.3 | `withAudit` para todas las mutaciones en tablas auditadas | ✅ Cumple |
| III.4 | Sin guard de vertical (catálogo es núcleo compartido) | ✅ Cumple |
| IV | `makeQueryParamsSchema` + `toPrismaArgs` + `paginate` para listados | ✅ Cumple |
| VI.2 | Eventos emitidos desde use cases vía `ICatalogoNotificador` | ✅ Cumple |
| VIII.1 | Dominio testeado con fakes en memoria (sin Prisma) | ✅ Cumple |
| VIII.3 | Validación Zod en adaptadores REST antes de llegar a application/ | ✅ Cumple |
| IX.1 | Código en español (nombres de dominio y variables) | ✅ Cumple |

**Resultado: SIN VIOLACIONES.** No se requiere entrada en Complexity Tracking.

---

## Project Structure

### Documentation (this feature)

```
specs/003-catalogo-comercial/
├── plan.md              ← este archivo
├── research.md          ← decisiones técnicas
├── data-model.md        ← entidades Prisma del catálogo
├── contracts/
│   ├── catalogo-rest.md    ← contratos REST
│   └── socket-events.md    ← contratos Socket.IO
├── quickstart.md        ← escenarios de validación manual
└── tasks.md             ← generado por /speckit-tasks
```

### Source Code

```
src/
├── modules/
│   └── catalogo/
│       ├── domain/
│       │   ├── catalogo.errors.ts
│       │   ├── actividad-economica.entity.ts
│       │   ├── unidad-medida.entity.ts
│       │   ├── categoria.entity.ts
│       │   ├── producto.entity.ts
│       │   └── ports/
│       │       ├── IActividadEconomicaRepository.ts
│       │       ├── IUnidadMedidaRepository.ts
│       │       ├── ICategoriaRepository.ts
│       │       ├── IProductoRepository.ts
│       │       └── ICatalogoNotificador.ts
│       ├── application/
│       │   ├── actividad-economica/
│       │   │   ├── listar-actividades.usecase.ts
│       │   │   ├── crear-actividad.usecase.ts
│       │   │   └── desactivar-actividad.usecase.ts
│       │   ├── unidad-medida/
│       │   │   ├── listar-unidades.usecase.ts
│       │   │   ├── crear-unidad.usecase.ts
│       │   │   └── actualizar-unidad.usecase.ts
│       │   ├── categoria/
│       │   │   ├── crear-categoria.usecase.ts
│       │   │   ├── listar-categorias.usecase.ts
│       │   │   ├── obtener-categoria.usecase.ts
│       │   │   ├── actualizar-categoria.usecase.ts
│       │   │   └── cambiar-estado-categoria.usecase.ts
│       │   └── producto/
│       │       ├── crear-producto.usecase.ts
│       │       ├── listar-productos.usecase.ts
│       │       ├── obtener-producto.usecase.ts
│       │       ├── actualizar-producto.usecase.ts
│       │       ├── cambiar-estado-producto.usecase.ts
│       │       ├── crear-atributo.usecase.ts
│       │       ├── agregar-valor-atributo.usecase.ts
│       │       ├── crear-variante.usecase.ts
│       │       ├── actualizar-variante.usecase.ts
│       │       ├── crear-precio-volumen.usecase.ts
│       │       ├── crear-opcion.usecase.ts
│       │       ├── actualizar-opcion.usecase.ts
│       │       ├── crear-oferta.usecase.ts
│       │       └── actualizar-oferta.usecase.ts
│       ├── infrastructure/
│       │   ├── actividad-economica.prisma.repository.ts
│       │   ├── unidad-medida.prisma.repository.ts
│       │   ├── categoria.prisma.repository.ts
│       │   ├── producto.prisma.repository.ts
│       │   ├── null-catalogo.notificador.ts
│       │   ├── catalogo.socket.notificador.ts
│       │   └── catalogo.notificador.provider.ts
│       └── adapters/
│           ├── catalogo.schema.ts
│           ├── catalogo-router.ts
│           ├── actividad-economica.rest.ts
│           ├── unidad-medida.rest.ts
│           ├── categoria.rest.ts
│           └── producto.rest.ts
├── server/
│   └── hono.ts                  ← agregar import y route /api/catalogo
└── ...

tests/
├── helpers/
│   ├── fake-producto.repository.ts
│   └── fake-catalogo.notificador.ts
└── unit/
    ├── crear-producto.usecase.test.ts
    ├── actualizar-producto.usecase.test.ts   ← verifica historial de precios
    ├── crear-variante.usecase.test.ts
    └── crear-oferta.usecase.test.ts
```

---

## Architecture Decisions

### AD-1: Sin guard de vertical
El módulo catálogo no requiere middleware de capability check. Solo `requireAuth + requireTenantActivo`. Los endpoints de escritura usan `requireRol(["PROPIETARIO", "ADMIN"])`.

### AD-2: ActividadEconomica como entidad de primer nivel
Exponer CRUD para `ActividadEconomica` y `UnidadMedida` dentro del módulo catálogo. Los clasificadores globales (`ClaActividadEconomica`, `ClaUnidadMedida`) se exponen en modo solo-lectura via endpoints separados.

### AD-3: Categorías como lista plana
Los endpoints de categorías retornan listas planas con `padreId`. El campo `nivel` se calcula al crear (`nivel = padre.nivel + 1`, default 1 para raíz). El frontend construye el árbol.

### AD-4: Historial de precios — automático en transacción
`ActualizarProductoUseCase` detecta cambios en `precio` y crea `ProductoPrecioHistorico` en la misma transacción Prisma. Sin triggers de BD.

### AD-5: Vigencia de ofertas — filtrado en tiempo real
La vigencia de una oferta se determina en tiempo de consulta: `fechaInicio <= now AND fechaFin >= now AND estado = ACTIVO`. No hay job de expiración.

### AD-6: Unicidad de variantes
- SKU: constraint de DB (`@@unique([productoId, sku])`)
- Combinación de atributos: validación a nivel de aplicación antes de crear la variante

### AD-7: Provider pattern para el notificador
Mismo patrón que el módulo `consultorio`: `getCatalogoNotificador()` / `setCatalogoNotificador()` en `infrastructure/catalogo.notificador.provider.ts`. `server/index.ts` llama `setCatalogoNotificador(new CatalogoSocketNotificador(io))` al arrancar.

### AD-8: Route prefix
Montado en `src/server/hono.ts` como `app.route("/api/catalogo", catalogoApp)`.

---

## Domain Layer Design

### Entidades
- **`ActividadEconomicaEntity`**: `id, tenantId, claActividadId, nombre, estado`. Método `estaActiva()`.
- **`UnidadMedidaEntity`**: `id, tenantId, unidad, sigla, descripcion, estado`. Método `estaActiva()`.
- **`CategoriaEntity`**: `id, tenantId, actividadId, nombre, padreId?, nivel, estado`. Método `estaActiva()`.
- **`ProductoEntity`**: `id, tenantId, categoriaId, actividadId, codigo, nombre, precio, tipoProducto, estado` + relaciones opcionales `variantes[], atributos[], opciones[], ofertasVigentes[], preciosVolumen[]`. Métodos: `estaActivo()`, `calcularPrecioEfectivo()` (aplica la oferta vigente si existe).

### Errores de dominio (`catalogo.errors.ts`)
```
ActividadNoEncontrada, ActividadDuplicada, ActividadEnUso
UnidadNoEncontrada, UnidadDuplicada
CategoriaNombreDuplicado, CategoriaNoEncontrada, CategoriaPadreNoEncontrada
ProductoCodigoDuplicado, ProductoNombreDuplicado, ProductoNoEncontrado
AtributoNombreDuplicado, AtributoNoEncontrado, AtributoValorDuplicado
VarianteSkuDuplicado, VarianteAtributosDuplicados, VarianteNoEncontrada
OpcionNombreDuplicada, OpcionNoEncontrada
OfertaSolapada, OfertaNoEncontrada
PrecioVolumenCantidadDuplicada
```

---

## Infrastructure Layer Design

### Repositorios
Los repositorios usan `db as any` (mismo patrón que consultorio). Todas las queries incluyen `tenantId` para aislamiento. Las mutaciones usan `withAudit(data, userId)`.

**`ActividadEconomicaPrismaRepository`**: `listar(tenantId)`, `crear(data, tenantId, userId)`, `desactivar(id, userId)`, `tieneUsoActivo(id)`.

**`UnidadMedidaPrismaRepository`**: `listar(tenantId, params)`, `crear(data, tenantId, userId)`, `actualizar(id, data, userId)`, `obtener(id, tenantId)`.

**`CategoriaPrismaRepository`**: `listar(tenantId, actividadId?, params)`, `crear(data, tenantId, userId)`, `obtener(id, tenantId)`, `actualizar(id, data, userId)`.

**`ProductoPrismaRepository`**: 
- `listar(tenantId, params)` — lista plana con soporte completo de query params
- `crear(data, tenantId, userId)` — crea producto
- `obtener(id, tenantId)` — include completo: `{ atributos: { include: { valores: true } }, variantes: { include: { atributos: true } }, opcionesDelProducto: true, productosOfertas: filtro vigentes, preciosVolumen: activos }`
- `actualizar(id, data, userId, precioAnterior?)` — si `precioAnterior` ≠ null, crea historial en `$transaction`
- `listarPrecioHistorico(id, tenantId, params)`
- `crearAtributo(productoId, data)`
- `agregarValorAtributo(atributoId, data)`
- `listarVariantes(productoId, tenantId)`
- `crearVariante(productoId, data)`  — verifica unicidad de combinación antes
- `actualizarVariante(id, productoId, data)`
- `crearPrecioVolumen(productoId, data)`
- `eliminarPrecioVolumen(id, productoId)`
- `crearOpcion(productoId, data)`
- `actualizarOpcion(id, productoId, data)`
- `crearOferta(productoId, data, tenantId)`
- `actualizarOferta(id, productoId, data)`

---

## Integration with Existing Code

### `src/server/hono.ts`
Agregar:
```typescript
import { catalogoApp } from "../modules/catalogo/adapters/catalogo-router.js"
// ...
app.route("/api/catalogo", catalogoApp)
```

### `src/server/index.ts`
Agregar:
```typescript
import { CatalogoSocketNotificador } from "../modules/catalogo/infrastructure/catalogo.socket.notificador.js"
import { setCatalogoNotificador } from "../modules/catalogo/infrastructure/catalogo.notificador.provider.js"
// ...
setCatalogoNotificador(new CatalogoSocketNotificador(io))
```

---

## Testing Strategy

**Unit tests** (sin Prisma, sin Socket.IO):

| Test | Descripción |
|------|-------------|
| `crear-producto.usecase.test.ts` | Validación de unicidad código/nombre, creación exitosa, evento emitido |
| `actualizar-producto.usecase.test.ts` | Historial de precios creado cuando precio cambia; NO creado cuando no cambia |
| `crear-variante.usecase.test.ts` | Rechazo por SKU duplicado, rechazo por atributos duplicados, creación exitosa |
| `crear-oferta.usecase.test.ts` | Oferta vigente retornada, oferta expirada excluida, evento emitido |

**Fakes en memoria**:
- `FakeProductoRepository` — implementa `IProductoRepository` con `Map` en memoria
- `FakeCatalogoNotificador` — registra eventos emitidos para assertions

---

## Implementation Phases (resumen para tasks.md)

**Fase 1 — Setup**: Configuración básica del módulo, errores de dominio, integración en hono.ts/index.ts.

**Fase 2 — Foundational**: Entidades base, puertos, notificador (null + socket + provider), clasificadores (ClaActividad, ClaUnidad).

**Fase 3 — US1 Actividades y Categorías**: Repo + use cases + REST para ActividadEconomica, UnidadMedida, Categoria.

**Fase 4 — US2 Productos básicos**: Repo + use cases + REST para Producto (CRUD + listado parametrizable).

**Fase 5 — US3 Variantes y atributos**: Repo + use cases + REST para atributos, valores, variantes.

**Fase 6 — US4 Precios, opciones y ofertas**: Repo + use cases + REST para PrecioVolumen, Opciones, Ofertas, HistorialPrecios.

**Fase 7 — US5 Tiempo real**: Eventos Socket.IO emitidos desde use cases de US1–US4.

**Fase 8 — Polish**: Fakes, tests unitarios, verificación TypeScript.
