# Contrato: Configuración del negocio

Todo bajo `/api/tenant`, con sesión válida y negocio activo. Los métodos y paths son
los que el frontend ya llama. Los nombres de campos son los del frontend; la
traducción al modelo está en [data-model.md](../data-model.md).

**Permisos**: lectura → cualquier miembro. Escritura → `PROPIETARIO` y `ADMIN`, salvo
donde se indica `PROPIETARIO` solo.

**Listas**: responden `paginadoSchema(item)`
(`{ data, total, page, take, totalPaginas, hayPaginaSiguiente, hayPaginaAnterior }`)
y aceptan `take` (1–100, def. 100 en listas ordenadas y 20 en el resto), `skip` y
`search` donde se indica. **`cursor` no se declara**: el backend pagina por offset, y
declararlo sería prometer algo que no se procesa (lección de la spec 020).

**Errores**: `{ error: <code>, message }` con los códigos de data-model.md. La
validación Zod responde `400`.

---

## 1. Descripciones (US2)

| Método | Path | Entrada | 2xx |
|---|---|---|---|
| GET | `/descripciones` | query `take`, `skip` | `200` lista de `Descripcion` |
| POST | `/descripciones` | `{ contenido }` | `201` `Descripcion` |
| PATCH | `/descripciones/reorder` | `{ ids: string[] }` | `200` lista completa reordenada |
| PATCH | `/descripciones/{id}` | `{ contenido }` | `200` `Descripcion` |
| DELETE | `/descripciones/{id}` | — | `204` |

`Descripcion = { id, contenido, orden, createdAt }`

## 2. Imágenes del local (US2)

| Método | Path | Entrada | 2xx |
|---|---|---|---|
| GET | `/imagenes-local` | query `take`, `skip` | `200` lista de `ImagenLocal` |
| POST | `/imagenes-local` | `{ url, descripcion? }` | `201` `ImagenLocal` |
| PATCH | `/imagenes-local/reorder` | `{ ids }` | `200` lista completa |
| DELETE | `/imagenes-local/{id}` | — | `204` |

`ImagenLocal = { id, url, descripcion?, orden, createdAt }`. No hay `PATCH /{id}`: la
pantalla no edita imágenes.

## 3. Equipo (US2)

| Método | Path | Entrada | 2xx |
|---|---|---|---|
| GET | `/equipo` | query `take`, `skip`, `search` (nombre, cargo) | `200` lista de `MiembroEquipo` |
| POST | `/equipo` | `{ nombre, cargo, telefono?, domicilio?, fotoUrl? }` | `201` |
| PATCH | `/equipo/reorder` | `{ ids }` | `200` lista completa |
| PATCH | `/equipo/{id}` | parcial del POST | `200` |
| DELETE | `/equipo/{id}` | — | `204` |

`MiembroEquipo = { id, nombre, cargo, telefono?, domicilio?, fotoUrl?, orden, createdAt }`

**Comunes a §1–§3**: el `/reorder` se registra antes que `/{id}`. Cualquier id ajeno o
inexistente → `404`. Superar 100 elementos → `422 LIMITE_ALCANZADO`.

## 4. Localizaciones (US3)

| Método | Path | Entrada | 2xx |
|---|---|---|---|
| GET | `/localizaciones` | query `take`, `skip`, `search` (dirección, ciudad, barrio) | `200` lista |
| POST | `/localizaciones` | `{ latitud, longitud, direccion, ciudad, departamento, barrio? }` | `201` |
| PATCH | `/localizaciones/{id}` | parcial del POST | `200` |
| DELETE | `/localizaciones/{id}` | — | `204` · `422 ULTIMA_LOCALIZACION` |

`Localizacion = { id, latitud, longitud, direccion, barrio?, ciudad, departamento, createdAt }`

## 5. Propietario (US4 — Q1: uno por negocio)

| Método | Path | Entrada | 2xx |
|---|---|---|---|
| GET | `/propietarios` | — | `200` lista con **exactamente 1** elemento |
| PATCH | `/propietarios/{id}` | parcial de `{ nombre, telefono, domicilio?, referenciaNombre?, referenciaTelefono? }` | `200` |

`Propietario = { id, nombre, telefono, domicilio?, referenciaNombre?, referenciaTelefono?, createdAt }`

Se mantiene la forma de lista para que la pantalla actual funcione mientras pasa a ser
un formulario. `POST` y `DELETE /propietarios…` **no existen** (Q1).

## 6. Miembros (US1)

| Método | Path | Entrada | 2xx | Permiso |
|---|---|---|---|---|
| GET | `/miembros` | *(existe)* | `200` | miembro |
| PATCH | `/miembros/{id}/rol` | `{ rol }` | `200` `Miembro` | PROPIETARIO, ADMIN* |
| DELETE | `/miembros/{id}` | — | `204` | PROPIETARIO, ADMIN* |

\* Asignar o quitar `PROPIETARIO`, o actuar sobre un propietario: solo `PROPIETARIO`
→ si no, `403 SOLO_PROPIETARIO`. Dejar el negocio sin propietario → `422
UNICO_PROPIETARIO`. Rol fuera de las verticales activas → `422 ROL_NO_ASIGNABLE`.

`Miembro = { id, userId, nombreCompleto, email, rol, estado: "activo", joinedAt }`. Se
**agrega** a la respuesta del `GET /miembros` existente, sin quitar campos.

## 7. Invitaciones (US1)

| Método | Path | Entrada | 2xx |
|---|---|---|---|
| GET | `/invitaciones` | *(existe)* | `200` |
| POST | `/invitaciones` | `{ email, rol }` | `201` `Invitacion` · `409 YA_ES_MIEMBRO` · `409 INVITACION_PENDIENTE` |
| DELETE | `/invitaciones/{id}` | — | `204` (pasa a `canceled`) |

`Invitacion = { id, email, rol, expiresAt, createdAt }`. Se agrega `rol` al `GET`
existente.

## 8. Capacidades (US5 — escritura solo PROPIETARIO)

| Método | Path | Entrada | 2xx |
|---|---|---|---|
| GET | `/capabilities` | — | `200 { data: [{ tipo, activa }] }` (3 elementos, siempre) |
| PATCH | `/capabilities/{tipo}` | `{ activa: boolean }` | `200 { tipo, activa }` · `422 ULTIMA_VERTICAL` |

`tipo ∈ tienda | consultorio | restaurante`. Activar una ya activa o desactivar una ya
inactiva es idempotente y responde `200`.
