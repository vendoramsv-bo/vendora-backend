Construir el módulo TuTienda, el perfil de comercio de barrio del tenant. Este
módulo está disponible solo para tenants con la capacidad de tienda activada
(flag esTienda en true) y configura cómo el comercio se presenta al público,
no la operación interna (que ya pertenece al núcleo del tenant).

ACTIVACIÓN DEL PERFIL
Un tenant activa o desactiva su perfil de tienda mediante el flag esTienda.
Activarlo habilita el comercio como entidad visible en el directorio público de
comercios de barrio: pasa a ser buscable por los usuarios consumidores, aparece
con su nombre, logo, ubicación y descripción, y puede ser seguido, valorado y
comentado. Desactivarlo lo oculta del directorio público sin afectar su
operación interna (catálogo, ventas, inventario siguen funcionando para usuarios
con membresía en el tenant).

CONFIGURACIÓN VISUAL DE LA TIENDA
Cada tienda activa configura cómo se ve su interfaz de venta y su vitrina:
- Tipo de despliegue del listado de ventas: barra lateral, barra superior o
  barra inferior. Esto define el layout del punto de venta para el equipo del
  comercio.
- Tema visual de la vitrina pública (colores, banner, presentación de productos
  destacados).
- Productos destacados de la vitrina: una selección curada que aparece primero
  cuando un cliente público visita el perfil del comercio.

DIRECTORIO PÚBLICO DE COMERCIOS DE BARRIO
Los usuarios consumidores (no miembros del tenant) pueden:
- Buscar comercios cerca de una localización (usando las localizaciones del
  tenant ya registradas en el spec de identidad del negocio).
- Filtrar por actividad económica y categoría.
- Ver el perfil público del comercio: nombre, descripción, logo, fotos del
  local, propietarios visibles, equipo de trabajo público, horarios y
  ubicación.
- Ver el catálogo público de productos del comercio (los productos activos
  marcados como visibles públicamente).

INTERACCIONES SOCIALES DEL COMERCIO COMO ENTIDAD
Los usuarios consumidores pueden interactuar con el comercio como entidad,
distinto a interactuar con sus productos individuales:
- Reaccionar al perfil del comercio con un emoji.
- Comentar sobre el comercio (con respuestas anidadas y reacciones a
  comentarios).
- Valorar al comercio con puntuación y reseña; un usuario tiene una sola
  valoración activa por comercio.
- Preguntar al comercio (preguntas públicas que el dueño puede responder).
- Marcar el comercio como favorito para encontrarlo rápido después.
- Seguir al comercio para recibir notificaciones de sus publicaciones nuevas y
  ofertas.

PUBLICACIONES DEL COMERCIO
Un comercio publica contenido a sus seguidores (novedades, ofertas, fotos del
local, anuncios). Las publicaciones del comercio aparecen en el feed de sus
seguidores y son visibles en su perfil público. El detalle del comportamiento
de publicaciones (texto, imágenes, video, comentarios, reacciones) ya está
cubierto en el spec de interacciones sociales y se reutiliza acá.

NOTIFICACIONES AL DUEÑO
Cuando un comercio recibe una nueva valoración, comentario, pregunta o
seguidor, se notifica al propietario del tenant en tiempo real para que pueda
responder o agradecer.

CONSULTAS PARAMETRIZABLES
Los listados del directorio público de comercios, de seguidores, valoraciones,
comentarios y preguntas del comercio deben aceptar el contrato uniforme de
consulta: cantidad de registros por página (máximo 100), filtro por campo (por
ejemplo actividad económica, categoría, distancia a una ubicación), orden
ascendente o descendente por campo acotado (puntuación promedio, número de
seguidores, fecha de creación) y paginación. La respuesta incluye los datos, el
total, la página, el límite, el total de páginas y si hay página siguiente y
anterior.

AUDITORÍA Y TIEMPO REAL
La configuración de la tienda y los productos destacados guardan quién los
creó y modificó. Cuando un comercio actualiza su configuración visual, sus
productos destacados, recibe una nueva valoración, comentario o seguidor, los
demás usuarios conectados (tanto miembros del tenant como visitantes del perfil
público) lo ven en tiempo real sin recargar.

CONSIDERACIÓN DE PRIVACIDAD
Activar el perfil de tienda expone públicamente: nombre, descripción, logo,
propietarios marcados como visibles, equipo público, ubicación, horarios y
catálogo visible. La operación interna del tenant (ventas, inventario, caja,
movimientos, compras, gastos) NUNCA es pública, sin importar el estado del
flag esTienda.