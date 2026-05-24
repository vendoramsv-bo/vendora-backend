# Feature Specification: Módulo de Consultorio Médico

**Feature Branch**: `007-consultorio-medico`  
**Created**: 2026-05-24  
**Status**: Draft  
**Input**: User description: "Construir el módulo de consultorio médico, disponible solo para tenants con la capacidad de consultorio activada."

## Clarifications

### Session 2026-05-24

- Q: ¿Qué modelo de acceso existe entre el personal administrativo y los médicos para los registros del consultorio? → A: El personal (staff) gestiona citas, atenciones médicas y cobros; los médicos gestionan historia clínica y recetas; ambos tienen visibilidad de todos los pacientes.
- Q: ¿Cómo se determina la unicidad de un paciente? → A: DNI como campo único principal (obligatorio).
- Q: ¿Qué nivel de cumplimiento normativo aplica para los datos de salud? → A: Estándar HIPAA-equivalente — audit trail exhaustivo (incluyendo lecturas), cifrado en reposo obligatorio para datos médicos, trazabilidad completa de accesos.
- Q: ¿Cómo se resuelven las ediciones concurrentes sobre el mismo registro (ej. misma cita)? → A: Bloqueo optimista — el segundo usuario recibe un error de conflicto y debe recargar el registro antes de reintentar.
- Q: ¿Dónde se configura el canal de recordatorio (email, SMS, WhatsApp)? → A: Por paciente — cada paciente define su canal preferido en su perfil; aplica a todas sus citas automáticamente.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configuración Inicial del Consultorio (Priority: P1)

El administrador del tenant configura el perfil del consultorio: nombre, número de registro oficial, especialidades que ofrece y datos de contacto. También registra a los médicos con sus perfiles y horarios de atención. Esta configuración es el punto de partida para que el resto del módulo funcione.

**Why this priority**: Sin el perfil del consultorio y los médicos configurados no es posible agendar citas ni registrar atenciones. Es la base de toda la operación.

**Independent Test**: Se puede verificar de forma independiente creando un consultorio, agregando especialidades, registrando un médico con horarios, y confirmando que los datos persisten y el médico aparece disponible para citas.

**Acceptance Scenarios**:

1. **Given** un tenant con la capacidad de consultorio activada, **When** el administrador accede al módulo por primera vez, **Then** puede completar el perfil del consultorio con número de registro, especialidades y datos de contacto.
2. **Given** el consultorio configurado, **When** se registra un médico con especialidad, matrícula profesional, biografía, foto y horarios por día y franja, **Then** el médico queda disponible para agendar citas en los horarios definidos.
3. **Given** un tenant sin la capacidad de consultorio activada, **When** un usuario intenta acceder al módulo, **Then** el acceso es denegado y se muestra un mensaje apropiado.
4. **Given** un médico registrado, **When** se edita su horario de atención, **Then** los cambios se reflejan inmediatamente en la disponibilidad para nuevas citas.

---

### User Story 2 - Gestión de Citas (Priority: P1)

El **personal administrativo (staff)** agenda una cita seleccionando paciente, médico, fecha y hora. El sistema valida que el médico no tenga otra cita en ese horario. La cita puede pasar por los estados: pendiente → confirmada → atendida, o ser cancelada/no asistió. Se envían recordatorios automáticos al paciente por los canales configurados.

**Why this priority**: La agenda de citas es la funcionalidad central del consultorio; todas las demás funciones (historia clínica, atención, receta) dependen de una cita agendada.

**Independent Test**: Crear una cita, intentar crear otra solapada (debe rechazarse), confirmar la primera cita, y verificar que los cambios se reflejan en tiempo real para todos los usuarios conectados al consultorio.

**Acceptance Scenarios**:

1. **Given** un paciente y un médico registrados, **When** se agenda una cita en un horario disponible del médico, **Then** la cita se crea en estado pendiente y todos los usuarios conectados al consultorio la ven en tiempo real.
2. **Given** una cita ya agendada para un médico en determinado horario, **When** se intenta agendar otra cita para el mismo médico solapando ese horario, **Then** el sistema rechaza la operación con un mensaje de conflicto de horario.
3. **Given** una cita pendiente con fecha futura, **When** el personal la confirma, **Then** el estado cambia a confirmada y todos los usuarios conectados lo ven en tiempo real.
4. **Given** una cita que no fue atendida (pendiente o confirmada), **When** se solicita cancelarla, **Then** el estado cambia a cancelada.
5. **Given** una cita ya atendida, **When** se intenta cancelarla, **Then** el sistema rechaza la operación indicando que la cita ya fue atendida.
6. **Given** una cita con fecha pasada en estado pendiente, **When** se intenta confirmarla, **Then** el sistema rechaza la operación indicando que solo se pueden confirmar citas futuras.
7. **Given** una cita confirmada próxima con canales de notificación configurados, **When** se acerca la fecha según los intervalos configurados, **Then** se envían recordatorios automáticos al paciente por los canales habilitados (email, SMS o WhatsApp).
8. **Given** una cita que el paciente no atendió, **When** el personal registra la inasistencia, **Then** el estado cambia a "no asistió".

---

### User Story 3 - Historia Clínica (Priority: P2)

Cada consulta genera una historia clínica asociada al paciente y al médico. Incluye motivo de consulta, diagnóstico, tratamiento y observaciones. Según la especialidad del médico se agregan extensiones (odontología, pediatría, medicina general). Se pueden adjuntar archivos y registrar vacunaciones. La creación y edición de la historia clínica es responsabilidad del **médico**.

**Why this priority**: La historia clínica es el registro médico central que permite el seguimiento longitudinal del paciente y cumple con la obligación de documentar cada consulta.

**Independent Test**: Crear una historia clínica para una consulta de medicina general con signos vitales como extensión, adjuntar un archivo, registrar una vacuna, y verificar que el historial completo del paciente muestra todos los registros.

**Acceptance Scenarios**:

1. **Given** una consulta atendida, **When** el médico registra la historia clínica con motivo, diagnóstico, tratamiento y observaciones, **Then** el registro queda asociado al paciente y al médico, con auditoría de creación (usuario y timestamp).
2. **Given** un médico con especialidad odontología, **When** registra la historia clínica, **Then** se habilita el odontograma por pieza dental como extensión obligatoria.
3. **Given** un médico con especialidad pediatría, **When** registra la historia clínica, **Then** se pueden ingresar peso, talla y percentiles de crecimiento como extensión.
4. **Given** un médico con especialidad medicina general, **When** registra la historia clínica, **Then** se pueden registrar signos vitales (presión, temperatura, frecuencia cardíaca, etc.) como extensión.
5. **Given** una historia clínica existente, **When** se adjunta un archivo (radiografía, análisis, imagen), **Then** el archivo queda vinculado a esa historia y disponible en el expediente del paciente.
6. **Given** un paciente atendido, **When** el personal registra una vacunación con nombre de vacuna, fecha y lote, **Then** queda en el historial de vacunaciones del paciente.
7. **Given** un paciente con múltiples historias clínicas, **When** se consulta su expediente, **Then** se muestran todas sus historias ordenadas cronológicamente, con sus extensiones, archivos adjuntos y vacunaciones.

---

### User Story 4 - Atención Médica y Cobro (Priority: P2)

El **personal administrativo (staff)** registra la atención médica (registro económico de la consulta): médico atendiente, paciente, servicios/tratamientos prestados con tipo de tratamiento, totales y pagos (que pueden ser parciales). Al completar el cobro total, el sistema genera automáticamente una venta en el módulo de ventas del tenant para registrarse en la caja unificada.

**Why this priority**: Permite cobrar los servicios médicos integrado con la caja del tenant, evitando doble registro y asegurando consistencia financiera.

**Independent Test**: Registrar una atención con dos servicios, agregar un pago parcial, completar el cobro, y verificar que se genera una venta en el módulo de ventas del tenant con los mismos importes.

**Acceptance Scenarios**:

1. **Given** una consulta atendida, **When** el personal registra la atención médica con los servicios prestados, sus tipos de tratamiento y precios, **Then** se calculan los totales correctamente y quedan registrados con auditoría.
2. **Given** una atención médica registrada, **When** se registra un pago parcial, **Then** el saldo pendiente se actualiza y el historial de pagos muestra el pago registrado.
3. **Given** una atención médica con pago completo, **When** se confirma el cobro total, **Then** el sistema crea automáticamente una venta en el módulo de ventas del tenant con los importes correspondientes.
4. **Given** una atención cobrada con venta generada, **When** se consulta la caja del tenant, **Then** la venta figura en los registros de la caja unificada.
5. **Given** cambios de estado en atenciones médicas, **When** ocurren, **Then** todos los usuarios conectados al consultorio los ven en tiempo real.

---

### User Story 5 - Receta Médica (Priority: P3)

El **médico** prescribe medicamentos en una receta. Cada ítem puede referenciar un producto del catálogo del tenant o ser texto libre (para compras externas). Se registra posología, indicaciones por ítem y si permite sustitución genérica. La receta tiene vigencia y estados. Si el paciente compra en la farmacia del tenant, esa compra se registra como venta normal; la receta no rastrea el despacho.

**Why this priority**: Complementa la historia clínica con el registro formal de prescripciones; tiene valor independiente como documento médico-legal.

**Independent Test**: Crear una receta con un medicamento del catálogo y uno de texto libre, verificar fecha de vencimiento y estado "emitida", cambiar el estado, y confirmar que todos los usuarios conectados ven el cambio en tiempo real.

**Acceptance Scenarios**:

1. **Given** una consulta atendida, **When** el médico emite una receta con medicamentos (del catálogo y/o texto libre), posología, vigencia e indicaciones, **Then** la receta queda en estado "emitida" y todos los usuarios conectados al consultorio la ven en tiempo real.
2. **Given** una receta con un ítem del catálogo del tenant, **When** el ítem referencia un producto existente, **Then** los datos del producto (nombre, presentación) se pre-completan; el médico puede agregar posología e indicaciones específicas.
3. **Given** una receta con un ítem de texto libre, **When** se registra el medicamento, **Then** el nombre y presentación se ingresan manualmente sin vinculación a catálogo.
4. **Given** una receta emitida, **When** se consulta el estado, **Then** puede ser: emitida, parcial, despachada, vencida o anulada según la situación.
5. **Given** una receta cuya fecha de vencimiento ya pasó, **When** el sistema o el usuario la consulta, **Then** aparece en estado "vencida".
6. **Given** una receta anulada, **When** se intenta usarla, **Then** el sistema indica que la receta está anulada y no puede utilizarse.

---

### User Story 6 - Gestión de Pacientes (Priority: P3)

El personal registra y administra pacientes con datos demográficos completos, tipo de sangre, alergias y datos de seguro médico. Los listados son parametrizables con filtros, ordenamiento y columnas configurables.

**Why this priority**: Los pacientes son entidades fundamentales pero su gestión puede existir de forma independiente al flujo de citas y atenciones.

**Independent Test**: Registrar un paciente con datos completos incluyendo alergias y seguro médico, aplicar filtros en el listado, y verificar que los resultados coinciden con los criterios aplicados.

**Acceptance Scenarios**:

1. **Given** el módulo de consultorio activo, **When** el personal registra un paciente con datos demográficos, tipo de sangre, alergias y seguro médico, **Then** el paciente queda disponible para agendar citas y registrar atenciones.
2. **Given** una lista de pacientes, **When** se aplican filtros (por nombre, fecha de nacimiento, etc.) y criterios de ordenamiento, **Then** el listado muestra únicamente los pacientes que coinciden con los criterios.
3. **Given** un paciente registrado, **When** se actualiza su información (alergias, seguro médico), **Then** los cambios quedan registrados con auditoría de modificación.

---

### Edge Cases

- ¿Qué sucede si un médico es desactivado y tiene citas futuras pendientes o confirmadas?
- ¿Cómo se maneja si el envío de recordatorios falla (proveedor de SMS/WhatsApp no disponible)?
- ¿Qué ocurre si la venta generada por la atención médica es anulada posteriormente en el módulo de ventas?
- ¿Cómo se controlan qué roles de usuario pueden ver o editar historias clínicas?
- ¿Qué pasa si el tenant desactiva la capacidad de consultorio habiendo datos existentes?
- ¿Cómo se manejan archivos adjuntos de gran tamaño en historias clínicas?
- Si dos usuarios intentan modificar la misma cita simultáneamente, el segundo recibe un error de conflicto (bloqueo optimista) y debe recargar antes de reintentar (resuelto en FR-016b).

## Requirements *(mandatory)*

### Functional Requirements

**Tenant y Acceso**

- **FR-001**: El módulo de consultorio DEBE estar disponible únicamente para tenants que tengan la capacidad de consultorio explícitamente activada.
- **FR-001b**: Dentro del módulo, existen dos roles funcionales: **Staff** (personal administrativo) y **Médico**. El Staff gestiona citas, atenciones médicas y cobros. El Médico gestiona historia clínica y recetas. Ambos roles tienen visibilidad de todos los pacientes del consultorio.
- **FR-002**: Todos los registros principales (médicos, pacientes, citas, historias clínicas, atenciones, recetas) DEBEN almacenar el usuario que los creó y el último que los modificó, con marca de tiempo.
- **FR-002b**: El sistema DEBE registrar un audit trail completo de todos los accesos a datos médicos sensibles (historia clínica, recetas, datos del paciente), incluyendo lecturas, no solo escrituras. Cada entrada del audit log DEBE contener: usuario, acción, recurso accedido, timestamp e IP de origen.
- **FR-002c**: Los datos médicos sensibles (historia clínica, recetas, datos de salud del paciente) DEBEN estar cifrados en reposo. El acceso a estos datos DEBE requerir autorización explícita del rol correspondiente (Staff o Médico según FR-001b).
- **FR-002d**: El sistema DEBE proveer al paciente (o su representante legal) la capacidad de solicitar acceso a su propio expediente clínico completo.

**Perfil del Consultorio**

- **FR-003**: El tenant DEBE poder configurar el perfil del consultorio con: nombre, número de registro oficial, especialidades que ofrece y datos de contacto.

**Médicos**

- **FR-004**: El sistema DEBE permitir registrar perfiles de médicos vinculados al tenant, con: especialidad, matrícula profesional, biografía y foto.
- **FR-005**: Cada médico DEBE poder definir sus horarios de atención por día de la semana y franja horaria.

**Pacientes**

- **FR-006**: El sistema DEBE permitir registrar pacientes con: DNI (campo único obligatorio y clave de búsqueda principal), datos demográficos (nombre completo, fecha de nacimiento, género, dirección, contacto), tipo de sangre, alergias, datos de seguro médico y canal de notificación preferido (email, SMS o WhatsApp). El sistema DEBE rechazar el registro de un paciente con DNI duplicado en el mismo tenant.
- **FR-007**: Los listados de pacientes DEBEN ser parametrizables (filtros por múltiples campos, ordenamiento configurable, columnas visibles seleccionables).

**Servicios Médicos**

- **FR-008**: El sistema DEBE mantener un catálogo de servicios médicos del consultorio (consulta, radiografía, curación, etc.) con duración estimada y precio base.

**Citas**

- **FR-009**: El sistema DEBE permitir agendar citas entre un paciente y un médico para una fecha y hora específica.
- **FR-010**: Al agendar una cita, el sistema DEBE validar que el médico no tenga otra cita solapada en el horario solicitado; si hay conflicto, DEBE rechazar la operación.
- **FR-011**: Los estados válidos de una cita DEBEN ser: pendiente, confirmada, atendida, cancelada, no asistió.
- **FR-012**: Una cita pendiente PUEDE confirmarse únicamente si la fecha de la cita es futura al momento de la confirmación.
- **FR-013**: Una cita PUEDE cancelarse únicamente si no fue atendida (estados permitidos para cancelar: pendiente, confirmada).
- **FR-014**: El sistema DEBE enviar recordatorios automáticos de citas a los pacientes usando el canal de notificación preferido configurado en el perfil del paciente (email, SMS o WhatsApp). Si el paciente no tiene canal configurado, no se envía recordatorio.
- **FR-015**: Los listados de citas DEBEN ser parametrizables (filtros por rango de fecha, médico, paciente, estado; ordenamiento configurable).
- **FR-016**: Al crear una cita o cambiar su estado, todos los usuarios conectados del consultorio DEBEN recibir la actualización en tiempo real.
- **FR-016b**: El sistema DEBE implementar bloqueo optimista en citas, atenciones médicas e historias clínicas. Si dos usuarios intentan modificar el mismo registro simultáneamente, el segundo intento DEBE fallar con un mensaje de conflicto indicando que el registro fue modificado; el usuario DEBE recargar antes de reintentar.

**Historia Clínica**

- **FR-017**: Cada consulta PUEDE generar una historia clínica con: motivo de consulta, diagnóstico, tratamiento y observaciones.
- **FR-018**: Las historias clínicas de médicos con especialidad odontología DEBEN incluir la extensión de odontograma por pieza dental.
- **FR-019**: Las historias clínicas de médicos con especialidad pediatría DEBEN incluir la extensión de datos de crecimiento: peso, talla y percentiles.
- **FR-020**: Las historias clínicas de médicos con especialidad medicina general DEBEN incluir la extensión de signos vitales.
- **FR-021**: El sistema DEBE permitir adjuntar archivos (radiografías, análisis, imágenes) a una historia clínica.
- **FR-022**: El sistema DEBE permitir registrar vacunaciones asociadas a un paciente con: nombre de vacuna, fecha de aplicación y lote.

**Atención Médica**

- **FR-023**: El sistema DEBE permitir registrar la atención médica (registro económico de la consulta, no es factura) con: médico atendiente, paciente, servicios y tratamientos prestados con su tipo de tratamiento, totales calculados y pagos que pueden ser parciales.
- **FR-024**: Al completar el cobro de una atención médica, el sistema DEBE crear automáticamente una venta en el módulo de ventas del tenant para integrarla en la caja unificada.
- **FR-025**: Los listados de atenciones DEBEN ser parametrizables.
- **FR-026**: Al cambiar el estado de una atención, todos los usuarios conectados del consultorio DEBEN ver la actualización en tiempo real.

**Receta Médica**

- **FR-027**: El sistema DEBE permitir al médico emitir recetas con uno o más ítems de medicamentos, donde cada ítem puede referenciar un producto del catálogo del tenant o ser ingresado como texto libre.
- **FR-028**: Cada ítem de receta DEBE registrar: posología (dosis, frecuencia, duración, vía de administración), indicaciones específicas, y si permite sustitución por genérico.
- **FR-029**: Cada receta DEBE tener fecha de emisión, fecha de vencimiento y estados: emitida, parcial, despachada, vencida, anulada.
- **FR-030**: La receta NO rastreará el despacho de medicamentos; si el paciente compra en la farmacia del tenant, esa compra se registra como una venta normal en el módulo de ventas.
- **FR-031**: Al cambiar el estado de una receta, todos los usuarios conectados del consultorio DEBEN ver la actualización en tiempo real.

### Key Entities

- **Consultorio**: Perfil del consultorio del tenant (nombre, número de registro, especialidades, datos de contacto).
- **Médico**: Miembro del tenant con perfil médico; tiene especialidad, matrícula profesional, biografía, foto y horarios de atención.
- **HorarioMédico**: Franjas horarias de disponibilidad de un médico por día de semana.
- **Paciente**: Persona atendida; identificada de forma única por DNI (campo único por tenant). Tiene datos demográficos (nombre, fecha de nacimiento, género, dirección, contacto), tipo de sangre, alergias, datos de seguro médico y canal de notificación preferido (email, SMS o WhatsApp).
- **ServicioMédico**: Prestación del catálogo del consultorio con duración estimada y precio base.
- **Cita**: Evento agendado entre paciente y médico con fecha/hora, estado, canal(es) de recordatorio y auditoría.
- **HistoriaClínica**: Registro del encuentro clínico: motivo, diagnóstico, tratamiento, observaciones; extensible por especialidad del médico.
- **ExtensionOdontologia**: Odontograma por pieza dental asociado a una historia clínica.
- **ExtensionPediatria**: Datos de crecimiento (peso, talla, percentiles) asociados a una historia clínica.
- **ExtensionMedicinaGeneral**: Signos vitales asociados a una historia clínica.
- **ArchivoAdjunto**: Archivo vinculado a una historia clínica (radiografía, análisis, imagen).
- **Vacunacion**: Registro de vacuna aplicada a un paciente (vacuna, fecha, lote).
- **AtencionMedica**: Registro económico de la consulta; contiene servicios/tratamientos con tipo, totales y pagos parciales; enlazada a una venta del tenant al cobrar.
- **PagoAtencion**: Pago parcial o total registrado contra una atención médica.
- **RecetaMedica**: Prescripción médica con vigencia, estado y auditoría; contiene ítems de medicamentos.
- **ItemReceta**: Medicamento (del catálogo o texto libre) con posología (dosis, frecuencia, duración, vía), indicaciones y flag de sustitución genérica.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El personal puede agendar, confirmar y cancelar citas en menos de 2 minutos por operación, sin errores de validación falsos positivos.
- **SC-002**: El sistema rechaza el 100% de los intentos de crear citas con horarios solapados para el mismo médico.
- **SC-003**: Los cambios de estado de citas, atenciones y recetas son visibles para todos los usuarios conectados en menos de 3 segundos.
- **SC-004**: Al completar el cobro de una atención, la venta se genera en la caja unificada del tenant sin intervención manual adicional, en el 100% de los casos.
- **SC-005**: El expediente clínico completo de un paciente (historias, vacunaciones, recetas) es accesible en menos de 5 segundos.
- **SC-006**: Los recordatorios automáticos son enviados para el 100% de las citas con canales configurados dentro del intervalo de tiempo programado.
- **SC-007**: El 100% de los intentos de acceso al módulo desde tenants sin la capacidad activada son rechazados correctamente.
- **SC-008**: Los listados de citas, pacientes y atenciones filtran y ordenan correctamente con cualquier combinación de parámetros disponibles.
- **SC-009**: El 100% de los accesos a datos médicos sensibles (historia clínica, recetas, datos de salud) quedan registrados en el audit log con usuario, acción, recurso y timestamp.
- **SC-010**: Los datos médicos sensibles están cifrados en reposo; ningún acceso no autorizado por rol puede leer esos datos en texto plano.

## Assumptions

- Se asume que los usuarios del módulo están autenticados y el sistema de permisos existente del tenant controla el acceso por rol; los dos roles funcionales del consultorio (Staff y Médico) se mapean sobre ese sistema.
- Se asume que el estándar de cumplimiento aplicable es HIPAA-equivalente, cubriendo al menos: audit trail de lecturas y escrituras, cifrado en reposo de datos médicos, control de acceso por rol, y derecho del paciente a su expediente. El cifrado en reposo es responsabilidad de la capa de infraestructura/storage; la aplicación garantiza que no existan rutas de acceso sin autorización.
- Se asume que los proveedores de notificaciones (email, SMS, WhatsApp) ya están configurados a nivel plataforma; la configuración de credenciales de proveedor es responsabilidad de la infraestructura existente.
- Se asume que los recordatorios automáticos se envían a intervalos configurables antes de la cita (por ejemplo, 24 horas y 1 hora antes), configurable a nivel de consultorio.
- Se asume que la extensión de la historia clínica se determina automáticamente según la especialidad del médico que la registra.
- Se asume que "tipo de tratamiento" en la atención médica es un valor de catálogo configurable internamente por el consultorio.
- Se asume que el módulo de ventas del tenant (Feature 006 — ventas-caja) ya existe y expone capacidad de crear ventas; la integración usa la API interna existente.
- Se asume que el almacenamiento de archivos adjuntos reutiliza la infraestructura de storage existente de la plataforma; el límite de tamaño es el estándar de la plataforma.
- Se asume que todas las atenciones médicas deben estar asociadas a una cita (no se admiten atenciones walk-in sin cita en v1).
- Se asume que la desactivación de la capacidad de consultorio no elimina los datos existentes; el acceso queda restringido pero los registros persisten.
- Se asume que el módulo soporta las tres especialidades con extensión de historia clínica (odontología, pediatría, medicina general) en v1; otras especialidades no tendrán extensión específica.
- Se asume que la transición automática de recetas al estado "vencida" ocurre al superar la fecha de vencimiento; el resto de las transiciones de estado son manuales.
