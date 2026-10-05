# Quickstart: validación de Configuración del negocio

**Feature**: `026-configuracion-tenant-api`

## Prerrequisitos

1. Migración aplicada (`pnpm db:deploy`) y `pnpm dev` corriendo.
2. Tokens de: un `PROPIETARIO` (`$PROP`), un `ADMIN` (`$ADM`) y un `VENDEDOR` (`$VEND`)
   del negocio A, y un `PROPIETARIO` del negocio B (`$PROP_B`).

```bash
API=http://localhost:3000/api/tenant
h() { echo "Authorization: Bearer $1"; }
```

## 1. Contrato (FR-001, SC-007)

Repetir la auditoría por método y path contra el frontend (spec §Auditoría). Ninguna de
las 26 debe faltar, y `tests/integration/openapi-rutas-unicas.test.ts` debe pasar.

## 2. Contenido ordenado (US2)

```bash
a=$(curl -s -XPOST $API/descripciones -H "$(h $PROP)" -H 'content-type: application/json' -d '{"contenido":"Primera"}' | jq -r .id)
b=$(curl -s -XPOST $API/descripciones -H "$(h $PROP)" -H 'content-type: application/json' -d '{"contenido":"Segunda"}' | jq -r .id)
curl -s -XPATCH $API/descripciones/reorder -H "$(h $PROP)" -H 'content-type: application/json' -d "{\"ids\":[\"$b\",\"$a\"]}" | jq '[.data[].contenido]'
```

**Esperado**: `["Segunda","Primera"]`. Mandar solo `[$b]` → `409 ORDEN_DESACTUALIZADO`
y el orden no cambia. Repetir con `/equipo` (dos sin teléfono deben poder convivir) y
`/imagenes-local`.

## 3. Aislamiento (SC-005)

Con `$PROP_B`: `PATCH /descripciones/$a` → `404`. `GET /descripciones` → no aparecen
`$a` ni `$b`.

## 4. Miembros (US1, SC-004)

| Caso | Esperado |
|---|---|
| `$ADM` invita `{email, rol:"VENDEDOR"}` | `201`, aparece en `GET /invitaciones` con `rol` |
| Invitar de nuevo al mismo correo | `409 INVITACION_PENDIENTE` |
| `DELETE /invitaciones/{id}` | `204`, deja de listarse |
| `$ADM` cambia un vendedor a `PROPIETARIO` | `403 SOLO_PROPIETARIO` |
| `$PROP` asigna `MEDICO` en un negocio sin consultorio | `422 ROL_NO_ASIGNABLE` |
| `$PROP` (único propietario) se quita a sí mismo | `422 UNICO_PROPIETARIO` |
| `$VEND` intenta cualquiera de los anteriores | `403` |
| `$PROP` quita a `$VEND`; luego `$VEND` llama a `GET /api/catalogo/productos` | `400 SIN_TENANT_ACTIVO` en la request siguiente |

## 5. Localizaciones y propietario (US3, US4)

- Latitud `95` → `400`. Borrar la única localización → `422 ULTIMA_LOCALIZACION`.
- `GET /propietarios` en **cada** negocio → exactamente 1 elemento, incluidos los dos
  que antes no tenían (backfill). `PATCH /propietarios/{id}` actualiza.

## 6. Capacidades (US5)

```bash
curl -s $API/capabilities -H "$(h $PROP)" | jq .data
curl -s -XPATCH $API/capabilities/restaurante -H "$(h $PROP)" -H 'content-type: application/json' -d '{"activa":true}'
```

Desactivar la última activa → `422 ULTIMA_VERTICAL`. `$ADM` intentando cambiarla →
`403`. Desactivar `restaurante` → sus endpoints de staff responden
`RESTAURANTE_NO_HABILITADO`; reactivarlo → sus datos siguen ahí.
