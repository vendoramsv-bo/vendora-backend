# Specification Quality Checklist: Movimientos de inventario a nivel tenant

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-30
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

### Cómo se verificó cada afirmación

Nada acá es una suposición. Cada hallazgo se comprobó contra una fuente:

| Afirmación | Contra qué se verificó |
|---|---|
| `/api/almacen/movimientos` no existe | Spec OpenAPI **en vivo** de `localhost:3000`, 284 rutas. Y el 404 que el frontend recibió |
| Solo hay movimientos por insumo y por variante | Mismo spec, más `insumo.rest.ts:245` e `inventario.rest.ts:78` |
| Esos endpoints aceptan paginación sin declararla | `insumo.rest.ts:261` hace `QueryParamsMovimientosSchema.parse(c.req.query())`, pero su `createRoute` solo declara `params` |
| El schema de consulta soporta el contrato genérico | `almacen.schema.ts:9` — `makeQueryParamsSchema(["tipo","cantidad","motivo","createdAt"])` |
| Las 9 rutas de recuentos y recetas son culpa del frontend | El backend las expone con otro nombre; el spec lo tabula |

### Una corrección respecto de un diagnóstico anterior

Una lectura previa concluyó que `/variantes/{varianteId}/movimientos` **no estaba
paginado**, porque el spec OpenAPI solo declara `varianteId`. Eso es falso: el handler
parsea los parámetros de consulta igual. Lo que falta es la **declaración**, no la
capacidad.

La distinción importa para el alcance: la US2 no construye paginación, la hace visible.
Es trabajo de contrato, no de dominio — bastante más chico de lo que parecía.

Y el motivo por el que el error inicial fue fácil de cometer es justamente lo que la
US2 arregla: desde el cliente generado, un endpoint que no declara un parámetro es
indistinguible de uno que no lo soporta.

### Por qué la US2 vale aunque no agregue capacidad

Podría parecer trabajo cosmético. No lo es: el frontend se genera del contrato
(Artículo IV de su constitución), así que una capacidad no declarada es una capacidad
que no se puede usar sin un `@ts-ignore` — y esos escapes son exactamente el mecanismo
que dejó 41 rutas rotas sin que nadie se enterara. Declarar el contrato completo es lo
que convierte un error de integración en un error de compilación.

### Dependencia entre repositorios

Esta spec es la contraparte de `030-movimientos-inventario-tenant` en
`vendora-frontend`. La relación es asimétrica y conviene tenerla clara:

- La **US1 del frontend** está bloqueada por la **US1 de acá**.
- Las **US2 y US3 del frontend** no dependen de nada de acá (son el buscador inerte y
  los nombres de ruta equivocados del lado del frontend) y ya se entregaron.
- La **US2 de acá** desbloquea paginación y orden para los dos listados por entidad que
  el frontend ya consume.

### Lo que esta spec deliberadamente NO resuelve

**Los 27 endpoints de `configuracion-tenant` que el frontend llama y no existen.** No
son errores de nombre: son pantallas completas sin backend. Antes de una spec hace
falta una decisión por feature —se construye o se retira la pantalla—, y tomarla por
inercia dentro de una spec sobre movimientos de inventario sería el modo equivocado de
decidirlo. Quedan registrados en la sección de contexto.

**Si los movimientos se están registrando o no.** La spec asume que sí y lo declara en
Assumptions. No se pudo verificar sin sesión, y la pantalla que lo mostraría es
justamente la que no funciona. Si se comprueba que algún flujo no registra, es un
defecto aparte.

### Estado

Todos los ítems pasan. Sin `[NEEDS CLARIFICATION]`. Lista para `/speckit.plan`.
