# Quickstart: Módulo de Consultorio Médico

Escenarios de validación manual. Requiere servidor corriendo (`pnpm dev`),
DB migrada, y un tenant con `esConsultorio=true`.

**Variables de entorno para los ejemplos:**
```bash
BASE_URL=http://localhost:3000
TOKEN=<session_token_del_usuario>
TENANT_ID=<id_del_tenant>
```

---

## Setup previo: Habilitar consultorio en el tenant

```bash
# Actualizar el tenant para habilitar el módulo consultorio
curl -X PATCH "$BASE_URL/api/auth/organization/update" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-active-organization-id: $TENANT_ID" \
  -d '{ "esConsultorio": true }'
# Esperado: 200 OK con tenant.esConsultorio=true
```

---

## Escenario 1 — Configurar perfil del consultorio

```bash
# Crear/actualizar el perfil del consultorio
curl -X PUT "$BASE_URL/api/consultorio/perfil" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-active-organization-id: $TENANT_ID" \
  -d '{
    "especialidades": ["ODONTOLOGIA", "MEDICINA_GENERAL"],
    "nroRegistro": "SEDAG-2026-001"
  }'
# Esperado: 200 OK con perfil del consultorio

# Leer el perfil
curl "$BASE_URL/api/consultorio/perfil" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-active-organization-id: $TENANT_ID"
# Esperado: 200 OK
```

---

## Escenario 2 — Registrar un médico con horarios

```bash
# Crear médico (requiere memberId de un miembro del tenant)
MEDICO_RESP=$(curl -s -X POST "$BASE_URL/api/consultorio/medicos" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-active-organization-id: $TENANT_ID" \
  -d '{
    "memberId": "<memberId>",
    "especialidad": "ODONTOLOGIA",
    "nroRegistro": "MP-12345",
    "bio": "Odontólogo con 10 años de experiencia"
  }')
MEDICO_ID=$(echo $MEDICO_RESP | jq -r '.id')
echo "Médico creado: $MEDICO_ID"

# Agregar horario de atención (lunes 08:00–12:00)
curl -X POST "$BASE_URL/api/consultorio/medicos/$MEDICO_ID/horarios" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-active-organization-id: $TENANT_ID" \
  -d '{ "diaSemana": 1, "horaInicio": "08:00", "horaFin": "12:00" }'
# Esperado: 201 Created

# Agregar otro horario (lunes 14:00–17:00)
curl -X POST "$BASE_URL/api/consultorio/medicos/$MEDICO_ID/horarios" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-active-organization-id: $TENANT_ID" \
  -d '{ "diaSemana": 1, "horaInicio": "14:00", "horaFin": "17:00" }'
# Esperado: 201 Created
```

---

## Escenario 3 — Registrar paciente y agendar cita

```bash
# Crear paciente
PACIENTE_RESP=$(curl -s -X POST "$BASE_URL/api/consultorio/pacientes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-active-organization-id: $TENANT_ID" \
  -d '{
    "nombre": "Ana",
    "apellido": "Pérez",
    "fechaNacimiento": "1985-03-20",
    "genero": "F",
    "telefono": "+591 77123456",
    "email": "ana.perez@email.com",
    "tipoSangre": "A+"
  }')
PACIENTE_ID=$(echo $PACIENTE_RESP | jq -r '.id')
echo "Paciente creado: $PACIENTE_ID"

# Crear servicio médico
SERVICIO_RESP=$(curl -s -X POST "$BASE_URL/api/consultorio/servicios" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-active-organization-id: $TENANT_ID" \
  -d '{
    "nombre": "Consulta odontológica",
    "especialidad": "ODONTOLOGIA",
    "duracionMin": 30,
    "precioBase": 200.00
  }')
SERVICIO_ID=$(echo $SERVICIO_RESP | jq -r '.id')

# Agendar cita para mañana a las 09:00
FECHA_CITA="2026-06-02T09:00:00Z"
CITA_RESP=$(curl -s -X POST "$BASE_URL/api/consultorio/citas" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-active-organization-id: $TENANT_ID" \
  -d "{
    \"pacienteId\": \"$PACIENTE_ID\",
    \"medicoId\": \"$MEDICO_ID\",
    \"servicioId\": \"$SERVICIO_ID\",
    \"fechaHora\": \"$FECHA_CITA\",
    \"duracionMin\": 30,
    \"motivo\": \"Dolor en molar superior\"
  }")
CITA_ID=$(echo $CITA_RESP | jq -r '.id')
echo "Cita creada: $CITA_ID, estado: $(echo $CITA_RESP | jq -r '.estado')"
# Esperado: estado=PENDIENTE

# Confirmar cita
curl -X POST "$BASE_URL/api/consultorio/citas/$CITA_ID/confirmar" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-active-organization-id: $TENANT_ID"
# Esperado: 200 con estado=CONFIRMADA

# Intentar solapamiento (misma hora)
curl -X POST "$BASE_URL/api/consultorio/citas" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-active-organization-id: $TENANT_ID" \
  -d "{
    \"pacienteId\": \"$PACIENTE_ID\",
    \"medicoId\": \"$MEDICO_ID\",
    \"fechaHora\": \"$FECHA_CITA\",
    \"duracionMin\": 30,
    \"motivo\": \"Test solapamiento\"
  }"
# Esperado: 409 CITA_SOLAPADA
```

---

## Escenario 4 — Historia clínica y registro de atención

```bash
# Marcar cita como atendida
curl -X POST "$BASE_URL/api/consultorio/citas/$CITA_ID/atendida" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-active-organization-id: $TENANT_ID"
# Esperado: 200 con estado=ATENDIDA

# Crear historia clínica
HISTORIA_RESP=$(curl -s -X POST "$BASE_URL/api/consultorio/historias" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-active-organization-id: $TENANT_ID" \
  -d "{
    \"pacienteId\": \"$PACIENTE_ID\",
    \"medicoId\": \"$MEDICO_ID\",
    \"citaId\": \"$CITA_ID\",
    \"especialidad\": \"ODONTOLOGIA\",
    \"motivoConsulta\": \"Dolor en molar superior derecho\",
    \"diagnostico\": \"Caries clase II diente 16\",
    \"tratamiento\": \"Obturación con resina compuesta\"
  }")
HISTORIA_ID=$(echo $HISTORIA_RESP | jq -r '.id')

# Agregar extensión odontológica
curl -X PUT "$BASE_URL/api/consultorio/historias/$HISTORIA_ID/odontologia" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-active-organization-id: $TENANT_ID" \
  -d '{
    "odontograma": { "16": { "estado": "CARIES", "tratamiento": "OBTURACION" } },
    "procedimiento": "Obturación resina compuesta",
    "dienteNumero": "16",
    "estadoDiente": "POST_TRATAMIENTO"
  }'
# Esperado: 200 OK

# Crear atención médica
ATENCION_RESP=$(curl -s -X POST "$BASE_URL/api/consultorio/atenciones" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-active-organization-id: $TENANT_ID" \
  -d "{
    \"pacienteId\": \"$PACIENTE_ID\",
    \"medicoId\": \"$MEDICO_ID\",
    \"citaId\": \"$CITA_ID\",
    \"detalle\": [{
      \"servicioId\": \"$SERVICIO_ID\",
      \"tipoTratamiento\": \"OBTURACION\",
      \"descripcionTratamiento\": \"Obturación resina compuesta\",
      \"referenciaClin\": \"Diente 16\",
      \"cantidad\": 1,
      \"precioUnitario\": 200.00,
      \"descuento\": 0
    }]
  }")
ATENCION_ID=$(echo $ATENCION_RESP | jq -r '.id')
echo "Atención: $ATENCION_ID, total=$(echo $ATENCION_RESP | jq -r '.total'), estadoPago=$(echo $ATENCION_RESP | jq -r '.estadoPago')"
# Esperado: total=200.00, estadoPago=PENDIENTE

# Registrar pago
curl -X POST "$BASE_URL/api/consultorio/atenciones/$ATENCION_ID/pagos" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-active-organization-id: $TENANT_ID" \
  -d '{ "monto": 200.00, "metodo": "EFECTIVO" }'
# Esperado: 200 con estadoPago=PAGADO

# Intentar pago que excede el saldo
curl -X POST "$BASE_URL/api/consultorio/atenciones/$ATENCION_ID/pagos" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-active-organization-id: $TENANT_ID" \
  -d '{ "monto": 50.00, "metodo": "EFECTIVO" }'
# Esperado: 422 ATENCION_YA_PAGADA o PAGO_EXCEDE_TOTAL
```

---

## Escenario 5 — Emitir receta médica

```bash
# Emitir receta asociada a la atención
RECETA_RESP=$(curl -s -X POST "$BASE_URL/api/consultorio/recetas" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-active-organization-id: $TENANT_ID" \
  -d "{
    \"atencionId\": \"$ATENCION_ID\",
    \"indicacionesGenerales\": \"Tomar con alimentos\",
    \"detalle\": [{
      \"medicamento\": \"Amoxicilina 500mg cápsulas\",
      \"principioActivo\": \"Amoxicilina\",
      \"dosis\": \"1 cápsula\",
      \"frecuencia\": \"Cada 8 horas\",
      \"duracion\": \"Por 7 días\",
      \"via\": \"ORAL\",
      \"cantidadPrescrita\": 21,
      \"indicaciones\": \"Tomar con abundante agua\",
      \"permiteSustitucion\": true
    }]
  }")
echo "Receta: $(echo $RECETA_RESP | jq -r '.numeroReceta'), estado=$(echo $RECETA_RESP | jq -r '.estado')"
# Esperado: numeroReceta=REC-2026-00001, estado=EMITIDA

RECETA_ID=$(echo $RECETA_RESP | jq -r '.id')

# Anular receta
curl -X POST "$BASE_URL/api/consultorio/recetas/$RECETA_ID/anular" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-active-organization-id: $TENANT_ID"
# Esperado: 200 con estado=ANULADA
```

---

## Escenario 6 — Guard de capability

```bash
# Crear un tenant sin consultorio habilitado
# y verificar que los endpoints retornan 403

curl -X PATCH "$BASE_URL/api/auth/organization/update" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-active-organization-id: $TENANT_ID" \
  -d '{ "esConsultorio": false }'

curl "$BASE_URL/api/consultorio/perfil" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-active-organization-id: $TENANT_ID"
# Esperado: 403 CONSULTORIO_NO_HABILITADO

# Rehabilitar para los demás escenarios
curl -X PATCH "$BASE_URL/api/auth/organization/update" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-active-organization-id: $TENANT_ID" \
  -d '{ "esConsultorio": true }'
```

---

## Escenario 7 — Eventos Socket.IO en tiempo real

```javascript
// Desde el cliente (JavaScript)
const socket = io("http://localhost:3000", {
  auth: { token: TOKEN },
  transports: ["websocket"],
})

socket.on("consultorio:cita:creada", (payload) => {
  console.log("Nueva cita:", payload)
})

socket.on("consultorio:cita:estadoCambiado", (payload) => {
  console.log("Cita cambió:", payload.estadoNuevo)
})

socket.on("consultorio:atencion:estadoCambiado", (payload) => {
  console.log("Pago registrado, estadoPago:", payload.estadoPago)
})

socket.on("consultorio:receta:emitida", (payload) => {
  console.log("Receta emitida:", payload.numeroReceta)
})
```

Verificar que al ejecutar los escenarios 3, 4 y 5, el cliente Socket.IO recibe
los eventos en tiempo real mientras el servidor procesa las requests HTTP.
