# Implementation Plan: Catálogo Comercial — Capacidades Faltantes

**Branch**: `main` | **Date**: 2026-05-26 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/010-catalogo-comercial/spec.md`

## Summary

El módulo `catalogo` ya existe con una implementación sustancial (48 archivos):
CRUD completo de productos, categorías, actividades económicas, unidades de medida;
variantes, atributos, precios por volumen, opciones, ofertas, historial de precios;
notificaciones Socket.IO. Esta planificación cubre únicamente las **7 capacidades faltantes**
detectadas al comparar el spec con el código existente:

1. Verificación de código duplicado (endpoint pre-check)
2. Eliminación de productos (use case + ruta DELETE)
3. Integración con MovimientoInventario (tipo CREACION al crear/eliminar + protección stock inicial)
4. Campo `tipoDescuento` en DTOs de creación/actualización
5. Generación cartesiana de variantes (modo híbrido: propuesta + confirmación)
6. Alta masiva desde catálogo maestro (ClaProducto)
7. Notificaciones de eventos faltantes (productoEliminado, variantesGeneradas)

## Technical Context

**Language/Version**: TypeScript strict · Node.js 20 LTS  
**Primary Dependencies**: Hono · @hono/zod-openapi · Prisma 7 · Socket.IO · Zod · Vitest  
**Storage**: PostgreSQL — schema `catalogo` (`prisma/30-catalogo.prisma`, ya migrado) + cross-schema `almacen` (MovimientoInventario)  
**Testing**: Vitest — unit (fakes) + integration (Testcontainers cuando DATABASE_URL presente)  
**Target Platform**: Render — servidor persistente (WebSocket long-lived)  
**Project Type**: Monolito modular hexagonal — módulo `catalogo` (ya existe en `src/modules/catalogo/`)  
**Performance Goals**: Verificación de código < 1 s; Alta masiva 50 productos < 10 s  
**Constraints**: Multi-tenant estricto (Artículo III); Zod valida TODO en el borde; Sin lógica en adaptadores  
**Scale/Scope**: Hasta 10.000 productos por tenant; múltiples verticales activas simultáneamente

## Constitution Check

| Artículo | Aplica | Estado |
|---|---|---|
| I — Stack (Hono, Prisma 7, Zod, Vitest) | ✅ | PASS — el módulo ya lo usa |
| II — Hexagonal (domain/application/infrastructure/adapters) | ✅ | PASS — se añaden archivos en cada capa |
| III — Multi-tenancy (tenantId en todas las queries) | ✅ | PASS — patron prismaScoped ya activo |
| IV — Consultas parametrizables (`makeQueryParamsSchema`) | ✅ | PASS — ya implementado en listar-productos |
| V — Schema `catalogo` + `almacen` cross-schema via `prismaBase as any` | ✅ | PASS |
| VI — Eventos Socket.IO desde `application/` via puerto `ICatalogoNotificador` | ✅ | PASS |
| VII — Roles: PROPIETARIO/ADMIN escriben; ENCARGADO puede leer+crear; VENDEDOR solo lee | ✅ | PASS |
| VIII — Tests unitarios sin infraestructura; integración con DB real | ✅ | PASS |
| IX — Código en español; sin lógica en adaptadores | ✅ | PASS |

**Sin violaciones. Sin entradas en Complexity Tracking.**

## Project Structure

### Documentation (this feature)

```text
specs/010-catalogo-comercial/
├── plan.md              ← Este archivo
├── research.md          ← Decisiones técnicas
├── data-model.md        ← Entidades nuevas / cambios al modelo
├── quickstart.md        ← Escenarios de validación
├── contracts/           ← Contratos REST de las 7 nuevas capacidades
└── tasks.md             ← Generado por /speckit-tasks
```

### Source Code — Solo Archivos Nuevos o Modificados

```text
src/modules/catalogo/
├── domain/
│   ├── catalogo.errors.ts          ← [MODIFY] agregar ProductoConMovimientos, AltaMasivaVacia, ClaProductoNoEncontrado
│   └── ports/
│       └── IProductoRepository.ts  ← [MODIFY] agregar 6 nuevos métodos al interface
├── application/producto/
│   ├── verificar-codigo.usecase.ts         ← [NEW]
│   ├── eliminar-producto.usecase.ts        ← [NEW]
│   ├── registrar-stock-inicial.usecase.ts  ← [NEW] llamado internamente por crear-producto
│   ├── generar-variantes-cartesiano.usecase.ts ← [NEW]
│   └── alta-masiva-productos.usecase.ts    ← [NEW]
├── infrastructure/
│   └── producto.prisma.repository.ts  ← [MODIFY] implementar 6 nuevos métodos
└── adapters/
    ├── producto.rest.ts    ← [MODIFY] agregar 4 nuevas rutas
    └── catalogo.schema.ts  ← [MODIFY] agregar schemas Zod para nuevas rutas

tests/catalogo/
├── unit/application/
│   ├── verificar-codigo.usecase.test.ts
│   ├── eliminar-producto.usecase.test.ts
│   ├── generar-variantes-cartesiano.usecase.test.ts
│   └── alta-masiva-productos.usecase.test.ts
└── integration/
    └── producto.prisma.repository.test.ts  ← [EXTEND] tests para los 6 nuevos métodos
```

**Nota**: `crear-producto.usecase.ts` también se modifica internamente para llamar al repositorio al registrar el movimiento CREACION y para incluir `tipoDescuento` en el DTO.
