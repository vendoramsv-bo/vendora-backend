# Data Model: Capa Social de la Plataforma

**Feature**: 009-capa-social  
**Schema Prisma**: `prisma/80-social.prisma` — **SIN MODIFICACIONES**  
**Schema PostgreSQL**: `social`  
**Modelos**: 21 | **Enums**: 6

---

## Enums

| Enum | Valores |
|------|---------|
| `TipoPublicacion` | `TEXTO`, `IMAGEN`, `VIDEO`, `VIDEO_EXTERNO`, `MIXTO` |
| `EstadoPublicacion` | `BORRADOR`, `PUBLICADO`, `ARCHIVADO` |
| `TipoMediaPublicacion` | `IMAGEN`, `VIDEO`, `VIDEO_YOUTUBE`, `VIDEO_TIKTOK`, `VIDEO_FACEBOOK`, `VIDEO_INSTAGRAM`, `VIDEO_OTRO` |
| `PlataformaMedia` | `YOUTUBE`, `TIKTOK`, `FACEBOOK`, `INSTAGRAM`, `OTRO` |
| `TipoReaccion` | `ME_GUSTA`, `ME_ENCANTA`, `ME_IMPORTA`, `ME_DIVIERTE`, `ME_ASOMBRA`, `ME_ENTRISTECE`, `ME_ENOJA` |
| `PlataformaCompartido` | `WHATSAPP`, `FACEBOOK`, `TWITTER_X`, `INSTAGRAM`, `TIKTOK`, `TELEGRAM`, `COPIAR_ENLACE`, `OTRO` |

---

## Modelos — Grupo 1: Interacciones sobre Producto

### ProductoReaccion
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String CUID | PK |
| tenantId | String | FK → Tenant.id |
| productoId | String | FK → Producto.id |
| userId | String | FK → User.id |
| emoji | String | Emoji libre (ej. "👍", "❤️") |
| createdAt | DateTime | — |

**Unique**: `(productoId, userId, emoji)` — un usuario puede tener múltiples emojis distintos en el mismo producto.  
**Comportamiento**: Toggle por emoji individual. Ver Decision 3 de research.md.

### ProductoComentario
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String CUID | PK |
| tenantId | String | FK → Tenant.id |
| productoId | String | FK → Producto.id |
| userId | String | FK → User.id |
| contenido | String | Texto del comentario |
| editado | Boolean | Default false |
| estado | Estado | ACTIVO / eliminado lógico |
| padreId | String? | FK → ProductoComentario.id (auto-referencial) |
| reacciones | ProductoComentarioReaccion[] | — |
| respuestas | ProductoComentario[] | — |
| createdAt | DateTime | — |
| updatedAt | DateTime? | — |

**Unique**: Ninguno (múltiples comentarios por usuario).  
**Eliminación**: Cascada a nivel aplicación — eliminar respuestas antes que el padre (ver Decision 4).

### ProductoComentarioReaccion
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String CUID | PK |
| comentarioId | String | FK → ProductoComentario.id (onDelete: Cascade) |
| userId | String | FK → User.id |
| emoji | String | Emoji libre |
| createdAt | DateTime | — |

**Unique**: `(comentarioId, userId, emoji)`

### ProductoValoracion
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String CUID | PK |
| tenantId | String | FK → Tenant.id |
| productoId | String | FK → Producto.id |
| userId | String | FK → User.id |
| puntuacion | Int | 1 – 5 (validado en dominio) |
| resena | String? | Reseña de texto opcional |
| estado | Estado | ACTIVO |
| createdAt | DateTime | — |
| updatedAt | DateTime? | — |

**Unique**: `(productoId, userId)` — una valoración por usuario por producto (upsert).

### ProductoPregunta
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String CUID | PK |
| tenantId | String | FK → Tenant.id |
| productoId | String | FK → Producto.id |
| userId | String | FK → User.id |
| pregunta | String | Texto de la pregunta |
| estado | Estado | PENDIENTE → ACTIVO (al tener respuesta) |
| respuestas | ProductoRespuesta[] | — |
| createdAt | DateTime | — |
| updatedAt | DateTime? | — |

### ProductoRespuesta
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String CUID | PK |
| preguntaId | String | FK → ProductoPregunta.id (onDelete: Cascade) |
| userId | String | FK → User.id |
| respuesta | String | Texto de la respuesta |
| estado | Estado | ACTIVO |
| createdAt | DateTime | — |
| updatedAt | DateTime? | — |

### ProductoFavorito
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String CUID | PK |
| tenantId | String | FK → Tenant.id |
| productoId | String | FK → Producto.id |
| userId | String | FK → User.id |
| createdAt | DateTime | — |

**Unique**: `(productoId, userId)` — toggle: crear si no existe, eliminar si existe.

---

## Modelos — Grupo 2: Interacciones sobre Tienda

> La `Tienda` es el perfil retail de un Tenant con `esTienda=true`. El `tiendaId` se resuelve via slug del tenant.

### TiendaReaccion
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String CUID | PK |
| tiendaId | String | FK → Tienda.id |
| userId | String | FK → User.id |
| tipo | TipoReaccion | Enum de 7 tipos |
| createdAt | DateTime | — |

**Unique**: `(tiendaId, userId)` — una sola reacción activa por usuario (upsert al cambiar).

### TiendaComentario
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String CUID | PK |
| tiendaId | String | FK → Tienda.id |
| userId | String | FK → User.id |
| contenido | String | — |
| editado | Boolean | Default false |
| estado | Estado | ACTIVO |
| padreId | String? | FK → TiendaComentario.id |
| reacciones | TiendaComentarioReaccion[] | — |
| respuestas | TiendaComentario[] | — |
| createdAt | DateTime | — |
| updatedAt | DateTime? | — |

### TiendaComentarioReaccion
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String CUID | PK |
| comentarioId | String | FK → TiendaComentario.id (onDelete: Cascade) |
| userId | String | FK → User.id |
| tipo | TipoReaccion | — |
| createdAt | DateTime | — |

**Unique**: `(comentarioId, userId)`

### TiendaValoracion
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String CUID | PK |
| tiendaId | String | FK → Tienda.id |
| userId | String | FK → User.id |
| puntuacion | Int | 1 – 5 |
| resena | String? | — |
| estado | Estado | ACTIVO |
| createdAt | DateTime | — |
| updatedAt | DateTime? | — |

**Unique**: `(tiendaId, userId)` — upsert.

### TiendaPregunta
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String CUID | PK |
| tiendaId | String | FK → Tienda.id |
| userId | String | FK → User.id |
| pregunta | String | — |
| estado | Estado | PENDIENTE → ACTIVO |
| respuestas | TiendaRespuesta[] | — |
| createdAt | DateTime | — |
| updatedAt | DateTime? | — |

### TiendaRespuesta
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String CUID | PK |
| preguntaId | String | FK → TiendaPregunta.id (onDelete: Cascade) |
| userId | String | FK → User.id |
| respuesta | String | — |
| estado | Estado | ACTIVO |
| createdAt | DateTime | — |
| updatedAt | DateTime? | — |

### TiendaFavorito
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String CUID | PK |
| tiendaId | String | FK → Tienda.id |
| userId | String | FK → User.id |
| createdAt | DateTime | — |

**Unique**: `(tiendaId, userId)` — toggle.

### TiendaSeguidor
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String CUID | PK |
| tiendaId | String | FK → Tienda.id |
| userId | String | FK → User.id |
| createdAt | DateTime | — |

**Unique**: `(tiendaId, userId)` — toggle.

---

## Modelos — Grupo 3: Publicaciones del Tenant

### Publicacion
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String CUID | PK |
| tenantId | String | FK → Tenant.id |
| autorId | String | FK → User.id |
| titulo | String? | Título opcional |
| contenido | String? | Cuerpo de texto |
| tipo | TipoPublicacion | Derivado del contenido (TEXTO, IMAGEN, VIDEO, etc.) |
| estado | EstadoPublicacion | BORRADOR → PUBLICADO → ARCHIVADO |
| etiquetas | String[] | Array de tags |
| publicadoEn | DateTime? | Fecha efectiva de publicación |
| medios | PublicacionMedia[] | — |
| reacciones | PublicacionReaccion[] | — |
| comentarios | PublicacionComentario[] | — |
| compartidos | PublicacionCompartido[] | — |
| createdAt | DateTime | — |
| updatedAt | DateTime? | — |

**Máquina de estados**:
```
BORRADOR → PUBLICADO → ARCHIVADO
```
Solo PROPIETARIO y ADMIN pueden crear/editar/cambiar estado (clarificación Q1).

### PublicacionMedia
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String CUID | PK |
| publicacionId | String | FK → Publicacion.id (onDelete: Cascade) |
| tipo | TipoMediaPublicacion | IMAGEN, VIDEO, VIDEO_YOUTUBE, VIDEO_TIKTOK, etc. |
| url | String? | URL directa (imagen, video propio) |
| embedUrl | String? | URL de embed (YouTube/TikTok) |
| thumbnailUrl | String? | Miniatura opcional |
| plataforma | PlataformaMedia? | YOUTUBE, TIKTOK, FACEBOOK, INSTAGRAM, OTRO |
| titulo | String? | Título del medio |
| orden | Int | Default 0 (orden de aparición) |
| createdAt | DateTime | — |
| updatedAt | DateTime? | — |

### PublicacionReaccion
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String CUID | PK |
| publicacionId | String | FK → Publicacion.id (onDelete: Cascade) |
| userId | String | FK → User.id |
| tipo | TipoReaccion | — |
| createdAt | DateTime | — |

**Unique**: `(publicacionId, userId)` — una reacción activa por usuario (upsert).

### PublicacionComentario
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String CUID | PK |
| publicacionId | String | FK → Publicacion.id (onDelete: Cascade) |
| userId | String | FK → User.id |
| contenido | String | — |
| editado | Boolean | Default false |
| estado | Estado | ACTIVO |
| padreId | String? | FK → PublicacionComentario.id |
| reacciones | PublicacionComentarioReaccion[] | — |
| respuestas | PublicacionComentario[] | — |
| createdAt | DateTime | — |
| updatedAt | DateTime? | — |

### PublicacionComentarioReaccion
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String CUID | PK |
| comentarioId | String | FK → PublicacionComentario.id (onDelete: Cascade) |
| userId | String | FK → User.id |
| tipo | TipoReaccion | — |
| createdAt | DateTime | — |

**Unique**: `(comentarioId, userId)`

### PublicacionCompartido
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String CUID | PK |
| publicacionId | String | FK → Publicacion.id (onDelete: Cascade) |
| userId | String | FK → User.id |
| plataforma | PlataformaCompartido | — |
| createdAt | DateTime | — |

Registra cada evento de compartición para métricas. No tiene unique — el mismo usuario puede compartir varias veces.

---

## Relaciones entre módulos

```
catalogo.Producto ──< social.ProductoReaccion
                  ──< social.ProductoComentario
                  ──< social.ProductoValoracion
                  ──< social.ProductoPregunta
                  ──< social.ProductoFavorito

tenant.Tienda ────< social.TiendaReaccion
                ──< social.TiendaComentario
                ──< social.TiendaValoracion
                ──< social.TiendaPregunta
                ──< social.TiendaFavorito
                ──< social.TiendaSeguidor

tenant.Tenant ───< social.Publicacion

autenticacion.User ──< (todas las entidades sociales como autor/userId)
```

---

## Restricciones de negocio clave

| Restricción | Modelo(s) | Unique constraint |
|-------------|-----------|-------------------|
| Una reacción de cada emoji por usuario en un producto | ProductoReaccion | (productoId, userId, emoji) |
| Una reacción total por usuario en tienda/publicación | TiendaReaccion, PublicacionReaccion | (tiendaId/publicacionId, userId) |
| Una valoración por usuario por elemento | ProductoValoracion, TiendaValoracion | (productoId/tiendaId, userId) |
| Un favorito por usuario por elemento | ProductoFavorito, TiendaFavorito | (productoId/tiendaId, userId) |
| Un seguidor único | TiendaSeguidor | (tiendaId, userId) |
| Puntuación 1-5 | ProductoValoracion, TiendaValoracion | Validado en dominio |
| Solo BORRADOR → PUBLICADO → ARCHIVADO | Publicacion | Validado en dominio |
| Solo PROPIETARIO/ADMIN gestionan publicaciones | Publicacion | Validado en use case |
| Eliminación de padre elimina respuestas | ProductoComentario, TiendaComentario, PublicacionComentario | Gestionado en application layer |
