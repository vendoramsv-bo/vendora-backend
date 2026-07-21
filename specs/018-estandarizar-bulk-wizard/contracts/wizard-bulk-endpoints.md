# Contrato: Endpoints BULK del Wizard (comportamiento estandarizado)

Base URL: `/api/tenant` · Auth: `Bearer {token}` · Todos requieren `requireAuth` + `requireTenantActivo`; los de escritura requieren rol `PROPIETARIO | owner | ADMIN`.

Este documento describe el **contrato de comportamiento** al que deben converger los 9 endpoints BULK del wizard. La forma del request/response (`{ ids: string[] }` → `{ creados/creadas: number }` o similar) **no cambia** para los endpoints que ya existen — lo que cambia es la semántica del `remove` y la protección de datos dependientes descrita abajo. Se documentan aparte los 2 endpoints nuevos requeridos por FR-007.

## Contrato común de sincronización

Para cualquier `POST .../bulk` con body `{ ids: string[] }` (o equivalente):

**Response 201** (forma ya existente, sin cambios):
```json
{ "creados": 0 }
```
o, según el endpoint, `{ "creadas": 0 }` / `{ "total": 0 }` — se mantiene el nombre de campo ya usado por cada endpoint para no romper al frontend.

**Comportamiento**:
1. `ids` vacío es válido — significa "vaciar la selección" (sujeto al punto 4).
2. Todo elemento en `ids` que no esté guardado para el tenant se crea.
3. Todo elemento guardado para el tenant que NO esté en `ids` se elimina, **excepto**:
4. Si el elemento tiene datos dependientes (tabla por entidad en `data-model.md`), se conserva sin cambios — no se elimina, no se reporta como error.
5. Reenviar la misma selección dos veces no genera duplicados ni cambios (idempotente).
6. IDs en `ids` que no existen en el catálogo/origen correspondiente se ignoran o reportan error de forma consistente con el comportamiento ya establecido en cada endpoint (no se introduce un formato de error nuevo).

**Endpoints alcanzados por este contrato** (sin cambio de forma, cambio de comportamiento):

| Endpoint | Cambio de comportamiento |
|---|---|
| `POST /actividades-economicas/bulk` | Agrega protección al `remove` que ya existía (hoy incondicional) |
| `POST /catalogo/productos/bulk` | Agrega `remove` con protección (hoy solo agrega) |
| `POST /catalogo/servicios/bulk` | Agrega `remove` con protección (hoy solo agrega) |
| `POST /proveedores/bulk` | Agrega protección al `remove` que ya existía (hoy incondicional) |
| `POST /turnos/bulk` | Agrega protección al `remove` que ya existía (hoy incondicional) |
| `POST /seguros/bulk` | Sin cambios (ya es reemplazo total seguro) |
| `POST /especialidades/bulk` | Sin cambios (ya es reemplazo total seguro) |
| `POST /categorias/bulk` | Sin cambios (ya es reemplazo total seguro) |
| `POST /zonas/bulk` | Sin cambios (ya es reemplazo total seguro) |

---

## Endpoint nuevo: GET /api/tenant/catalogo/servicios-seleccionados

🔒 Cualquier miembro autenticado del tenant
Devuelve los servicios médicos ya guardados para el tenant, para que el wizard pueda pre-cargar la selección al regresar al paso. Mismo propósito que `GET /catalogo/productos-seleccionados`.

**Response 200**:
```json
{ "data": [{ "nombre": "string" }] }
```

---

## Extensión: GET /api/tenant/config

🔒 Cualquier miembro autenticado del tenant
Se extiende la respuesta ya existente para incluir, cuando aplique según el tipo de negocio activo del tenant, el estado guardado de los pasos BULK que hoy no son recuperables:

**Response 200** (campos nuevos, agregados a la forma ya existente):
```json
{
  "...": "campos existentes sin cambios",
  "consultorio": {
    "seguros": ["string"],
    "especialidades": ["string"]
  },
  "restaurante": {
    "tiposCocina": ["string"],
    "zonas": [{ "nombre": "string", "mesas": [{ "numero": 0 }] }]
  }
}
```
`consultorio` se omite (`null` u omitido) si el tenant no tiene `esConsultorio`; `restaurante` se omite si no tiene `esRestaurante` — mismo criterio que el resto del payload de `GET /config`.

---

## Errores

Los códigos y formato de error ya establecidos por cada endpoint (400/404/409 con `{ error, message }`) no cambian. La protección de datos dependientes **no es un error**: el elemento protegido simplemente permanece en el estado guardado tras el envío; el cliente lo detecta comparando la respuesta de un `GET` de estado posterior contra lo que envió, igual que ya ocurre hoy con `PuntosDeVenta`.
