-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "almacen";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "autenticacion";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "catalogo";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "compartido";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "consultorio";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "restaurante";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "social";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "tenant";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "ventas";

-- CreateEnum
CREATE TYPE "tenant"."PlanTenant" AS ENUM ('BASICO', 'PROFESIONAL', 'EMPRESARIAL');

-- CreateEnum
CREATE TYPE "tenant"."TipoDeConfiguracion" AS ENUM ('PEQUENA', 'MEDIANA', 'EMPRESARIAL');

-- CreateEnum
CREATE TYPE "tenant"."TipoDespliegueVentas" AS ENUM ('BARRA_LATERAL', 'BARRA_SUPERIOR', 'BARRA_INFERIOR');

-- CreateEnum
CREATE TYPE "tenant"."PasosCreacionTienda" AS ENUM ('PASO_1', 'PASO_2', 'PASO_3', 'PASO_4', 'PASO_5', 'PASO_6', 'PASO_7', 'PASO_8', 'PASO_9', 'PASO_10');

-- CreateEnum
CREATE TYPE "compartido"."Estado" AS ENUM ('PENDIENTE', 'ACTIVO', 'INACTIVO', 'SUSPENDIDO', 'ELIMINADO', 'FINALIZADO', 'ACEPTADO', 'RECHAZADO', 'APROBADO', 'PUBLICADO', 'ELABORADO', 'VENDIDO', 'CONFIRMADA');

-- CreateEnum
CREATE TYPE "compartido"."EstadoNotificacion" AS ENUM ('NO_LEIDO', 'LEIDO');

-- CreateEnum
CREATE TYPE "compartido"."TipoDeDocumento" AS ENUM ('CEDULA_IDENTIFICACION', 'NIT', 'PASAPORTE', 'OTRO');

-- CreateEnum
CREATE TYPE "compartido"."ReferenciaTipo" AS ENUM ('PEDIDO', 'VENTA', 'CITA', 'HISTORIA_CLINICA', 'ATENCION_MEDICA', 'RESERVA', 'MENU', 'PUBLICACION_MENU', 'STOCK_CRITICO', 'PRODUCTO_REACCION', 'PRODUCTO_COMENTARIO', 'PRODUCTO_VALORACION', 'PRODUCTO_PREGUNTA', 'PUBLICACION', 'PUBLICACION_COMENTARIO', 'TIENDA_REACCION', 'TIENDA_COMENTARIO', 'TIENDA_VALORACION', 'TIENDA_PREGUNTA', 'OTRO');

-- CreateEnum
CREATE TYPE "compartido"."MensajeTipo" AS ENUM ('TEXTO', 'IMAGEN', 'AUDIO', 'VIDEO', 'MAPA', 'PRODUCTO', 'PEDIDO', 'DIRECCION', 'CITA');

-- CreateEnum
CREATE TYPE "catalogo"."TipoDeProducto" AS ENUM ('COMERCIALIZACION', 'SERVICIO', 'PLATO', 'BEBIDA', 'POSTRE', 'COMPLEMENTO');

-- CreateEnum
CREATE TYPE "catalogo"."TipoAtributo" AS ENUM ('TEXTO', 'COLOR', 'IMAGEN', 'NUMERO');

-- CreateEnum
CREATE TYPE "almacen"."TipoMovimiento" AS ENUM ('CREACION', 'ENTRADA', 'SALIDA', 'AJUSTE', 'RECUENTO');

-- CreateEnum
CREATE TYPE "almacen"."TipoMovimientoAlmacen" AS ENUM ('CREACION', 'INGRESO', 'SALIDA', 'AJUSTE', 'RECUENTO');

-- CreateEnum
CREATE TYPE "ventas"."TipoPuntoDeVenta" AS ENUM ('CAJA', 'SUCURSAL');

-- CreateEnum
CREATE TYPE "ventas"."TipoEfectivo" AS ENUM ('BILLETE_200', 'BILLETE_100', 'BILLETE_50', 'BILLETE_20', 'BILLETE_10', 'MONEDA_5', 'MONEDA_2', 'MONEDA_1', 'CENTAVOS_50', 'CENTAVOS_20', 'CENTAVOS_10');

-- CreateEnum
CREATE TYPE "ventas"."TipoDePago" AS ENUM ('EFECTIVO', 'QR', 'TARJETA_CREDITO', 'TARJETA_DEBITO', 'OTRO');

-- CreateEnum
CREATE TYPE "ventas"."EstadoDePago" AS ENUM ('PAGADO', 'EN_ESPERA');

-- CreateEnum
CREATE TYPE "ventas"."EstadoDeCaja" AS ENUM ('APERTURADA', 'CERRADA');

-- CreateEnum
CREATE TYPE "ventas"."ReferenciaTipoVenta" AS ENUM ('PUNTO_DE_VENTA', 'PEDIDO', 'VENTA_DIARIA', 'OTRO');

-- CreateEnum
CREATE TYPE "consultorio"."EstadoAtencion" AS ENUM ('EN_CURSO', 'COMPLETADA', 'PAGADA', 'ANULADA');

-- CreateEnum
CREATE TYPE "consultorio"."EstadoPagoMedico" AS ENUM ('PENDIENTE', 'PARCIAL', 'PAGADO');

-- CreateEnum
CREATE TYPE "consultorio"."TipoPagoMedico" AS ENUM ('EFECTIVO', 'QR', 'TARJETA_CREDITO', 'TARJETA_DEBITO', 'TRANSFERENCIA', 'SEGURO_MEDICO', 'CONVENIO', 'OTRO');

-- CreateEnum
CREATE TYPE "consultorio"."TipoTratamiento" AS ENUM ('CONSULTA', 'CONTROL', 'EMERGENCIA', 'LIMPIEZA_DENTAL', 'OBTURACION', 'EXTRACCION', 'ENDODONCIA', 'CORONA', 'PROTESIS', 'ORTODONCIA', 'BLANQUEAMIENTO', 'RADIOGRAFIA_DENTAL', 'CIRUGIA_ORAL', 'CONTROL_CRECIMIENTO', 'VACUNACION', 'EVALUACION_DESARROLLO', 'DESPARASITACION', 'RECETA_MEDICA', 'SOLICITUD_EXAMENES', 'INTERPRETACION_EXAMENES', 'CURACION', 'INYECTABLE', 'NEBULIZACION', 'SUTURA', 'RETIRO_SUTURA', 'PROCEDIMIENTO_MENOR', 'OTRO');

-- CreateEnum
CREATE TYPE "consultorio"."EstadoReceta" AS ENUM ('EMITIDA', 'PARCIAL', 'DESPACHADA', 'VENCIDA', 'ANULADA');

-- CreateEnum
CREATE TYPE "consultorio"."EstadoRecetaDetalle" AS ENUM ('PENDIENTE', 'PARCIAL', 'DESPACHADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "consultorio"."ViaAdministracion" AS ENUM ('ORAL', 'SUBLINGUAL', 'INTRAVENOSA', 'INTRAMUSCULAR', 'SUBCUTANEA', 'TOPICA', 'OFTALMICA', 'OTICA', 'NASAL', 'RECTAL', 'VAGINAL', 'INHALATORIA', 'OTRO');

-- CreateEnum
CREATE TYPE "restaurante"."TipoMenu" AS ENUM ('DIARIO', 'SEMANAL', 'ESPECIAL', 'PERMANENTE', 'EVENTO');

-- CreateEnum
CREATE TYPE "restaurante"."EstadoMenu" AS ENUM ('BORRADOR', 'APROBADO', 'PUBLICADO', 'ARCHIVADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "restaurante"."EstadoReserva" AS ENUM ('RESERVADA', 'CONFIRMADA', 'EN_PREPARACION', 'LISTA', 'ENTREGADA', 'PAGADA', 'CANCELADA', 'NO_ASISTIO');

-- CreateEnum
CREATE TYPE "restaurante"."EstadoCocina" AS ENUM ('PENDIENTE', 'EN_PREPARACION', 'LISTO', 'ENTREGADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "restaurante"."RedSocial" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'WHATSAPP', 'TIKTOK', 'TWITTER_X', 'OTRO');

-- CreateEnum
CREATE TYPE "restaurante"."EstadoPublicacionRRSS" AS ENUM ('BORRADOR', 'PROGRAMADA', 'PUBLICANDO', 'PUBLICADA', 'FALLIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "social"."TipoPublicacion" AS ENUM ('TEXTO', 'IMAGEN', 'VIDEO', 'VIDEO_EXTERNO', 'MIXTO');

-- CreateEnum
CREATE TYPE "social"."EstadoPublicacion" AS ENUM ('BORRADOR', 'PUBLICADO', 'ARCHIVADO');

-- CreateEnum
CREATE TYPE "social"."TipoMediaPublicacion" AS ENUM ('IMAGEN', 'VIDEO', 'VIDEO_YOUTUBE', 'VIDEO_TIKTOK', 'VIDEO_FACEBOOK', 'VIDEO_INSTAGRAM', 'VIDEO_OTRO');

-- CreateEnum
CREATE TYPE "social"."PlataformaMedia" AS ENUM ('YOUTUBE', 'TIKTOK', 'FACEBOOK', 'INSTAGRAM', 'OTRO');

-- CreateEnum
CREATE TYPE "social"."TipoReaccion" AS ENUM ('ME_GUSTA', 'ME_ENCANTA', 'ME_IMPORTA', 'ME_DIVIERTE', 'ME_ASOMBRA', 'ME_ENTRISTECE', 'ME_ENOJA');

-- CreateEnum
CREATE TYPE "social"."PlataformaCompartido" AS ENUM ('WHATSAPP', 'FACEBOOK', 'TWITTER_X', 'INSTAGRAM', 'TIKTOK', 'TELEGRAM', 'COPIAR_ENLACE', 'OTRO');

-- CreateTable
CREATE TABLE "autenticacion"."user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userName" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "role" TEXT DEFAULT 'user',
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "banReason" TEXT,
    "banExpiresAt" TIMESTAMP(3),
    "locked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "autenticacion"."session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "activeOrganizationId" TEXT,
    "impersonatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "autenticacion"."account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "autenticacion"."verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "autenticacion"."invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "inviterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant"."organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "metadata" TEXT,
    "nombreLargo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "esTienda" BOOLEAN NOT NULL DEFAULT false,
    "esConsultorio" BOOLEAN NOT NULL DEFAULT false,
    "esRestaurante" BOOLEAN NOT NULL DEFAULT false,
    "plan" "tenant"."PlanTenant" NOT NULL DEFAULT 'BASICO',
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'PENDIENTE',
    "ultimoPasoCreacion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant"."member" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant"."RolPermiso" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "accion" TEXT NOT NULL,

    CONSTRAINT "RolPermiso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant"."Localizacion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "latitud" DOUBLE PRECISION NOT NULL,
    "longitud" DOUBLE PRECISION NOT NULL,
    "direccion" TEXT NOT NULL,
    "barrio" TEXT,
    "ciudad" TEXT NOT NULL,
    "departamento" TEXT NOT NULL,
    "email" TEXT,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Localizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant"."Propietario" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "domicilio" TEXT NOT NULL,
    "nombreReferencia" TEXT NOT NULL,
    "telefonoReferencia" TEXT NOT NULL,
    "imagenUrl" TEXT,
    "userId" TEXT NOT NULL,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Propietario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant"."Imagen" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "imagenUrl" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Imagen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant"."Descripcion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Descripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant"."EquipoDeTrabajo" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "domicilio" TEXT NOT NULL,
    "descripcion" TEXT,
    "imagenUrl" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "EquipoDeTrabajo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant"."Tienda" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Tienda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant"."Configuracion" (
    "id" TEXT NOT NULL,
    "tiendaId" TEXT NOT NULL,
    "tipoDeTienda" "tenant"."TipoDeConfiguracion" NOT NULL DEFAULT 'PEQUENA',
    "cantidadPuntosDeVenta" INTEGER NOT NULL DEFAULT 1,
    "cantidadVendedores" INTEGER NOT NULL DEFAULT 1,
    "tipoDespliegueVentas" "tenant"."TipoDespliegueVentas" NOT NULL DEFAULT 'BARRA_LATERAL',
    "tema" TEXT NOT NULL DEFAULT 'green',
    "tipoLineado" TEXT NOT NULL DEFAULT 'curvedLine',
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Configuracion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant"."Consultorio" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "especialidades" TEXT[],
    "nroRegistro" TEXT,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Consultorio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant"."Restaurante" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "capacidadMesas" INTEGER,
    "capacidadComensales" INTEGER,
    "tipoServicio" TEXT,
    "duracionPromedioMin" INTEGER NOT NULL DEFAULT 60,
    "plantillaRRSS" JSONB,
    "publicacionAutomatica" BOOLEAN NOT NULL DEFAULT false,
    "horaPublicacionMenu" TEXT,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Restaurante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compartido"."Notificacion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "respuesta" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "compartido"."EstadoNotificacion" NOT NULL DEFAULT 'NO_LEIDO',
    "leido" TIMESTAMP(3),
    "referenciaId" TEXT,
    "referenciaTipo" "compartido"."ReferenciaTipo",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compartido"."Mensaje" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" "compartido"."MensajeTipo" NOT NULL DEFAULT 'TEXTO',
    "texto" TEXT,
    "imagenUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Mensaje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compartido"."Reaccion" (
    "id" TEXT NOT NULL,
    "mensajeId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reaccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compartido"."AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tabla" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "cambios" JSONB NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compartido"."ReporteLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "generadoPorId" TEXT NOT NULL,
    "tipoReporte" TEXT NOT NULL,
    "parametros" JSONB NOT NULL,
    "urlArchivo" TEXT,
    "generadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReporteLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compartido"."ClaActividadEconomica" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "imagenUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ClaActividadEconomica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compartido"."ClaUnidadMedida" (
    "id" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "sigla" TEXT NOT NULL,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ClaUnidadMedida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compartido"."ClaCategoria" (
    "id" TEXT NOT NULL,
    "claActividadId" TEXT NOT NULL,
    "nivel" INTEGER NOT NULL DEFAULT 1,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "imagenUrl" TEXT,
    "padreId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ClaCategoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compartido"."ClaProducto" (
    "id" TEXT NOT NULL,
    "claActividadId" TEXT NOT NULL,
    "claCategoriaId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "imagenUrl" TEXT,
    "claUnidadId" TEXT NOT NULL,
    "tipoProducto" "catalogo"."TipoDeProducto" NOT NULL DEFAULT 'COMERCIALIZACION',
    "precio" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ClaProducto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compartido"."ClaProveedor" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "telefono" TEXT,
    "nit" TEXT,
    "departamento" TEXT,
    "productosOfrece" TEXT,
    "sitioWeb" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ClaProveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compartido"."ClaTurnosDeAtencion" (
    "id" TEXT NOT NULL,
    "turno" TEXT NOT NULL,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ClaTurnosDeAtencion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo"."ActividadEconomica" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "claActividadId" TEXT NOT NULL,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "ActividadEconomica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo"."UnidadMedida" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "sigla" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "claUnidadId" TEXT,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "UnidadMedida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo"."Categoria" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actividadId" TEXT NOT NULL,
    "nivel" INTEGER NOT NULL DEFAULT 1,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "imagenUrl" TEXT,
    "padreId" TEXT,
    "claCategoriaId" TEXT,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo"."Producto" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actividadId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "claActividadId" TEXT,
    "claCategoriaId" TEXT,
    "claProductoId" TEXT,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "imagenUrl" TEXT,
    "unidadId" TEXT NOT NULL,
    "tipoProducto" "catalogo"."TipoDeProducto" NOT NULL DEFAULT 'COMERCIALIZACION',
    "precio" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cantidadStock" INTEGER NOT NULL DEFAULT 0,
    "stockMinimo" INTEGER NOT NULL DEFAULT 0,
    "tipoDescuento" TEXT NOT NULL DEFAULT 'SIN_DESCUENTO',
    "porcentajeDescuento" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "montoDescuento" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo"."ProductoPrecioHistorico" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "precioAnterior" DECIMAL(10,2) NOT NULL,
    "precioNuevo" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductoPrecioHistorico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo"."ProductoImagenes" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "imagenUrl" TEXT NOT NULL,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ProductoImagenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo"."ProductoOfertas" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "varianteId" TEXT,
    "etiquetaVariante" TEXT,
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFin" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "precioOferta" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "descuento" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ProductoOfertas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo"."ProductoOpciones" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precio" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tipoDescuento" TEXT NOT NULL DEFAULT 'SIN_DESCUENTO',
    "porcentajeDescuento" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "montoDescuento" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ProductoOpciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo"."ProductoAtributo" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "catalogo"."TipoAtributo" NOT NULL DEFAULT 'TEXTO',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ProductoAtributo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo"."ProductoAtributoValor" (
    "id" TEXT NOT NULL,
    "atributoId" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "hexColor" TEXT,
    "imagenUrl" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductoAtributoValor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo"."ProductoVariante" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "sku" TEXT,
    "precio" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cantidadStock" INTEGER NOT NULL DEFAULT 0,
    "stockMinimo" INTEGER NOT NULL DEFAULT 0,
    "imagenUrl" TEXT,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "inventarioActivado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProductoVariante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo"."ProductoVarianteAtributo" (
    "id" TEXT NOT NULL,
    "varianteId" TEXT NOT NULL,
    "atributoValorId" TEXT NOT NULL,

    CONSTRAINT "ProductoVarianteAtributo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo"."ProductoPrecioVolumen" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "varianteId" TEXT,
    "etiqueta" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ProductoPrecioVolumen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "almacen"."MovimientoInventario" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "varianteId" TEXT,
    "etiquetaVariante" TEXT,
    "tipo" "almacen"."TipoMovimiento" NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "motivo" TEXT,
    "referenciaId" TEXT,
    "stockAntes" INTEGER NOT NULL DEFAULT 0,
    "stockDespues" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "MovimientoInventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "almacen"."AjusteInventario" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tenantMemberId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "compartido"."Estado" NOT NULL,
    "motivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "AjusteInventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "almacen"."AjusteDetalle" (
    "id" TEXT NOT NULL,
    "ajusteId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "varianteId" TEXT,
    "etiquetaVariante" TEXT,
    "stockAnterior" INTEGER NOT NULL DEFAULT 0,
    "cantidadAjuste" INTEGER NOT NULL DEFAULT 0,
    "stockDespues" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "AjusteDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "almacen"."RecuentoInventario" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tenantMemberId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'PENDIENTE',
    "observacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "RecuentoInventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "almacen"."RecuentoDetalle" (
    "id" TEXT NOT NULL,
    "recuentoId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "varianteId" TEXT,
    "etiquetaVariante" TEXT,
    "stockSistema" INTEGER NOT NULL,
    "stockFisico" INTEGER NOT NULL,
    "diferencia" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "RecuentoDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "almacen"."Insumo" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "unidadMedidaId" TEXT NOT NULL,
    "cantidadStock" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "stockMinimo" INTEGER NOT NULL DEFAULT 0,
    "costoUnitario" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "fechaVencimiento" TIMESTAMP(3),
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Insumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "almacen"."MovimientoAlmacen" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "insumoId" TEXT NOT NULL,
    "tipo" "almacen"."TipoMovimientoAlmacen" NOT NULL,
    "cantidad" DECIMAL(10,4) NOT NULL,
    "motivo" TEXT,
    "referenciaId" TEXT,
    "stockAntes" INTEGER NOT NULL DEFAULT 0,
    "stockDespues" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "MovimientoAlmacen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "almacen"."ProductoInsumo" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "varianteId" TEXT,
    "insumoId" TEXT NOT NULL,
    "cantidad" DECIMAL(10,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ProductoInsumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "almacen"."IngresoAlmacen" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descripcion" TEXT,
    "proveedorId" TEXT NOT NULL,
    "tenantMemberId" TEXT,
    "totalCantidad" INTEGER NOT NULL DEFAULT 0,
    "totalIngreso" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "IngresoAlmacen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "almacen"."IngresoDetalle" (
    "id" TEXT NOT NULL,
    "ingresoId" TEXT NOT NULL,
    "insumoId" TEXT NOT NULL,
    "cantidad" DECIMAL(10,4) NOT NULL,
    "costoUnitario" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "costoTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lote" TEXT,
    "fechaVencimiento" TIMESTAMP(3),
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "IngresoDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "almacen"."SalidaAlmacen" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tenantMemberId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descripcion" TEXT,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "SalidaAlmacen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "almacen"."SalidaDetalle" (
    "id" TEXT NOT NULL,
    "salidaId" TEXT NOT NULL,
    "insumoId" TEXT NOT NULL,
    "cantidad" DECIMAL(10,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "SalidaDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "almacen"."RecuentoAlmacen" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tenantMemberId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'PENDIENTE',
    "observacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "RecuentoAlmacen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "almacen"."RecuentoAlmacenDetalle" (
    "id" TEXT NOT NULL,
    "recuentoId" TEXT NOT NULL,
    "insumoId" TEXT NOT NULL,
    "stockSistema" DECIMAL(10,4) NOT NULL,
    "stockFisico" DECIMAL(10,4) NOT NULL,
    "diferencia" DECIMAL(10,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "RecuentoAlmacenDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas"."Cliente" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "diaNacimiento" INTEGER,
    "mesNacimiento" INTEGER,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas"."TurnosDeAtencion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "turno" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "claTurnoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "TurnosDeAtencion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas"."PuntosDeVenta" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "telefono" TEXT,
    "sucursal" TEXT,
    "tipo" "ventas"."TipoPuntoDeVenta" NOT NULL DEFAULT 'CAJA',
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "PuntosDeVenta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas"."AperturaCierreDeCaja" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "puntoVentaId" TEXT NOT NULL,
    "turnoId" TEXT NOT NULL,
    "tenantMemberId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "montoIngresos" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "montoEgresos" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "montoVentas" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "montoDescuentos" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "montoArqueoCaja" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estadoCaja" "ventas"."EstadoDeCaja" NOT NULL DEFAULT 'APERTURADA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "AperturaCierreDeCaja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas"."IngresosCaja" (
    "id" TEXT NOT NULL,
    "aperturaCierreCajaId" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "montoIngreso" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "IngresosCaja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas"."EgresosCaja" (
    "id" TEXT NOT NULL,
    "aperturaCierreCajaId" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "montoEgreso" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "EgresosCaja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas"."Venta" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "puntoVentaId" TEXT NOT NULL,
    "turnoId" TEXT NOT NULL,
    "tenantMemberId" TEXT NOT NULL,
    "aperturaCierreCajaId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clienteTipoDocumento" TEXT,
    "clienteNroDocumento" TEXT,
    "clienteNombre" TEXT,
    "clienteEmail" TEXT,
    "clienteId" TEXT,
    "totalCantidad" INTEGER NOT NULL DEFAULT 0,
    "totalVenta" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalDescuento" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "efectivo" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "diferencia" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tipoPago" "ventas"."TipoDePago" NOT NULL DEFAULT 'EFECTIVO',
    "estadoPago" "ventas"."EstadoDePago" NOT NULL DEFAULT 'PAGADO',
    "referenciaId" TEXT,
    "referenciaTipo" "ventas"."ReferenciaTipoVenta" DEFAULT 'PUNTO_DE_VENTA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas"."VentaDetalle" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "varianteId" TEXT,
    "etiquetaVariante" TEXT,
    "precioVolumenId" TEXT,
    "etiquetaVolumen" TEXT,
    "notaVenta" TEXT,
    "precio" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cantidad" INTEGER NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "descuento" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "VentaDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas"."Proveedor" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "claProveedorId" TEXT,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "telefono" TEXT,
    "nit" TEXT,
    "departamento" TEXT,
    "productosOfrece" TEXT,
    "sitioWeb" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas"."Compra" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descripcion" TEXT,
    "proveedorId" TEXT NOT NULL,
    "tenantMemberId" TEXT,
    "totalCantidad" INTEGER NOT NULL DEFAULT 0,
    "totalCompra" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalCostoAdicional" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas"."CompraDetalle" (
    "id" TEXT NOT NULL,
    "compraId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "varianteId" TEXT,
    "etiquetaVariante" TEXT,
    "cantidad" INTEGER NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "precioEstimadoVenta" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "CompraDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas"."CompraCostoAdicional" (
    "id" TEXT NOT NULL,
    "compraId" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "costo" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "CompraCostoAdicional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas"."Gastos" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tenantMemberId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motivo" TEXT NOT NULL,
    "totalGasto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Gastos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas"."Pedido" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalCantidad" INTEGER NOT NULL DEFAULT 0,
    "totalPedido" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "respuesta" TEXT,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas"."PedidoDetalle" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "varianteId" TEXT,
    "etiquetaVariante" TEXT,
    "precioVolumenId" TEXT,
    "etiquetaVolumen" TEXT,
    "precio" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cantidad" INTEGER NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "PedidoDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultorio"."Medico" (
    "id" TEXT NOT NULL,
    "consultorioId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "especialidad" TEXT NOT NULL,
    "nroRegistro" TEXT,
    "bio" TEXT,
    "fotoUrl" TEXT,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Medico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultorio"."HorarioAtencion" (
    "id" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HorarioAtencion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultorio"."Paciente" (
    "id" TEXT NOT NULL,
    "consultorioId" TEXT NOT NULL,
    "dni" VARCHAR(20),
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "fechaNacimiento" TIMESTAMP(3),
    "genero" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "tipoSangre" TEXT,
    "alergias" TEXT,
    "seguroNombre" TEXT,
    "seguroNumero" TEXT,
    "canalNotificacion" TEXT,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Paciente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultorio"."ServicioMedico" (
    "id" TEXT NOT NULL,
    "consultorioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "especialidad" TEXT,
    "descripcion" TEXT,
    "duracionMin" INTEGER NOT NULL DEFAULT 30,
    "precioBase" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "ServicioMedico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultorio"."Cita" (
    "id" TEXT NOT NULL,
    "consultorioId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "servicioId" TEXT,
    "fechaHora" TIMESTAMP(3) NOT NULL,
    "duracionMin" INTEGER NOT NULL DEFAULT 30,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'PENDIENTE',
    "motivo" TEXT,
    "canalOrigen" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Cita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultorio"."RecordatorioCita" (
    "id" TEXT NOT NULL,
    "citaId" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "enviadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estadoEnvio" TEXT NOT NULL DEFAULT 'ENVIADO',

    CONSTRAINT "RecordatorioCita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultorio"."HistoriaClinica" (
    "id" TEXT NOT NULL,
    "consultorioId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "citaId" TEXT,
    "especialidad" TEXT NOT NULL,
    "motivoConsulta" TEXT NOT NULL,
    "diagnostico" TEXT,
    "tratamiento" TEXT,
    "observaciones" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "HistoriaClinica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultorio"."HcOdontologia" (
    "id" TEXT NOT NULL,
    "historiaId" TEXT NOT NULL,
    "odontograma" JSONB NOT NULL,
    "procedimiento" TEXT,
    "dienteNumero" TEXT,
    "estadoDiente" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "HcOdontologia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultorio"."HcPediatria" (
    "id" TEXT NOT NULL,
    "historiaId" TEXT NOT NULL,
    "pesoKg" DECIMAL(5,2),
    "tallaCm" DECIMAL(5,2),
    "perimetroCefalico" DECIMAL(5,2),
    "percentilPeso" TEXT,
    "percentilTalla" TEXT,
    "desarrolloPsicomotor" TEXT,
    "observacionNutricional" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "HcPediatria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultorio"."HcGeneral" (
    "id" TEXT NOT NULL,
    "historiaId" TEXT NOT NULL,
    "presionArterial" TEXT,
    "temperatura" DECIMAL(4,1),
    "frecuenciaCardiaca" INTEGER,
    "frecuenciaRespiratoria" INTEGER,
    "saturacionO2" DECIMAL(4,1),
    "recetaMedica" TEXT,
    "examenesOlicitados" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "HcGeneral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultorio"."HcPerinatal" (
    "id" TEXT NOT NULL,
    "historiaId" TEXT NOT NULL,
    "nroCarpetaFamiliar" TEXT,
    "codigoSeguro" TEXT,
    "antecedentes" JSONB,
    "gestasPrevias" INTEGER,
    "abortos" INTEGER,
    "partosVaginales" INTEGER,
    "cesareas" INTEGER,
    "nacidosVivos" INTEGER,
    "nacidosMuertos" INTEGER,
    "viven" INTEGER,
    "muertos1raSemana" INTEGER,
    "muertosDespues1ra" INTEGER,
    "embarazoPlaneado" BOOLEAN,
    "finEmbarazoAnteriorFecha" TIMESTAMP(3),
    "embarazoMenosDeUnAnio" BOOLEAN,
    "antecedenteGemelares" BOOLEAN,
    "fracasoMetodoAnticonceptivo" TEXT,
    "pesoAnteriorKg" DECIMAL(5,2),
    "tallaCm" DECIMAL(5,2),
    "imcInicial" DECIMAL(4,1),
    "fum" TIMESTAMP(3),
    "fpp" TIMESTAMP(3),
    "edConfiablePorFUM" BOOLEAN,
    "edConfiablePorEco" BOOLEAN,
    "habitosRiesgo" JSONB,
    "antirrubeola" TEXT,
    "antitetanica" TEXT,
    "examenOdontologico" BOOLEAN,
    "examenMamas" BOOLEAN,
    "cervixInspeccion" TEXT,
    "laboratorios" JSONB,
    "esParto" BOOLEAN,
    "fechaIngreso" TIMESTAMP(3),
    "consultasPrenatalesTotal" INTEGER,
    "carnetPrenatal" BOOLEAN,
    "embarazoHospitalizado" BOOLEAN,
    "corticoideAntenatal" TEXT,
    "inicioParto" TEXT,
    "roturaMembranasAnteparto" BOOLEAN,
    "roturaMembranasFecha" TIMESTAMP(3),
    "edadGestacionalParto" TEXT,
    "presentacionSituacion" TEXT,
    "tamanoFetalAcorde" BOOLEAN,
    "acompananteParto" TEXT,
    "partograma" JSONB,
    "enfermedades" JSONB,
    "terminacion" TEXT,
    "indicacionPrincipalInduccion" TEXT,
    "medicacionRecibida" JSONB,
    "posicionParto" TEXT,
    "episiotomia" BOOLEAN,
    "desgarroGrado" INTEGER,
    "alumbramientoActivo" BOOLEAN,
    "ligaduraCordon" TEXT,
    "placentaCompleta" BOOLEAN,
    "placentaRetenida" BOOLEAN,
    "recienNacidos" JSONB,
    "partoMultiple" BOOLEAN,
    "partoMultipleOrden" INTEGER,
    "puerperioControles" JSONB,
    "lactanciaInmediata" BOOLEAN,
    "apegoPrecoz" BOOLEAN,
    "hbPostparto" DECIMAL(4,1),
    "rnEgresoEstado" TEXT,
    "rnEgresoFecha" TIMESTAMP(3),
    "rnDiasCompletos" INTEGER,
    "rnAlimentoAlAlta" TEXT,
    "rnBCG" BOOLEAN,
    "rnPesoEgresoGramos" INTEGER,
    "rnTraslado" BOOLEAN,
    "rnTrasladoLugar" TEXT,
    "mujerEgresoEstado" TEXT,
    "mujerEgresoFecha" TIMESTAMP(3),
    "mujerTraslado" BOOLEAN,
    "mujerTrasladoLugar" TEXT,
    "mujerDiasCompletosDesdeParto" INTEGER,
    "anticoncepcionMetodoElegido" TEXT,
    "anticoncepcionOrientacion" BOOLEAN,
    "observaciones" TEXT,
    "responsable" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "HcPerinatal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultorio"."HcPerinatalControl" (
    "id" TEXT NOT NULL,
    "perinatalId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "edadGestacional" TEXT,
    "pesoKg" DECIMAL(5,2),
    "imc" DECIMAL(4,1),
    "presionArterial" TEXT,
    "alturaUterinaCm" DECIMAL(4,1),
    "presentacion" TEXT,
    "fcfLpm" INTEGER,
    "movimientosFetales" TEXT,
    "proteinuria" TEXT,
    "tablasFerroso" BOOLEAN,
    "senalesPeligro" TEXT,
    "examenes" TEXT,
    "tratamientos" TEXT,
    "responsable" TEXT,
    "proximaCita" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "HcPerinatalControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultorio"."AdjuntoClinico" (
    "id" TEXT NOT NULL,
    "historiaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "subidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdjuntoClinico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultorio"."Vacunacion" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "vacuna" TEXT NOT NULL,
    "dosis" TEXT,
    "fechaAplicacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proximaDosis" TIMESTAMP(3),
    "medicoId" TEXT,
    "lote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vacunacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultorio"."AtencionMedica" (
    "id" TEXT NOT NULL,
    "consultorioId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "pacienteNombre" TEXT NOT NULL,
    "pacienteApellido" TEXT NOT NULL,
    "pacienteTelefono" TEXT,
    "medicoId" TEXT NOT NULL,
    "medicoNombre" TEXT NOT NULL,
    "medicoEspecialidad" TEXT NOT NULL,
    "citaId" TEXT,
    "fechaAtencion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalServicios" INTEGER NOT NULL DEFAULT 0,
    "totalCantidad" INTEGER NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "descuento" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tipoPago" "consultorio"."TipoPagoMedico" NOT NULL DEFAULT 'EFECTIVO',
    "estadoPago" "consultorio"."EstadoPagoMedico" NOT NULL DEFAULT 'PENDIENTE',
    "observaciones" TEXT,
    "estado" "consultorio"."EstadoAtencion" NOT NULL DEFAULT 'EN_CURSO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "AtencionMedica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultorio"."AtencionDetalle" (
    "id" TEXT NOT NULL,
    "atencionId" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "servicioNombre" TEXT NOT NULL,
    "especialidad" TEXT NOT NULL,
    "tipoTratamiento" "consultorio"."TipoTratamiento" NOT NULL,
    "descripcionTratamiento" TEXT,
    "referenciaClin" TEXT,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "precioUnitario" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "descuento" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "nota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "AtencionDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultorio"."AtencionPago" (
    "id" TEXT NOT NULL,
    "atencionId" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "metodo" "consultorio"."TipoPagoMedico" NOT NULL,
    "referencia" TEXT,
    "nota" TEXT,
    "pagadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registradoPor" TEXT,

    CONSTRAINT "AtencionPago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultorio"."RecetaMedica" (
    "id" TEXT NOT NULL,
    "consultorioId" TEXT NOT NULL,
    "atencionId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "pacienteNombre" TEXT NOT NULL,
    "pacienteApellido" TEXT NOT NULL,
    "medicoNombre" TEXT NOT NULL,
    "medicoEspecialidad" TEXT NOT NULL,
    "medicoRegistro" TEXT,
    "numeroReceta" TEXT NOT NULL,
    "indicacionesGenerales" TEXT,
    "diagnosticoCie10" TEXT,
    "fechaEmision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaVencimiento" TIMESTAMP(3),
    "estado" "consultorio"."EstadoReceta" NOT NULL DEFAULT 'EMITIDA',
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "RecetaMedica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultorio"."RecetaMedicaDetalle" (
    "id" TEXT NOT NULL,
    "recetaId" TEXT NOT NULL,
    "productoId" TEXT,
    "medicamento" TEXT NOT NULL,
    "principioActivo" TEXT,
    "concentracion" TEXT,
    "presentacion" TEXT,
    "dosis" TEXT NOT NULL,
    "frecuencia" TEXT NOT NULL,
    "duracion" TEXT NOT NULL,
    "via" "consultorio"."ViaAdministracion" NOT NULL DEFAULT 'ORAL',
    "cantidadPrescrita" INTEGER NOT NULL DEFAULT 1,
    "indicaciones" TEXT,
    "permiteSustitucion" BOOLEAN NOT NULL DEFAULT true,
    "estado" "consultorio"."EstadoRecetaDetalle" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "RecetaMedicaDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultorio"."AuditoriaAcceso" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "consultorioId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "recursoTipo" TEXT NOT NULL,
    "recursoId" TEXT NOT NULL,
    "ip" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditoriaAcceso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurante"."TiempoComida" (
    "id" TEXT NOT NULL,
    "restauranteId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "icono" TEXT,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "TiempoComida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurante"."Menu" (
    "id" TEXT NOT NULL,
    "restauranteId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "restaurante"."TipoMenu" NOT NULL DEFAULT 'DIARIO',
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "descripcion" TEXT,
    "imagenPortada" TEXT,
    "tema" TEXT,
    "creadoPorId" TEXT,
    "estado" "restaurante"."EstadoMenu" NOT NULL DEFAULT 'BORRADOR',
    "fechaPublicacion" TIMESTAMP(3),
    "fechaPublicacionRRSS" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurante"."MenuItem" (
    "id" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,
    "tiempoComidaId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "nombreSnapshot" TEXT NOT NULL,
    "descripcionSnapshot" TEXT,
    "imagenSnapshot" TEXT,
    "precio" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "esEspecial" BOOLEAN NOT NULL DEFAULT false,
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "disponible" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "notaMenu" TEXT,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurante"."Reserva" (
    "id" TEXT NOT NULL,
    "restauranteId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "clienteId" TEXT,
    "clienteNombre" TEXT NOT NULL,
    "clienteTelefono" TEXT,
    "clienteEmail" TEXT,
    "menuId" TEXT,
    "fechaReserva" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaLlegada" TIMESTAMP(3) NOT NULL,
    "numeroComensales" INTEGER NOT NULL DEFAULT 1,
    "numeroMesa" TEXT,
    "observaciones" TEXT,
    "canalOrigen" TEXT,
    "totalCantidad" INTEGER NOT NULL DEFAULT 0,
    "totalEstimado" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estado" "restaurante"."EstadoReserva" NOT NULL DEFAULT 'RESERVADA',
    "atendidaPorId" TEXT,
    "fechaConfirmacion" TIMESTAMP(3),
    "fechaCancelacion" TIMESTAMP(3),
    "motivoCancelacion" TEXT,
    "ventaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Reserva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurante"."ReservaDetalle" (
    "id" TEXT NOT NULL,
    "reservaId" TEXT NOT NULL,
    "menuItemId" TEXT,
    "productoId" TEXT NOT NULL,
    "productoNombre" TEXT NOT NULL,
    "productoImagen" TEXT,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "precio" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "observacion" TEXT,
    "estadoCocina" "restaurante"."EstadoCocina" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ReservaDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurante"."PedidoEstadoLog" (
    "id" TEXT NOT NULL,
    "reservaId" TEXT NOT NULL,
    "estadoAnterior" "restaurante"."EstadoReserva",
    "estadoNuevo" "restaurante"."EstadoReserva" NOT NULL,
    "cambiadoPorId" TEXT,
    "nota" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PedidoEstadoLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurante"."PublicacionMenuRRSS" (
    "id" TEXT NOT NULL,
    "restauranteId" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,
    "publicacionId" TEXT,
    "redSocial" "restaurante"."RedSocial" NOT NULL,
    "urlPublicacion" TEXT,
    "urlImagenGenerada" TEXT,
    "fechaProgramada" TIMESTAMP(3),
    "fechaPublicada" TIMESTAMP(3),
    "alcance" INTEGER,
    "reacciones" INTEGER,
    "comentarios" INTEGER,
    "estado" "restaurante"."EstadoPublicacionRRSS" NOT NULL DEFAULT 'PROGRAMADA',
    "errorMensaje" TEXT,
    "creadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "PublicacionMenuRRSS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social"."ProductoReaccion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductoReaccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social"."ProductoComentario" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "editado" BOOLEAN NOT NULL DEFAULT false,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "padreId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ProductoComentario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social"."ProductoComentarioReaccion" (
    "id" TEXT NOT NULL,
    "comentarioId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductoComentarioReaccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social"."ProductoValoracion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "puntuacion" INTEGER NOT NULL,
    "resena" TEXT,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ProductoValoracion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social"."ProductoPregunta" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pregunta" TEXT NOT NULL,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ProductoPregunta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social"."ProductoRespuesta" (
    "id" TEXT NOT NULL,
    "preguntaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "respuesta" TEXT NOT NULL,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ProductoRespuesta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social"."ProductoFavorito" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductoFavorito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social"."Publicacion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "titulo" TEXT,
    "contenido" TEXT,
    "tipo" "social"."TipoPublicacion" NOT NULL DEFAULT 'TEXTO',
    "estado" "social"."EstadoPublicacion" NOT NULL DEFAULT 'BORRADOR',
    "etiquetas" TEXT[],
    "publicadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Publicacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social"."PublicacionMedia" (
    "id" TEXT NOT NULL,
    "publicacionId" TEXT NOT NULL,
    "tipo" "social"."TipoMediaPublicacion" NOT NULL,
    "url" TEXT,
    "embedUrl" TEXT,
    "thumbnailUrl" TEXT,
    "plataforma" "social"."PlataformaMedia",
    "titulo" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "PublicacionMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social"."PublicacionReaccion" (
    "id" TEXT NOT NULL,
    "publicacionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "social"."TipoReaccion" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicacionReaccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social"."PublicacionComentario" (
    "id" TEXT NOT NULL,
    "publicacionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "editado" BOOLEAN NOT NULL DEFAULT false,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "padreId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "PublicacionComentario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social"."PublicacionComentarioReaccion" (
    "id" TEXT NOT NULL,
    "comentarioId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "social"."TipoReaccion" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicacionComentarioReaccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social"."PublicacionCompartido" (
    "id" TEXT NOT NULL,
    "publicacionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plataforma" "social"."PlataformaCompartido" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicacionCompartido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social"."TiendaReaccion" (
    "id" TEXT NOT NULL,
    "tiendaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "social"."TipoReaccion" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TiendaReaccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social"."TiendaComentario" (
    "id" TEXT NOT NULL,
    "tiendaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "editado" BOOLEAN NOT NULL DEFAULT false,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "padreId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "TiendaComentario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social"."TiendaComentarioReaccion" (
    "id" TEXT NOT NULL,
    "comentarioId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "social"."TipoReaccion" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TiendaComentarioReaccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social"."TiendaValoracion" (
    "id" TEXT NOT NULL,
    "tiendaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "puntuacion" INTEGER NOT NULL,
    "resena" TEXT,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "TiendaValoracion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social"."TiendaPregunta" (
    "id" TEXT NOT NULL,
    "tiendaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pregunta" TEXT NOT NULL,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "TiendaPregunta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social"."TiendaRespuesta" (
    "id" TEXT NOT NULL,
    "preguntaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "respuesta" TEXT NOT NULL,
    "estado" "compartido"."Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "TiendaRespuesta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social"."TiendaFavorito" (
    "id" TEXT NOT NULL,
    "tiendaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TiendaFavorito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social"."TiendaSeguidor" (
    "id" TEXT NOT NULL,
    "tiendaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TiendaSeguidor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "autenticacion"."user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_userName_key" ON "autenticacion"."user"("userName");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "autenticacion"."session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "autenticacion"."session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "autenticacion"."account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "account_providerId_accountId_key" ON "autenticacion"."account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "autenticacion"."verification"("identifier");

-- CreateIndex
CREATE INDEX "invitation_email_idx" ON "autenticacion"."invitation"("email");

-- CreateIndex
CREATE INDEX "invitation_organizationId_status_idx" ON "autenticacion"."invitation"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "organization_name_key" ON "tenant"."organization"("name");

-- CreateIndex
CREATE UNIQUE INDEX "organization_slug_key" ON "tenant"."organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "organization_nombreLargo_key" ON "tenant"."organization"("nombreLargo");

-- CreateIndex
CREATE INDEX "member_userId_idx" ON "tenant"."member"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "member_organizationId_userId_key" ON "tenant"."member"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "RolPermiso_tenantId_rol_modulo_accion_key" ON "tenant"."RolPermiso"("tenantId", "rol", "modulo", "accion");

-- CreateIndex
CREATE INDEX "Localizacion_latitud_longitud_idx" ON "tenant"."Localizacion"("latitud", "longitud");

-- CreateIndex
CREATE INDEX "Localizacion_departamento_ciudad_idx" ON "tenant"."Localizacion"("departamento", "ciudad");

-- CreateIndex
CREATE UNIQUE INDEX "Propietario_tenantId_key" ON "tenant"."Propietario"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Propietario_userId_key" ON "tenant"."Propietario"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Propietario_tenantId_telefono_key" ON "tenant"."Propietario"("tenantId", "telefono");

-- CreateIndex
CREATE UNIQUE INDEX "Propietario_tenantId_nombres_key" ON "tenant"."Propietario"("tenantId", "nombres");

-- CreateIndex
CREATE INDEX "Imagen_tenantId_orden_idx" ON "tenant"."Imagen"("tenantId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "Imagen_tenantId_imagenUrl_key" ON "tenant"."Imagen"("tenantId", "imagenUrl");

-- CreateIndex
CREATE INDEX "Descripcion_tenantId_orden_idx" ON "tenant"."Descripcion"("tenantId", "orden");

-- CreateIndex
CREATE INDEX "EquipoDeTrabajo_tenantId_orden_idx" ON "tenant"."EquipoDeTrabajo"("tenantId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "EquipoDeTrabajo_tenantId_telefono_key" ON "tenant"."EquipoDeTrabajo"("tenantId", "telefono");

-- CreateIndex
CREATE UNIQUE INDEX "EquipoDeTrabajo_tenantId_nombres_key" ON "tenant"."EquipoDeTrabajo"("tenantId", "nombres");

-- CreateIndex
CREATE UNIQUE INDEX "Tienda_tenantId_key" ON "tenant"."Tienda"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Configuracion_tiendaId_key" ON "tenant"."Configuracion"("tiendaId");

-- CreateIndex
CREATE UNIQUE INDEX "Consultorio_tenantId_key" ON "tenant"."Consultorio"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Restaurante_tenantId_key" ON "tenant"."Restaurante"("tenantId");

-- CreateIndex
CREATE INDEX "Mensaje_tenantId_senderUserId_recipientUserId_idx" ON "compartido"."Mensaje"("tenantId", "senderUserId", "recipientUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaccion_mensajeId_emoji_userId_key" ON "compartido"."Reaccion"("mensajeId", "emoji", "userId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_tabla_fecha_idx" ON "compartido"."AuditLog"("tenantId", "tabla", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "ClaActividadEconomica_codigo_key" ON "compartido"."ClaActividadEconomica"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "ClaUnidadMedida_unidad_key" ON "compartido"."ClaUnidadMedida"("unidad");

-- CreateIndex
CREATE UNIQUE INDEX "ClaUnidadMedida_sigla_key" ON "compartido"."ClaUnidadMedida"("sigla");

-- CreateIndex
CREATE UNIQUE INDEX "ClaCategoria_claActividadId_nivel_nombre_key" ON "compartido"."ClaCategoria"("claActividadId", "nivel", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "ClaProducto_claActividadId_claCategoriaId_codigo_key" ON "compartido"."ClaProducto"("claActividadId", "claCategoriaId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "ClaProducto_claActividadId_claCategoriaId_nombre_key" ON "compartido"."ClaProducto"("claActividadId", "claCategoriaId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "ClaProveedor_nombre_key" ON "compartido"."ClaProveedor"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "ClaProveedor_nit_key" ON "compartido"."ClaProveedor"("nit");

-- CreateIndex
CREATE UNIQUE INDEX "ClaTurnosDeAtencion_turno_key" ON "compartido"."ClaTurnosDeAtencion"("turno");

-- CreateIndex
CREATE UNIQUE INDEX "ActividadEconomica_tenantId_claActividadId_key" ON "catalogo"."ActividadEconomica"("tenantId", "claActividadId");

-- CreateIndex
CREATE UNIQUE INDEX "UnidadMedida_tenantId_unidad_key" ON "catalogo"."UnidadMedida"("tenantId", "unidad");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_tenantId_actividadId_nombre_key" ON "catalogo"."Categoria"("tenantId", "actividadId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_tenantId_actividadId_categoriaId_codigo_key" ON "catalogo"."Producto"("tenantId", "actividadId", "categoriaId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_tenantId_actividadId_categoriaId_nombre_key" ON "catalogo"."Producto"("tenantId", "actividadId", "categoriaId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "ProductoImagenes_productoId_imagenUrl_key" ON "catalogo"."ProductoImagenes"("productoId", "imagenUrl");

-- CreateIndex
CREATE UNIQUE INDEX "ProductoOfertas_productoId_varianteId_fechaInicio_fechaFin_key" ON "catalogo"."ProductoOfertas"("productoId", "varianteId", "fechaInicio", "fechaFin");

-- CreateIndex
CREATE UNIQUE INDEX "ProductoOpciones_productoId_nombre_key" ON "catalogo"."ProductoOpciones"("productoId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "ProductoAtributo_productoId_nombre_key" ON "catalogo"."ProductoAtributo"("productoId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "ProductoAtributoValor_atributoId_valor_key" ON "catalogo"."ProductoAtributoValor"("atributoId", "valor");

-- CreateIndex
CREATE UNIQUE INDEX "ProductoVariante_productoId_sku_key" ON "catalogo"."ProductoVariante"("productoId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "ProductoVarianteAtributo_varianteId_atributoValorId_key" ON "catalogo"."ProductoVarianteAtributo"("varianteId", "atributoValorId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductoPrecioVolumen_productoId_varianteId_cantidad_key" ON "catalogo"."ProductoPrecioVolumen"("productoId", "varianteId", "cantidad");

-- CreateIndex
CREATE UNIQUE INDEX "MovimientoInventario_tenantId_productoId_varianteId_tipo_re_key" ON "almacen"."MovimientoInventario"("tenantId", "productoId", "varianteId", "tipo", "referenciaId");

-- CreateIndex
CREATE UNIQUE INDEX "AjusteDetalle_ajusteId_productoId_varianteId_key" ON "almacen"."AjusteDetalle"("ajusteId", "productoId", "varianteId");

-- CreateIndex
CREATE UNIQUE INDEX "RecuentoDetalle_recuentoId_productoId_varianteId_key" ON "almacen"."RecuentoDetalle"("recuentoId", "productoId", "varianteId");

-- CreateIndex
CREATE UNIQUE INDEX "MovimientoAlmacen_tenantId_insumoId_tipo_referenciaId_key" ON "almacen"."MovimientoAlmacen"("tenantId", "insumoId", "tipo", "referenciaId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductoInsumo_productoId_varianteId_insumoId_key" ON "almacen"."ProductoInsumo"("productoId", "varianteId", "insumoId");

-- CreateIndex
CREATE UNIQUE INDEX "IngresoDetalle_ingresoId_insumoId_key" ON "almacen"."IngresoDetalle"("ingresoId", "insumoId");

-- CreateIndex
CREATE UNIQUE INDEX "SalidaDetalle_salidaId_insumoId_key" ON "almacen"."SalidaDetalle"("salidaId", "insumoId");

-- CreateIndex
CREATE UNIQUE INDEX "RecuentoAlmacenDetalle_recuentoId_insumoId_key" ON "almacen"."RecuentoAlmacenDetalle"("recuentoId", "insumoId");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_tenantId_nombre_key" ON "ventas"."Cliente"("tenantId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_tenantId_email_key" ON "ventas"."Cliente"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "TurnosDeAtencion_tenantId_turno_key" ON "ventas"."TurnosDeAtencion"("tenantId", "turno");

-- CreateIndex
CREATE UNIQUE INDEX "PuntosDeVenta_tenantId_nombre_key" ON "ventas"."PuntosDeVenta"("tenantId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "AperturaCierreDeCaja_tenantId_puntoVentaId_turnoId_tenantMe_key" ON "ventas"."AperturaCierreDeCaja"("tenantId", "puntoVentaId", "turnoId", "tenantMemberId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "VentaDetalle_ventaId_productoId_varianteId_key" ON "ventas"."VentaDetalle"("ventaId", "productoId", "varianteId");

-- CreateIndex
CREATE UNIQUE INDEX "Proveedor_tenantId_nombre_key" ON "ventas"."Proveedor"("tenantId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Proveedor_tenantId_nit_key" ON "ventas"."Proveedor"("tenantId", "nit");

-- CreateIndex
CREATE UNIQUE INDEX "CompraDetalle_compraId_productoId_varianteId_key" ON "ventas"."CompraDetalle"("compraId", "productoId", "varianteId");

-- CreateIndex
CREATE UNIQUE INDEX "CompraCostoAdicional_compraId_motivo_key" ON "ventas"."CompraCostoAdicional"("compraId", "motivo");

-- CreateIndex
CREATE UNIQUE INDEX "PedidoDetalle_pedidoId_productoId_varianteId_key" ON "ventas"."PedidoDetalle"("pedidoId", "productoId", "varianteId");

-- CreateIndex
CREATE UNIQUE INDEX "Medico_memberId_key" ON "consultorio"."Medico"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "Medico_consultorioId_nroRegistro_key" ON "consultorio"."Medico"("consultorioId", "nroRegistro");

-- CreateIndex
CREATE UNIQUE INDEX "HorarioAtencion_medicoId_diaSemana_horaInicio_key" ON "consultorio"."HorarioAtencion"("medicoId", "diaSemana", "horaInicio");

-- CreateIndex
CREATE INDEX "Paciente_consultorioId_apellido_idx" ON "consultorio"."Paciente"("consultorioId", "apellido");

-- CreateIndex
CREATE UNIQUE INDEX "Paciente_consultorioId_email_key" ON "consultorio"."Paciente"("consultorioId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Paciente_consultorioId_dni_key" ON "consultorio"."Paciente"("consultorioId", "dni");

-- CreateIndex
CREATE UNIQUE INDEX "ServicioMedico_consultorioId_nombre_key" ON "consultorio"."ServicioMedico"("consultorioId", "nombre");

-- CreateIndex
CREATE INDEX "Cita_consultorioId_medicoId_fechaHora_idx" ON "consultorio"."Cita"("consultorioId", "medicoId", "fechaHora");

-- CreateIndex
CREATE INDEX "Cita_consultorioId_pacienteId_idx" ON "consultorio"."Cita"("consultorioId", "pacienteId");

-- CreateIndex
CREATE UNIQUE INDEX "HistoriaClinica_citaId_key" ON "consultorio"."HistoriaClinica"("citaId");

-- CreateIndex
CREATE INDEX "HistoriaClinica_pacienteId_fecha_idx" ON "consultorio"."HistoriaClinica"("pacienteId", "fecha");

-- CreateIndex
CREATE INDEX "HistoriaClinica_medicoId_fecha_idx" ON "consultorio"."HistoriaClinica"("medicoId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "HcOdontologia_historiaId_key" ON "consultorio"."HcOdontologia"("historiaId");

-- CreateIndex
CREATE UNIQUE INDEX "HcPediatria_historiaId_key" ON "consultorio"."HcPediatria"("historiaId");

-- CreateIndex
CREATE UNIQUE INDEX "HcGeneral_historiaId_key" ON "consultorio"."HcGeneral"("historiaId");

-- CreateIndex
CREATE UNIQUE INDEX "HcPerinatal_historiaId_key" ON "consultorio"."HcPerinatal"("historiaId");

-- CreateIndex
CREATE INDEX "HcPerinatalControl_perinatalId_fecha_idx" ON "consultorio"."HcPerinatalControl"("perinatalId", "fecha");

-- CreateIndex
CREATE INDEX "Vacunacion_pacienteId_idx" ON "consultorio"."Vacunacion"("pacienteId");

-- CreateIndex
CREATE UNIQUE INDEX "AtencionMedica_citaId_key" ON "consultorio"."AtencionMedica"("citaId");

-- CreateIndex
CREATE INDEX "AtencionMedica_consultorioId_medicoId_fechaAtencion_idx" ON "consultorio"."AtencionMedica"("consultorioId", "medicoId", "fechaAtencion");

-- CreateIndex
CREATE INDEX "AtencionMedica_consultorioId_pacienteId_idx" ON "consultorio"."AtencionMedica"("consultorioId", "pacienteId");

-- CreateIndex
CREATE INDEX "AtencionDetalle_atencionId_idx" ON "consultorio"."AtencionDetalle"("atencionId");

-- CreateIndex
CREATE UNIQUE INDEX "AtencionDetalle_atencionId_servicioId_tipoTratamiento_key" ON "consultorio"."AtencionDetalle"("atencionId", "servicioId", "tipoTratamiento");

-- CreateIndex
CREATE INDEX "RecetaMedica_pacienteId_fechaEmision_idx" ON "consultorio"."RecetaMedica"("pacienteId", "fechaEmision");

-- CreateIndex
CREATE INDEX "RecetaMedica_medicoId_fechaEmision_idx" ON "consultorio"."RecetaMedica"("medicoId", "fechaEmision");

-- CreateIndex
CREATE UNIQUE INDEX "RecetaMedica_consultorioId_numeroReceta_key" ON "consultorio"."RecetaMedica"("consultorioId", "numeroReceta");

-- CreateIndex
CREATE INDEX "RecetaMedicaDetalle_recetaId_idx" ON "consultorio"."RecetaMedicaDetalle"("recetaId");

-- CreateIndex
CREATE INDEX "RecetaMedicaDetalle_productoId_idx" ON "consultorio"."RecetaMedicaDetalle"("productoId");

-- CreateIndex
CREATE INDEX "AuditoriaAcceso_consultorioId_recursoId_idx" ON "consultorio"."AuditoriaAcceso"("consultorioId", "recursoId");

-- CreateIndex
CREATE INDEX "AuditoriaAcceso_userId_timestamp_idx" ON "consultorio"."AuditoriaAcceso"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "TiempoComida_restauranteId_orden_idx" ON "restaurante"."TiempoComida"("restauranteId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "TiempoComida_restauranteId_nombre_key" ON "restaurante"."TiempoComida"("restauranteId", "nombre");

-- CreateIndex
CREATE INDEX "Menu_restauranteId_tipo_fechaInicio_idx" ON "restaurante"."Menu"("restauranteId", "tipo", "fechaInicio");

-- CreateIndex
CREATE INDEX "Menu_restauranteId_estado_idx" ON "restaurante"."Menu"("restauranteId", "estado");

-- CreateIndex
CREATE INDEX "MenuItem_menuId_orden_idx" ON "restaurante"."MenuItem"("menuId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItem_menuId_tiempoComidaId_productoId_key" ON "restaurante"."MenuItem"("menuId", "tiempoComidaId", "productoId");

-- CreateIndex
CREATE UNIQUE INDEX "Reserva_ventaId_key" ON "restaurante"."Reserva"("ventaId");

-- CreateIndex
CREATE INDEX "Reserva_restauranteId_fechaLlegada_idx" ON "restaurante"."Reserva"("restauranteId", "fechaLlegada");

-- CreateIndex
CREATE INDEX "Reserva_restauranteId_estado_idx" ON "restaurante"."Reserva"("restauranteId", "estado");

-- CreateIndex
CREATE INDEX "Reserva_clienteId_idx" ON "restaurante"."Reserva"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "Reserva_restauranteId_codigo_key" ON "restaurante"."Reserva"("restauranteId", "codigo");

-- CreateIndex
CREATE INDEX "ReservaDetalle_reservaId_idx" ON "restaurante"."ReservaDetalle"("reservaId");

-- CreateIndex
CREATE INDEX "PedidoEstadoLog_reservaId_fecha_idx" ON "restaurante"."PedidoEstadoLog"("reservaId", "fecha");

-- CreateIndex
CREATE INDEX "PublicacionMenuRRSS_restauranteId_fechaProgramada_idx" ON "restaurante"."PublicacionMenuRRSS"("restauranteId", "fechaProgramada");

-- CreateIndex
CREATE INDEX "PublicacionMenuRRSS_menuId_idx" ON "restaurante"."PublicacionMenuRRSS"("menuId");

-- CreateIndex
CREATE INDEX "ProductoReaccion_productoId_idx" ON "social"."ProductoReaccion"("productoId");

-- CreateIndex
CREATE INDEX "ProductoReaccion_tenantId_idx" ON "social"."ProductoReaccion"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductoReaccion_productoId_userId_emoji_key" ON "social"."ProductoReaccion"("productoId", "userId", "emoji");

-- CreateIndex
CREATE INDEX "ProductoComentario_productoId_idx" ON "social"."ProductoComentario"("productoId");

-- CreateIndex
CREATE INDEX "ProductoComentario_userId_idx" ON "social"."ProductoComentario"("userId");

-- CreateIndex
CREATE INDEX "ProductoComentario_padreId_idx" ON "social"."ProductoComentario"("padreId");

-- CreateIndex
CREATE INDEX "ProductoComentarioReaccion_comentarioId_idx" ON "social"."ProductoComentarioReaccion"("comentarioId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductoComentarioReaccion_comentarioId_userId_emoji_key" ON "social"."ProductoComentarioReaccion"("comentarioId", "userId", "emoji");

-- CreateIndex
CREATE INDEX "ProductoValoracion_productoId_idx" ON "social"."ProductoValoracion"("productoId");

-- CreateIndex
CREATE INDEX "ProductoValoracion_tenantId_idx" ON "social"."ProductoValoracion"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductoValoracion_productoId_userId_key" ON "social"."ProductoValoracion"("productoId", "userId");

-- CreateIndex
CREATE INDEX "ProductoPregunta_productoId_idx" ON "social"."ProductoPregunta"("productoId");

-- CreateIndex
CREATE INDEX "ProductoPregunta_userId_idx" ON "social"."ProductoPregunta"("userId");

-- CreateIndex
CREATE INDEX "ProductoRespuesta_preguntaId_idx" ON "social"."ProductoRespuesta"("preguntaId");

-- CreateIndex
CREATE INDEX "ProductoFavorito_tenantId_userId_idx" ON "social"."ProductoFavorito"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductoFavorito_productoId_userId_key" ON "social"."ProductoFavorito"("productoId", "userId");

-- CreateIndex
CREATE INDEX "Publicacion_tenantId_estado_idx" ON "social"."Publicacion"("tenantId", "estado");

-- CreateIndex
CREATE INDEX "Publicacion_tenantId_autorId_idx" ON "social"."Publicacion"("tenantId", "autorId");

-- CreateIndex
CREATE INDEX "PublicacionMedia_publicacionId_idx" ON "social"."PublicacionMedia"("publicacionId");

-- CreateIndex
CREATE INDEX "PublicacionReaccion_publicacionId_idx" ON "social"."PublicacionReaccion"("publicacionId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicacionReaccion_publicacionId_userId_key" ON "social"."PublicacionReaccion"("publicacionId", "userId");

-- CreateIndex
CREATE INDEX "PublicacionComentario_publicacionId_idx" ON "social"."PublicacionComentario"("publicacionId");

-- CreateIndex
CREATE INDEX "PublicacionComentario_userId_idx" ON "social"."PublicacionComentario"("userId");

-- CreateIndex
CREATE INDEX "PublicacionComentario_padreId_idx" ON "social"."PublicacionComentario"("padreId");

-- CreateIndex
CREATE INDEX "PublicacionComentarioReaccion_comentarioId_idx" ON "social"."PublicacionComentarioReaccion"("comentarioId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicacionComentarioReaccion_comentarioId_userId_key" ON "social"."PublicacionComentarioReaccion"("comentarioId", "userId");

-- CreateIndex
CREATE INDEX "PublicacionCompartido_publicacionId_idx" ON "social"."PublicacionCompartido"("publicacionId");

-- CreateIndex
CREATE INDEX "PublicacionCompartido_userId_idx" ON "social"."PublicacionCompartido"("userId");

-- CreateIndex
CREATE INDEX "TiendaReaccion_tiendaId_idx" ON "social"."TiendaReaccion"("tiendaId");

-- CreateIndex
CREATE INDEX "TiendaReaccion_userId_idx" ON "social"."TiendaReaccion"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TiendaReaccion_tiendaId_userId_key" ON "social"."TiendaReaccion"("tiendaId", "userId");

-- CreateIndex
CREATE INDEX "TiendaComentario_tiendaId_idx" ON "social"."TiendaComentario"("tiendaId");

-- CreateIndex
CREATE INDEX "TiendaComentario_userId_idx" ON "social"."TiendaComentario"("userId");

-- CreateIndex
CREATE INDEX "TiendaComentario_padreId_idx" ON "social"."TiendaComentario"("padreId");

-- CreateIndex
CREATE INDEX "TiendaComentarioReaccion_comentarioId_idx" ON "social"."TiendaComentarioReaccion"("comentarioId");

-- CreateIndex
CREATE UNIQUE INDEX "TiendaComentarioReaccion_comentarioId_userId_key" ON "social"."TiendaComentarioReaccion"("comentarioId", "userId");

-- CreateIndex
CREATE INDEX "TiendaValoracion_tiendaId_idx" ON "social"."TiendaValoracion"("tiendaId");

-- CreateIndex
CREATE UNIQUE INDEX "TiendaValoracion_tiendaId_userId_key" ON "social"."TiendaValoracion"("tiendaId", "userId");

-- CreateIndex
CREATE INDEX "TiendaPregunta_tiendaId_idx" ON "social"."TiendaPregunta"("tiendaId");

-- CreateIndex
CREATE INDEX "TiendaPregunta_userId_idx" ON "social"."TiendaPregunta"("userId");

-- CreateIndex
CREATE INDEX "TiendaRespuesta_preguntaId_idx" ON "social"."TiendaRespuesta"("preguntaId");

-- CreateIndex
CREATE INDEX "TiendaFavorito_userId_idx" ON "social"."TiendaFavorito"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TiendaFavorito_tiendaId_userId_key" ON "social"."TiendaFavorito"("tiendaId", "userId");

-- CreateIndex
CREATE INDEX "TiendaSeguidor_tiendaId_idx" ON "social"."TiendaSeguidor"("tiendaId");

-- CreateIndex
CREATE INDEX "TiendaSeguidor_userId_idx" ON "social"."TiendaSeguidor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TiendaSeguidor_tiendaId_userId_key" ON "social"."TiendaSeguidor"("tiendaId", "userId");

-- AddForeignKey
ALTER TABLE "autenticacion"."session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "autenticacion"."account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "autenticacion"."invitation" ADD CONSTRAINT "invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "autenticacion"."invitation" ADD CONSTRAINT "invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant"."member" ADD CONSTRAINT "member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant"."member" ADD CONSTRAINT "member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant"."RolPermiso" ADD CONSTRAINT "RolPermiso_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant"."Localizacion" ADD CONSTRAINT "Localizacion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant"."Propietario" ADD CONSTRAINT "Propietario_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant"."Propietario" ADD CONSTRAINT "Propietario_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant"."Imagen" ADD CONSTRAINT "Imagen_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant"."Descripcion" ADD CONSTRAINT "Descripcion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant"."EquipoDeTrabajo" ADD CONSTRAINT "EquipoDeTrabajo_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant"."Tienda" ADD CONSTRAINT "Tienda_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant"."Configuracion" ADD CONSTRAINT "Configuracion_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "tenant"."Tienda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant"."Consultorio" ADD CONSTRAINT "Consultorio_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant"."Restaurante" ADD CONSTRAINT "Restaurante_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compartido"."Notificacion" ADD CONSTRAINT "Notificacion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compartido"."Notificacion" ADD CONSTRAINT "Notificacion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compartido"."Notificacion" ADD CONSTRAINT "Notificacion_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "autenticacion"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compartido"."Mensaje" ADD CONSTRAINT "Mensaje_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compartido"."Mensaje" ADD CONSTRAINT "Mensaje_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "autenticacion"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compartido"."Mensaje" ADD CONSTRAINT "Mensaje_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "autenticacion"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compartido"."Reaccion" ADD CONSTRAINT "Reaccion_mensajeId_fkey" FOREIGN KEY ("mensajeId") REFERENCES "compartido"."Mensaje"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compartido"."Reaccion" ADD CONSTRAINT "Reaccion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compartido"."AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compartido"."ReporteLog" ADD CONSTRAINT "ReporteLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compartido"."ClaCategoria" ADD CONSTRAINT "ClaCategoria_claActividadId_fkey" FOREIGN KEY ("claActividadId") REFERENCES "compartido"."ClaActividadEconomica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compartido"."ClaCategoria" ADD CONSTRAINT "ClaCategoria_padreId_fkey" FOREIGN KEY ("padreId") REFERENCES "compartido"."ClaCategoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compartido"."ClaProducto" ADD CONSTRAINT "ClaProducto_claActividadId_fkey" FOREIGN KEY ("claActividadId") REFERENCES "compartido"."ClaActividadEconomica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compartido"."ClaProducto" ADD CONSTRAINT "ClaProducto_claCategoriaId_fkey" FOREIGN KEY ("claCategoriaId") REFERENCES "compartido"."ClaCategoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compartido"."ClaProducto" ADD CONSTRAINT "ClaProducto_claUnidadId_fkey" FOREIGN KEY ("claUnidadId") REFERENCES "compartido"."ClaUnidadMedida"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo"."ActividadEconomica" ADD CONSTRAINT "ActividadEconomica_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo"."ActividadEconomica" ADD CONSTRAINT "ActividadEconomica_claActividadId_fkey" FOREIGN KEY ("claActividadId") REFERENCES "compartido"."ClaActividadEconomica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo"."UnidadMedida" ADD CONSTRAINT "UnidadMedida_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo"."UnidadMedida" ADD CONSTRAINT "UnidadMedida_claUnidadId_fkey" FOREIGN KEY ("claUnidadId") REFERENCES "compartido"."ClaUnidadMedida"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo"."Categoria" ADD CONSTRAINT "Categoria_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo"."Categoria" ADD CONSTRAINT "Categoria_actividadId_fkey" FOREIGN KEY ("actividadId") REFERENCES "catalogo"."ActividadEconomica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo"."Categoria" ADD CONSTRAINT "Categoria_padreId_fkey" FOREIGN KEY ("padreId") REFERENCES "catalogo"."Categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo"."Categoria" ADD CONSTRAINT "Categoria_claCategoriaId_fkey" FOREIGN KEY ("claCategoriaId") REFERENCES "compartido"."ClaCategoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo"."Producto" ADD CONSTRAINT "Producto_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo"."Producto" ADD CONSTRAINT "Producto_actividadId_fkey" FOREIGN KEY ("actividadId") REFERENCES "catalogo"."ActividadEconomica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo"."Producto" ADD CONSTRAINT "Producto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "catalogo"."Categoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo"."Producto" ADD CONSTRAINT "Producto_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "catalogo"."UnidadMedida"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo"."ProductoPrecioHistorico" ADD CONSTRAINT "ProductoPrecioHistorico_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "catalogo"."Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo"."ProductoImagenes" ADD CONSTRAINT "ProductoImagenes_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "catalogo"."Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo"."ProductoOfertas" ADD CONSTRAINT "ProductoOfertas_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo"."ProductoOfertas" ADD CONSTRAINT "ProductoOfertas_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "catalogo"."Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo"."ProductoOfertas" ADD CONSTRAINT "ProductoOfertas_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "catalogo"."ProductoVariante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo"."ProductoOpciones" ADD CONSTRAINT "ProductoOpciones_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "catalogo"."Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo"."ProductoAtributo" ADD CONSTRAINT "ProductoAtributo_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "catalogo"."Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo"."ProductoAtributoValor" ADD CONSTRAINT "ProductoAtributoValor_atributoId_fkey" FOREIGN KEY ("atributoId") REFERENCES "catalogo"."ProductoAtributo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo"."ProductoVariante" ADD CONSTRAINT "ProductoVariante_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "catalogo"."Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo"."ProductoVarianteAtributo" ADD CONSTRAINT "ProductoVarianteAtributo_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "catalogo"."ProductoVariante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo"."ProductoVarianteAtributo" ADD CONSTRAINT "ProductoVarianteAtributo_atributoValorId_fkey" FOREIGN KEY ("atributoValorId") REFERENCES "catalogo"."ProductoAtributoValor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo"."ProductoPrecioVolumen" ADD CONSTRAINT "ProductoPrecioVolumen_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "catalogo"."Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo"."ProductoPrecioVolumen" ADD CONSTRAINT "ProductoPrecioVolumen_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "catalogo"."ProductoVariante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacen"."MovimientoInventario" ADD CONSTRAINT "MovimientoInventario_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacen"."MovimientoInventario" ADD CONSTRAINT "MovimientoInventario_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "catalogo"."Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacen"."MovimientoInventario" ADD CONSTRAINT "MovimientoInventario_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "catalogo"."ProductoVariante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacen"."AjusteInventario" ADD CONSTRAINT "AjusteInventario_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacen"."AjusteInventario" ADD CONSTRAINT "AjusteInventario_tenantMemberId_fkey" FOREIGN KEY ("tenantMemberId") REFERENCES "tenant"."member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacen"."AjusteDetalle" ADD CONSTRAINT "AjusteDetalle_ajusteId_fkey" FOREIGN KEY ("ajusteId") REFERENCES "almacen"."AjusteInventario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacen"."AjusteDetalle" ADD CONSTRAINT "AjusteDetalle_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "catalogo"."Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacen"."AjusteDetalle" ADD CONSTRAINT "AjusteDetalle_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "catalogo"."ProductoVariante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacen"."RecuentoInventario" ADD CONSTRAINT "RecuentoInventario_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacen"."RecuentoInventario" ADD CONSTRAINT "RecuentoInventario_tenantMemberId_fkey" FOREIGN KEY ("tenantMemberId") REFERENCES "tenant"."member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacen"."RecuentoDetalle" ADD CONSTRAINT "RecuentoDetalle_recuentoId_fkey" FOREIGN KEY ("recuentoId") REFERENCES "almacen"."RecuentoInventario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacen"."RecuentoDetalle" ADD CONSTRAINT "RecuentoDetalle_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "catalogo"."Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacen"."RecuentoDetalle" ADD CONSTRAINT "RecuentoDetalle_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "catalogo"."ProductoVariante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacen"."Insumo" ADD CONSTRAINT "Insumo_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacen"."Insumo" ADD CONSTRAINT "Insumo_unidadMedidaId_fkey" FOREIGN KEY ("unidadMedidaId") REFERENCES "catalogo"."UnidadMedida"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacen"."MovimientoAlmacen" ADD CONSTRAINT "MovimientoAlmacen_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacen"."MovimientoAlmacen" ADD CONSTRAINT "MovimientoAlmacen_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "almacen"."Insumo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacen"."ProductoInsumo" ADD CONSTRAINT "ProductoInsumo_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "catalogo"."Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacen"."ProductoInsumo" ADD CONSTRAINT "ProductoInsumo_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "catalogo"."ProductoVariante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacen"."ProductoInsumo" ADD CONSTRAINT "ProductoInsumo_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "almacen"."Insumo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacen"."IngresoAlmacen" ADD CONSTRAINT "IngresoAlmacen_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacen"."IngresoAlmacen" ADD CONSTRAINT "IngresoAlmacen_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "ventas"."Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacen"."IngresoAlmacen" ADD CONSTRAINT "IngresoAlmacen_tenantMemberId_fkey" FOREIGN KEY ("tenantMemberId") REFERENCES "tenant"."member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacen"."IngresoDetalle" ADD CONSTRAINT "IngresoDetalle_ingresoId_fkey" FOREIGN KEY ("ingresoId") REFERENCES "almacen"."IngresoAlmacen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacen"."IngresoDetalle" ADD CONSTRAINT "IngresoDetalle_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "almacen"."Insumo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacen"."SalidaAlmacen" ADD CONSTRAINT "SalidaAlmacen_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacen"."SalidaAlmacen" ADD CONSTRAINT "SalidaAlmacen_tenantMemberId_fkey" FOREIGN KEY ("tenantMemberId") REFERENCES "tenant"."member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacen"."SalidaDetalle" ADD CONSTRAINT "SalidaDetalle_salidaId_fkey" FOREIGN KEY ("salidaId") REFERENCES "almacen"."SalidaAlmacen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacen"."SalidaDetalle" ADD CONSTRAINT "SalidaDetalle_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "almacen"."Insumo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacen"."RecuentoAlmacen" ADD CONSTRAINT "RecuentoAlmacen_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacen"."RecuentoAlmacen" ADD CONSTRAINT "RecuentoAlmacen_tenantMemberId_fkey" FOREIGN KEY ("tenantMemberId") REFERENCES "tenant"."member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacen"."RecuentoAlmacenDetalle" ADD CONSTRAINT "RecuentoAlmacenDetalle_recuentoId_fkey" FOREIGN KEY ("recuentoId") REFERENCES "almacen"."RecuentoAlmacen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacen"."RecuentoAlmacenDetalle" ADD CONSTRAINT "RecuentoAlmacenDetalle_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "almacen"."Insumo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas"."Cliente" ADD CONSTRAINT "Cliente_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas"."TurnosDeAtencion" ADD CONSTRAINT "TurnosDeAtencion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas"."PuntosDeVenta" ADD CONSTRAINT "PuntosDeVenta_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas"."AperturaCierreDeCaja" ADD CONSTRAINT "AperturaCierreDeCaja_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas"."AperturaCierreDeCaja" ADD CONSTRAINT "AperturaCierreDeCaja_puntoVentaId_fkey" FOREIGN KEY ("puntoVentaId") REFERENCES "ventas"."PuntosDeVenta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas"."AperturaCierreDeCaja" ADD CONSTRAINT "AperturaCierreDeCaja_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "ventas"."TurnosDeAtencion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas"."AperturaCierreDeCaja" ADD CONSTRAINT "AperturaCierreDeCaja_tenantMemberId_fkey" FOREIGN KEY ("tenantMemberId") REFERENCES "tenant"."member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas"."IngresosCaja" ADD CONSTRAINT "IngresosCaja_aperturaCierreCajaId_fkey" FOREIGN KEY ("aperturaCierreCajaId") REFERENCES "ventas"."AperturaCierreDeCaja"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas"."EgresosCaja" ADD CONSTRAINT "EgresosCaja_aperturaCierreCajaId_fkey" FOREIGN KEY ("aperturaCierreCajaId") REFERENCES "ventas"."AperturaCierreDeCaja"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas"."Venta" ADD CONSTRAINT "Venta_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas"."Venta" ADD CONSTRAINT "Venta_puntoVentaId_fkey" FOREIGN KEY ("puntoVentaId") REFERENCES "ventas"."PuntosDeVenta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas"."Venta" ADD CONSTRAINT "Venta_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "ventas"."TurnosDeAtencion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas"."Venta" ADD CONSTRAINT "Venta_tenantMemberId_fkey" FOREIGN KEY ("tenantMemberId") REFERENCES "tenant"."member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas"."Venta" ADD CONSTRAINT "Venta_aperturaCierreCajaId_fkey" FOREIGN KEY ("aperturaCierreCajaId") REFERENCES "ventas"."AperturaCierreDeCaja"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas"."VentaDetalle" ADD CONSTRAINT "VentaDetalle_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"."Venta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas"."VentaDetalle" ADD CONSTRAINT "VentaDetalle_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "catalogo"."Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas"."VentaDetalle" ADD CONSTRAINT "VentaDetalle_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "catalogo"."ProductoVariante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas"."VentaDetalle" ADD CONSTRAINT "VentaDetalle_precioVolumenId_fkey" FOREIGN KEY ("precioVolumenId") REFERENCES "catalogo"."ProductoPrecioVolumen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas"."Proveedor" ADD CONSTRAINT "Proveedor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas"."Compra" ADD CONSTRAINT "Compra_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas"."Compra" ADD CONSTRAINT "Compra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "ventas"."Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas"."Compra" ADD CONSTRAINT "Compra_tenantMemberId_fkey" FOREIGN KEY ("tenantMemberId") REFERENCES "tenant"."member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas"."CompraDetalle" ADD CONSTRAINT "CompraDetalle_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "ventas"."Compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas"."CompraDetalle" ADD CONSTRAINT "CompraDetalle_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "catalogo"."Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas"."CompraDetalle" ADD CONSTRAINT "CompraDetalle_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "catalogo"."ProductoVariante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas"."CompraCostoAdicional" ADD CONSTRAINT "CompraCostoAdicional_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "ventas"."Compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas"."Gastos" ADD CONSTRAINT "Gastos_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas"."Gastos" ADD CONSTRAINT "Gastos_tenantMemberId_fkey" FOREIGN KEY ("tenantMemberId") REFERENCES "tenant"."member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas"."Pedido" ADD CONSTRAINT "Pedido_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas"."Pedido" ADD CONSTRAINT "Pedido_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas"."PedidoDetalle" ADD CONSTRAINT "PedidoDetalle_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "ventas"."Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas"."PedidoDetalle" ADD CONSTRAINT "PedidoDetalle_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "catalogo"."Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas"."PedidoDetalle" ADD CONSTRAINT "PedidoDetalle_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "catalogo"."ProductoVariante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas"."PedidoDetalle" ADD CONSTRAINT "PedidoDetalle_precioVolumenId_fkey" FOREIGN KEY ("precioVolumenId") REFERENCES "catalogo"."ProductoPrecioVolumen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultorio"."Medico" ADD CONSTRAINT "Medico_consultorioId_fkey" FOREIGN KEY ("consultorioId") REFERENCES "tenant"."Consultorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultorio"."Medico" ADD CONSTRAINT "Medico_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "tenant"."member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultorio"."HorarioAtencion" ADD CONSTRAINT "HorarioAtencion_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "consultorio"."Medico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultorio"."Paciente" ADD CONSTRAINT "Paciente_consultorioId_fkey" FOREIGN KEY ("consultorioId") REFERENCES "tenant"."Consultorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultorio"."ServicioMedico" ADD CONSTRAINT "ServicioMedico_consultorioId_fkey" FOREIGN KEY ("consultorioId") REFERENCES "tenant"."Consultorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultorio"."Cita" ADD CONSTRAINT "Cita_consultorioId_fkey" FOREIGN KEY ("consultorioId") REFERENCES "tenant"."Consultorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultorio"."Cita" ADD CONSTRAINT "Cita_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "consultorio"."Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultorio"."Cita" ADD CONSTRAINT "Cita_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "consultorio"."Medico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultorio"."Cita" ADD CONSTRAINT "Cita_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "consultorio"."ServicioMedico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultorio"."RecordatorioCita" ADD CONSTRAINT "RecordatorioCita_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "consultorio"."Cita"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultorio"."HistoriaClinica" ADD CONSTRAINT "HistoriaClinica_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "consultorio"."Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultorio"."HistoriaClinica" ADD CONSTRAINT "HistoriaClinica_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "consultorio"."Medico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultorio"."HistoriaClinica" ADD CONSTRAINT "HistoriaClinica_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "consultorio"."Cita"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultorio"."HcOdontologia" ADD CONSTRAINT "HcOdontologia_historiaId_fkey" FOREIGN KEY ("historiaId") REFERENCES "consultorio"."HistoriaClinica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultorio"."HcPediatria" ADD CONSTRAINT "HcPediatria_historiaId_fkey" FOREIGN KEY ("historiaId") REFERENCES "consultorio"."HistoriaClinica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultorio"."HcGeneral" ADD CONSTRAINT "HcGeneral_historiaId_fkey" FOREIGN KEY ("historiaId") REFERENCES "consultorio"."HistoriaClinica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultorio"."HcPerinatal" ADD CONSTRAINT "HcPerinatal_historiaId_fkey" FOREIGN KEY ("historiaId") REFERENCES "consultorio"."HistoriaClinica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultorio"."HcPerinatalControl" ADD CONSTRAINT "HcPerinatalControl_perinatalId_fkey" FOREIGN KEY ("perinatalId") REFERENCES "consultorio"."HcPerinatal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultorio"."AdjuntoClinico" ADD CONSTRAINT "AdjuntoClinico_historiaId_fkey" FOREIGN KEY ("historiaId") REFERENCES "consultorio"."HistoriaClinica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultorio"."Vacunacion" ADD CONSTRAINT "Vacunacion_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "consultorio"."Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultorio"."AtencionMedica" ADD CONSTRAINT "AtencionMedica_consultorioId_fkey" FOREIGN KEY ("consultorioId") REFERENCES "tenant"."Consultorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultorio"."AtencionMedica" ADD CONSTRAINT "AtencionMedica_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "consultorio"."Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultorio"."AtencionMedica" ADD CONSTRAINT "AtencionMedica_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "consultorio"."Medico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultorio"."AtencionMedica" ADD CONSTRAINT "AtencionMedica_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "consultorio"."Cita"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultorio"."AtencionDetalle" ADD CONSTRAINT "AtencionDetalle_atencionId_fkey" FOREIGN KEY ("atencionId") REFERENCES "consultorio"."AtencionMedica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultorio"."AtencionDetalle" ADD CONSTRAINT "AtencionDetalle_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "consultorio"."ServicioMedico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultorio"."AtencionPago" ADD CONSTRAINT "AtencionPago_atencionId_fkey" FOREIGN KEY ("atencionId") REFERENCES "consultorio"."AtencionMedica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultorio"."RecetaMedica" ADD CONSTRAINT "RecetaMedica_consultorioId_fkey" FOREIGN KEY ("consultorioId") REFERENCES "tenant"."Consultorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultorio"."RecetaMedica" ADD CONSTRAINT "RecetaMedica_atencionId_fkey" FOREIGN KEY ("atencionId") REFERENCES "consultorio"."AtencionMedica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultorio"."RecetaMedica" ADD CONSTRAINT "RecetaMedica_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "consultorio"."Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultorio"."RecetaMedica" ADD CONSTRAINT "RecetaMedica_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "consultorio"."Medico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultorio"."RecetaMedicaDetalle" ADD CONSTRAINT "RecetaMedicaDetalle_recetaId_fkey" FOREIGN KEY ("recetaId") REFERENCES "consultorio"."RecetaMedica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultorio"."RecetaMedicaDetalle" ADD CONSTRAINT "RecetaMedicaDetalle_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "catalogo"."Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurante"."TiempoComida" ADD CONSTRAINT "TiempoComida_restauranteId_fkey" FOREIGN KEY ("restauranteId") REFERENCES "tenant"."Restaurante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurante"."Menu" ADD CONSTRAINT "Menu_restauranteId_fkey" FOREIGN KEY ("restauranteId") REFERENCES "tenant"."Restaurante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurante"."Menu" ADD CONSTRAINT "Menu_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "tenant"."member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurante"."MenuItem" ADD CONSTRAINT "MenuItem_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "restaurante"."Menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurante"."MenuItem" ADD CONSTRAINT "MenuItem_tiempoComidaId_fkey" FOREIGN KEY ("tiempoComidaId") REFERENCES "restaurante"."TiempoComida"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurante"."MenuItem" ADD CONSTRAINT "MenuItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "catalogo"."Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurante"."Reserva" ADD CONSTRAINT "Reserva_restauranteId_fkey" FOREIGN KEY ("restauranteId") REFERENCES "tenant"."Restaurante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurante"."Reserva" ADD CONSTRAINT "Reserva_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "ventas"."Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurante"."Reserva" ADD CONSTRAINT "Reserva_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "restaurante"."Menu"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurante"."Reserva" ADD CONSTRAINT "Reserva_atendidaPorId_fkey" FOREIGN KEY ("atendidaPorId") REFERENCES "tenant"."member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurante"."ReservaDetalle" ADD CONSTRAINT "ReservaDetalle_reservaId_fkey" FOREIGN KEY ("reservaId") REFERENCES "restaurante"."Reserva"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurante"."ReservaDetalle" ADD CONSTRAINT "ReservaDetalle_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "restaurante"."MenuItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurante"."ReservaDetalle" ADD CONSTRAINT "ReservaDetalle_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "catalogo"."Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurante"."PedidoEstadoLog" ADD CONSTRAINT "PedidoEstadoLog_reservaId_fkey" FOREIGN KEY ("reservaId") REFERENCES "restaurante"."Reserva"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurante"."PedidoEstadoLog" ADD CONSTRAINT "PedidoEstadoLog_cambiadoPorId_fkey" FOREIGN KEY ("cambiadoPorId") REFERENCES "tenant"."member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurante"."PublicacionMenuRRSS" ADD CONSTRAINT "PublicacionMenuRRSS_restauranteId_fkey" FOREIGN KEY ("restauranteId") REFERENCES "tenant"."Restaurante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurante"."PublicacionMenuRRSS" ADD CONSTRAINT "PublicacionMenuRRSS_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "restaurante"."Menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurante"."PublicacionMenuRRSS" ADD CONSTRAINT "PublicacionMenuRRSS_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "tenant"."member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."ProductoReaccion" ADD CONSTRAINT "ProductoReaccion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."ProductoReaccion" ADD CONSTRAINT "ProductoReaccion_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "catalogo"."Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."ProductoReaccion" ADD CONSTRAINT "ProductoReaccion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."ProductoComentario" ADD CONSTRAINT "ProductoComentario_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."ProductoComentario" ADD CONSTRAINT "ProductoComentario_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "catalogo"."Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."ProductoComentario" ADD CONSTRAINT "ProductoComentario_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."ProductoComentario" ADD CONSTRAINT "ProductoComentario_padreId_fkey" FOREIGN KEY ("padreId") REFERENCES "social"."ProductoComentario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."ProductoComentarioReaccion" ADD CONSTRAINT "ProductoComentarioReaccion_comentarioId_fkey" FOREIGN KEY ("comentarioId") REFERENCES "social"."ProductoComentario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."ProductoComentarioReaccion" ADD CONSTRAINT "ProductoComentarioReaccion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."ProductoValoracion" ADD CONSTRAINT "ProductoValoracion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."ProductoValoracion" ADD CONSTRAINT "ProductoValoracion_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "catalogo"."Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."ProductoValoracion" ADD CONSTRAINT "ProductoValoracion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."ProductoPregunta" ADD CONSTRAINT "ProductoPregunta_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."ProductoPregunta" ADD CONSTRAINT "ProductoPregunta_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "catalogo"."Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."ProductoPregunta" ADD CONSTRAINT "ProductoPregunta_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."ProductoRespuesta" ADD CONSTRAINT "ProductoRespuesta_preguntaId_fkey" FOREIGN KEY ("preguntaId") REFERENCES "social"."ProductoPregunta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."ProductoRespuesta" ADD CONSTRAINT "ProductoRespuesta_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."ProductoFavorito" ADD CONSTRAINT "ProductoFavorito_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."ProductoFavorito" ADD CONSTRAINT "ProductoFavorito_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "catalogo"."Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."ProductoFavorito" ADD CONSTRAINT "ProductoFavorito_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."Publicacion" ADD CONSTRAINT "Publicacion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."Publicacion" ADD CONSTRAINT "Publicacion_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."PublicacionMedia" ADD CONSTRAINT "PublicacionMedia_publicacionId_fkey" FOREIGN KEY ("publicacionId") REFERENCES "social"."Publicacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."PublicacionReaccion" ADD CONSTRAINT "PublicacionReaccion_publicacionId_fkey" FOREIGN KEY ("publicacionId") REFERENCES "social"."Publicacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."PublicacionReaccion" ADD CONSTRAINT "PublicacionReaccion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."PublicacionComentario" ADD CONSTRAINT "PublicacionComentario_publicacionId_fkey" FOREIGN KEY ("publicacionId") REFERENCES "social"."Publicacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."PublicacionComentario" ADD CONSTRAINT "PublicacionComentario_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."PublicacionComentario" ADD CONSTRAINT "PublicacionComentario_padreId_fkey" FOREIGN KEY ("padreId") REFERENCES "social"."PublicacionComentario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."PublicacionComentarioReaccion" ADD CONSTRAINT "PublicacionComentarioReaccion_comentarioId_fkey" FOREIGN KEY ("comentarioId") REFERENCES "social"."PublicacionComentario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."PublicacionComentarioReaccion" ADD CONSTRAINT "PublicacionComentarioReaccion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."PublicacionCompartido" ADD CONSTRAINT "PublicacionCompartido_publicacionId_fkey" FOREIGN KEY ("publicacionId") REFERENCES "social"."Publicacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."PublicacionCompartido" ADD CONSTRAINT "PublicacionCompartido_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."TiendaReaccion" ADD CONSTRAINT "TiendaReaccion_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "tenant"."Tienda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."TiendaReaccion" ADD CONSTRAINT "TiendaReaccion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."TiendaComentario" ADD CONSTRAINT "TiendaComentario_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "tenant"."Tienda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."TiendaComentario" ADD CONSTRAINT "TiendaComentario_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."TiendaComentario" ADD CONSTRAINT "TiendaComentario_padreId_fkey" FOREIGN KEY ("padreId") REFERENCES "social"."TiendaComentario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."TiendaComentarioReaccion" ADD CONSTRAINT "TiendaComentarioReaccion_comentarioId_fkey" FOREIGN KEY ("comentarioId") REFERENCES "social"."TiendaComentario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."TiendaComentarioReaccion" ADD CONSTRAINT "TiendaComentarioReaccion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."TiendaValoracion" ADD CONSTRAINT "TiendaValoracion_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "tenant"."Tienda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."TiendaValoracion" ADD CONSTRAINT "TiendaValoracion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."TiendaPregunta" ADD CONSTRAINT "TiendaPregunta_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "tenant"."Tienda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."TiendaPregunta" ADD CONSTRAINT "TiendaPregunta_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."TiendaRespuesta" ADD CONSTRAINT "TiendaRespuesta_preguntaId_fkey" FOREIGN KEY ("preguntaId") REFERENCES "social"."TiendaPregunta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."TiendaRespuesta" ADD CONSTRAINT "TiendaRespuesta_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."TiendaFavorito" ADD CONSTRAINT "TiendaFavorito_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "tenant"."Tienda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."TiendaFavorito" ADD CONSTRAINT "TiendaFavorito_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."TiendaSeguidor" ADD CONSTRAINT "TiendaSeguidor_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "tenant"."Tienda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social"."TiendaSeguidor" ADD CONSTRAINT "TiendaSeguidor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "autenticacion"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
