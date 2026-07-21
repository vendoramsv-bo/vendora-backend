# Quickstart: Validar la estandarización de los BULK del wizard

## Prerrequisitos

- Servidor local corriendo (`npm run dev` o equivalente) con base de datos migrada.
- Un tenant en proceso de creación (no `FINALIZADO`) con sesión autenticada como `PROPIETARIO`.
- Token Bearer válido para `Authorization`.

## 1. Reproducir el bug original (Productos) — antes del fix

```http
POST /api/tenant/catalogo/productos/bulk
Authorization: Bearer {token}
Content-Type: application/json

{ "ids": ["claProductoId-A", "claProductoId-B", "claProductoId-C"] }
```

```http
GET /api/tenant/catalogo/productos-seleccionados
Authorization: Bearer {token}
```
→ debe devolver A, B y C.

```http
POST /api/tenant/catalogo/productos/bulk
Authorization: Bearer {token}
Content-Type: application/json

{ "ids": ["claProductoId-A", "claProductoId-B"] }
```

```http
GET /api/tenant/catalogo/productos-seleccionados
Authorization: Bearer {token}
```
→ **antes del fix**: sigue devolviendo A, B y C (bug). **Después del fix**: debe devolver solo A y B.

## 2. Verificar el mismo patrón en cada paso BULK

Repetir la secuencia agregar (3 ids) → reenviar con 2 ids → consultar estado, para cada endpoint:

| Paso | POST | GET de verificación |
|---|---|---|
| Actividades económicas | `POST /actividades-economicas/bulk` | `GET /actividades-economicas` |
| Productos | `POST /catalogo/productos/bulk` | `GET /catalogo/productos-seleccionados` |
| Servicios médicos | `POST /catalogo/servicios/bulk` | `GET /catalogo/servicios-seleccionados` (nuevo) |
| Proveedores | `POST /proveedores/bulk` | `GET /proveedores` |
| Turnos de atención | `POST /turnos/bulk` | `GET /turnos` |
| Seguros | `POST /seguros/bulk` | `GET /config` → `consultorio.seguros` (nuevo) |
| Especialidades | `POST /especialidades/bulk` | `GET /config` → `consultorio.especialidades` (nuevo) |
| Tipos de cocina | `POST /categorias/bulk` | `GET /config` → `restaurante.tiposCocina` (nuevo) |
| Zonas | `POST /zonas/bulk` | `GET /config` → `restaurante.zonas` (nuevo) |

En todos los casos, tras el segundo `POST` con el subconjunto, el `GET` correspondiente debe reflejar exactamente el subconjunto enviado.

## 3. Verificar la protección de datos dependientes

1. Seleccionar un turno de atención vía `POST /turnos/bulk`.
2. Generar una venta o apertura de caja real asociada a ese turno (fuera del wizard, vía el flujo normal de caja).
3. Reenviar `POST /turnos/bulk` sin ese turno en la lista.
4. `GET /turnos` debe seguir mostrando el turno (protegido) — no debe haber excepción no controlada ni pérdida de la venta asociada.
5. Repetir el mismo patrón para Actividades Económicas (con un producto vendido), Proveedores (con una compra registrada), Productos (con una venta registrada) y Servicios Médicos (con una cita registrada).

## 4. Verificar idempotencia

Reenviar el mismo `POST .../bulk` dos veces seguidas con la selección idéntica. El `GET` de verificación no debe cambiar entre el primer y el segundo envío, y no debe haber errores de duplicado.

## Resultado esperado

- Todos los pasos BULK muestran el mismo comportamiento add/remove.
- Ningún paso pierde historial operativo real al deseleccionar un elemento en uso.
- El wizard puede reconstruir la selección de cualquier paso al regresar a él.
