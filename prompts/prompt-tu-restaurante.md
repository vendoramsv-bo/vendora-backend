Construir el módulo TuRestaurante, el perfil público del restaurante del tenant.
Este módulo está disponible solo para tenants con la capacidad de restaurante
activada (flag esRestaurante en true) y configura cómo el restaurante se
presenta al público, no la operación interna (menús internos, cocina, reservas
de gestión ya pertenecen al módulo restaurante existente).

ACTIVACIÓN DEL PERFIL
Un tenant activa o desactiva su perfil público de restaurante mediante el flag
esRestaurante. Activarlo habilita el restaurante como entidad visible en el
directorio público de restaurantes: pasa a ser buscable, aparece con su nombre,
logo, tipo de servicio, horarios y ubicación, y puede ser valorado, comentado y
seguido. Desactivarlo lo oculta del directorio público sin afectar su operación
interna (menús, cocina, reservas siguen funcionando para usuarios con membresía
en el tenant).

CONFIGURACIÓN DEL PERFIL PÚBLICO
Cada restaurante activo configura cómo se presenta al público:
- Nombre comercial, descripción, logo y fotos del local.
- Tipo de servicio visible: MESA, DELIVERY, PARA_LLEVAR o MIXTO.
- Capacidad de mesas y comensales (información pública orientativa).
- Duración promedio de atención por comensal (útil para reservas).
- Especialidad gastronómica o tipo de cocina (por ejemplo: italiana, parrilla,
  fusión, comida rápida).
- Horarios de atención por día de la semana y por tiempo de comida (Desayuno,
  Almuerzo, Cena).
- Información de contacto pública: teléfono, email, redes sociales.

DIRECTORIO PÚBLICO DE RESTAURANTES
Los usuarios consumidores (sin membresía en el tenant) pueden:
- Buscar restaurantes cerca de una localización (usando las localizaciones del
  tenant ya registradas).
- Filtrar por tipo de servicio (MESA, DELIVERY, PARA_LLEVAR), tipo de cocina
  y rango de precio estimado.
- Ordenar por puntuación promedio, número de seguidores, cercanía o fecha de
  incorporación al directorio.
- Ver el perfil público del restaurante: nombre, descripción, logo, fotos,
  propietarios visibles, equipo público, tipo de servicio, horarios, ubicación
  y capacidad orientativa.

MENÚ PÚBLICO
Los consumidores pueden ver el menú publicado del restaurante:
- Los menús en estado PUBLICADO son visibles públicamente.
- Cada menú tiene sus ítems con nombre del plato, descripción, precio y
  disponibilidad.
- Se puede filtrar por tiempo de comida (Desayuno, Almuerzo, Cena) y por fecha.
- El menú privado (en BORRADOR) nunca es visible públicamente.

RESERVAS EN LÍNEA
Los consumidores autenticados pueden:
- Ver los horarios disponibles para reservar mesa según capacidad del
  restaurante.
- Crear una reserva especificando fecha, hora, cantidad de comensales y
  observaciones especiales.
- Consultar sus reservas activas y cancelarlas si aún están en estado
  PENDIENTE.
El restaurante gestiona internamente la confirmación o rechazo de reservas.

INTERACCIONES SOCIALES DEL RESTAURANTE COMO ENTIDAD
Los usuarios consumidores pueden interactuar con el restaurante:
- Reaccionar al perfil con un emoji.
- Comentar (con respuestas anidadas y reacciones); reutiliza el modelo de
  comentarios del módulo social con referenciaTipo = "RESTAURANTE".
- Valorar el restaurante con puntuación 1–5 y reseña de texto; un usuario
  tiene una sola valoración activa por restaurante.
- Preguntar al restaurante (preguntas públicas que el dueño puede responder
  y ocultar individualmente).
- Marcar el restaurante como favorito.
- Seguir el restaurante para recibir en el feed sus publicaciones y novedades
  del menú.

PUBLICACIONES DEL RESTAURANTE
El equipo (PROPIETARIO o ADMIN) publica novedades, promociones, fotos de platos
y anuncios de especiales del día. Las publicaciones aparecen en el feed de los
seguidores y en el perfil público del restaurante. Reutiliza el modelo de
publicaciones del módulo social existente con referenciaTipo = "RESTAURANTE".

NOTIFICACIONES AL PROPIETARIO
Cuando el restaurante recibe una nueva valoración, comentario, pregunta, seguidor
o reserva en línea, se notifica al propietario en tiempo real para que pueda
responder o gestionar.

CONSULTAS PARAMETRIZABLES
Los listados del directorio, seguidores, valoraciones, comentarios y preguntas
del restaurante aceptan el contrato uniforme de consulta: paginación (máximo
100 por página), filtro, orden ASC/DESC por campo acotado y la respuesta incluye
datos, total, página, límite, totalPaginas, hayPaginaSiguiente y
hayPaginaAnterior.

AUDITORÍA Y TIEMPO REAL
La configuración del perfil público del restaurante guarda quién la creó y
modificó. Cuando un restaurante actualiza su configuración, recibe una nueva
valoración, comentario o seguidor, los demás usuarios conectados lo ven en
tiempo real sin recargar.

CONSIDERACIÓN DE PRIVACIDAD
Activar el perfil expone públicamente: nombre, descripción, logo, tipo de
servicio, horarios, capacidad orientativa, propietarios marcados como visibles,
equipo público, ubicación y menús publicados. La operación interna (cocina,
pedidos internos, costos de ingredientes, movimientos de almacén, ventas, caja)
NUNCA es pública, independientemente del flag esRestaurante.
