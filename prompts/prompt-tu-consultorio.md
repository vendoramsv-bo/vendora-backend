Construir el módulo TuConsultorio, el perfil público del consultorio médico del
tenant. Este módulo está disponible solo para tenants con la capacidad de
consultorio activada (flag esConsultorio en true) y configura cómo el
consultorio se presenta al público, no la operación clínica interna (citas
internas, historias clínicas, atenciones médicas y recetas ya pertenecen al
módulo consultorio existente).

ACTIVACIÓN DEL PERFIL
Un tenant activa o desactiva su perfil público de consultorio mediante el flag
esConsultorio. Activarlo habilita el consultorio como entidad visible en el
directorio público de consultorios: pasa a ser buscable, aparece con su nombre,
logo, especialidades, horarios y ubicación, y puede ser valorado, comentado y
seguido. Desactivarlo lo oculta del directorio público sin afectar la operación
clínica interna.

CONFIGURACIÓN DEL PERFIL PÚBLICO
Cada consultorio activo configura cómo se presenta al público:
- Nombre comercial, descripción, logo y fotos del establecimiento.
- Especialidades médicas que ofrece (por ejemplo: Medicina General, Pediatría,
  Odontología, Ginecología, Cardiología).
- Número de registro o habilitación del establecimiento (opcional, visible para
  generar confianza).
- Horarios de atención por día de la semana y por especialidad.
- Información de contacto pública: teléfono, email, dirección.
- Médicos marcados como visibles públicamente: nombre, especialidad, foto y
  breve descripción profesional.

DIRECTORIO PÚBLICO DE CONSULTORIOS
Los usuarios consumidores (sin membresía en el tenant) pueden:
- Buscar consultorios cerca de una localización (usando las localizaciones del
  tenant ya registradas).
- Filtrar por especialidad médica y por tipo de servicio (consulta presencial,
  teleconsulta, ambas).
- Ordenar por puntuación promedio, cercanía, número de seguidores o fecha de
  incorporación al directorio.
- Ver el perfil público del consultorio: nombre, descripción, logo, fotos,
  especialidades, médicos visibles, horarios y ubicación.

SERVICIOS MÉDICOS PÚBLICOS
Los consumidores pueden ver el catálogo de servicios del consultorio:
- Listado de servicios activos con nombre, descripción, duración estimada y
  precio (si el consultorio elige mostrarlo).
- Filtro por especialidad.
- Un servicio puede marcarse como visible públicamente o solo para uso interno.

AGENDAMIENTO DE CITAS EN LÍNEA
Los consumidores autenticados pueden:
- Ver la disponibilidad de un médico (días y horarios con cupos disponibles)
  según el horario registrado y las citas ya agendadas.
- Solicitar una cita eligiendo médico, servicio, fecha y hora disponible.
- Recibir confirmación o rechazo por parte del consultorio.
- Consultar sus citas activas (PENDIENTE o CONFIRMADA) y cancelarlas si aún
  no han sido atendidas.
El consultorio gestiona internamente la confirmación, la atención y el historial
clínico, que son ESTRICTAMENTE privados.

INTERACCIONES SOCIALES DEL CONSULTORIO COMO ENTIDAD
Los usuarios consumidores pueden interactuar con el consultorio:
- Reaccionar al perfil con un emoji.
- Comentar (con respuestas anidadas y reacciones); reutiliza el modelo de
  comentarios del módulo social con referenciaTipo = "CONSULTORIO".
- Valorar el consultorio con puntuación 1–5 y reseña de texto; un usuario
  tiene una sola valoración activa por consultorio.
- Preguntar al consultorio (preguntas públicas que el equipo puede responder
  y ocultar individualmente); útil para dudas sobre servicios, precios y
  disponibilidad.
- Marcar el consultorio como favorito.
- Seguir el consultorio para recibir en el feed sus publicaciones y noticias
  de salud.

PUBLICACIONES DEL CONSULTORIO
El equipo (PROPIETARIO o ADMIN) publica contenido educativo, noticias de salud,
anuncios de jornadas de vacunación, recordatorios de chequeos preventivos y
nuevos servicios. Las publicaciones aparecen en el feed de seguidores y en el
perfil público. Reutiliza el modelo de publicaciones del módulo social existente
con referenciaTipo = "CONSULTORIO".

NOTIFICACIONES AL PROPIETARIO
Cuando el consultorio recibe una nueva valoración, comentario, pregunta, seguidor
o solicitud de cita en línea, se notifica al propietario en tiempo real.

CONSULTAS PARAMETRIZABLES
Los listados del directorio, seguidores, valoraciones, comentarios, preguntas y
disponibilidad de agenda aceptan el contrato uniforme de consulta: paginación
(máximo 100 por página), filtro, orden ASC/DESC por campo acotado. La respuesta
incluye datos, total, página, límite, totalPaginas, hayPaginaSiguiente y
hayPaginaAnterior.

AUDITORÍA Y TIEMPO REAL
La configuración del perfil público del consultorio guarda quién la creó y
modificó. Cuando un consultorio actualiza su configuración, recibe una
valoración, comentario o nuevo seguidor, los usuarios conectados lo ven en
tiempo real sin recargar.

CONSIDERACIÓN DE PRIVACIDAD — CRÍTICA
Este módulo expone ÚNICAMENTE: nombre, descripción, logo, especialidades, fotos,
médicos marcados como visibles, horarios, ubicación, servicios públicos y
disponibilidad de agenda.

NUNCA es público, bajo ninguna circunstancia:
- Historias clínicas, diagnósticos y tratamientos de pacientes.
- Recetas médicas y medicamentos prescritos.
- Datos de atenciones médicas (incluyendo motivo de consulta).
- Información de identificación de pacientes.
- Resultados de exámenes y archivos adjuntos clínicos.
- Datos de facturación y pagos de pacientes.
- Movimientos internos de inventario de medicamentos o insumos.

El flag esConsultorio habilita el perfil público pero NO otorga acceso a ningún
dato clínico. El acceso a datos clínicos requiere siempre membresía activa en
el tenant con rol autorizado.
