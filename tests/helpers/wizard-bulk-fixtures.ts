/**
 * Fixtures compartidas para los tests de integración de los endpoints BULK del wizard
 * (specs/018-estandarizar-bulk-wizard). Crea el árbol mínimo de datos reales necesario
 * para ejercer altaMasiva/sincronizarSeleccion de Producto y las relaciones "en uso"
 * (VentaDetalle, Cita, Compra, Venta) que activan la protección de datos dependientes.
 *
 * Requiere DATABASE_URL — los tests que la usan deben hacer describe.skipIf(!hasDb).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any

export interface WizardBulkFixtures {
  run: string
  tenantId: string
  userId: string
  tenantMemberId: string
  puntoVentaId: string
  turnoId: string
  aperturaCierreCajaId: string
  claActividadId: string
  actividadId: string
  categoriaId: string
  unidadId: string
  consultorioId: string
  medicoId: string
}

export async function crearFixturesCompartidas(db: AnyDb, run: string): Promise<WizardBulkFixtures> {
  const tenantId = `t-${run}`
  const userId = `u-${run}`

  await db.tenant.create({
    data: {
      id: tenantId,
      name: `Tenant ${run}`,
      slug: `tenant-${run}`,
      nombreLargo: `Tenant Largo ${run}`,
      descripcion: "Tenant de prueba — wizard-bulk integration tests",
      esTienda: true,
      esConsultorio: true,
      esRestaurante: true,
    },
  })

  await db.user.create({
    data: {
      id: userId,
      name: `Usuario ${run}`,
      email: `wizard-bulk-${run}@example.test`,
      userName: `wizard-bulk-${run}`,
    },
  })

  const tenantMember = await db.tenantMember.create({
    data: { organizationId: tenantId, userId, role: "PROPIETARIO" },
  })

  const puntoVenta = await db.puntosDeVenta.create({
    data: { tenantId, nombre: `PDV ${run}`, createdById: userId },
  })

  const turno = await db.turnosDeAtencion.create({
    data: { tenantId, turno: `Turno ${run}`, claTurnoId: null, createdById: userId },
  })

  const apertura = await db.aperturaCierreDeCaja.create({
    data: {
      tenantId,
      puntoVentaId: puntoVenta.id,
      turnoId: turno.id,
      tenantMemberId: tenantMember.id,
      fecha: new Date(),
    },
  })

  const claActividad = await db.claActividadEconomica.create({
    data: { codigo: `CLA-ACT-${run}`, nombre: `Actividad ${run}` },
  })

  const actividad = await db.actividadEconomica.create({
    data: { tenantId, claActividadId: claActividad.id, createdById: userId },
  })

  const categoria = await db.categoria.create({
    data: { tenantId, actividadId: actividad.id, nombre: `Categoria ${run}`, createdById: userId },
  })

  const unidad = await db.unidadMedida.create({
    data: { tenantId, unidad: `Unidad ${run}`, sigla: `U${run.slice(-4)}`, descripcion: `Unidad ${run}`, createdById: userId },
  })

  const consultorio = await db.consultorio.create({
    data: { tenantId },
  })

  const medico = await db.medico.create({
    data: { consultorioId: consultorio.id, memberId: tenantMember.id, especialidad: "MEDICINA_GENERAL", createdById: userId },
  })

  return {
    run,
    tenantId,
    userId,
    tenantMemberId: tenantMember.id,
    puntoVentaId: puntoVenta.id,
    turnoId: turno.id,
    aperturaCierreCajaId: apertura.id,
    claActividadId: claActividad.id,
    actividadId: actividad.id,
    categoriaId: categoria.id,
    unidadId: unidad.id,
    consultorioId: consultorio.id,
    medicoId: medico.id,
  }
}

/** Crea un producto directamente (sin pasar por altaMasiva) y su ClaProducto correspondiente,
 * para poder ejercer sincronizarSeleccion contra un producto "ya seleccionado". */
export async function crearProductoConClasificador(
  db: AnyDb,
  fx: WizardBulkFixtures,
  codigo: string,
  nombre: string,
): Promise<{ productoId: string; claProductoId: string }> {
  const claCategoria = await db.claCategoria.create({
    data: { claActividadId: fx.claActividadId, nombre: `${nombre}-cat` },
  })
  const claUnidad = await db.claUnidadMedida.create({
    data: { unidad: `${nombre}-unidad`, sigla: `${codigo}`.slice(0, 10) },
  })
  const claProducto = await db.claProducto.create({
    data: {
      claActividadId: fx.claActividadId,
      claCategoriaId: claCategoria.id,
      claUnidadId: claUnidad.id,
      codigo,
      nombre,
      precio: 10,
    },
  })
  const producto = await db.producto.create({
    data: {
      tenantId: fx.tenantId,
      actividadId: fx.actividadId,
      categoriaId: fx.categoriaId,
      unidadId: fx.unidadId,
      codigo,
      nombre,
      tipoDescuento: "SIN_DESCUENTO",
      createdById: fx.userId,
    },
  })
  return { productoId: producto.id, claProductoId: claProducto.id }
}

/** Crea una Venta real con un VentaDetalle apuntando al producto dado — usada para
 * probar la protección de datos dependientes (Producto, ActividadEconomica, TurnosDeAtencion). */
export async function crearVentaConDetalle(db: AnyDb, fx: WizardBulkFixtures, productoId: string): Promise<void> {
  const venta = await db.venta.create({
    data: {
      tenantId: fx.tenantId,
      puntoVentaId: fx.puntoVentaId,
      turnoId: fx.turnoId,
      tenantMemberId: fx.tenantMemberId,
      aperturaCierreCajaId: fx.aperturaCierreCajaId,
      createdById: fx.userId,
    },
  })
  await db.ventaDetalle.create({
    data: { ventaId: venta.id, productoId, cantidad: 1, precio: 10, total: 10 },
  })
}

/** Borra todo lo creado por crearFixturesCompartidas + los productos/ventas asociados a este `run`. */
export async function limpiarFixturesCompartidas(db: AnyDb, run: string): Promise<void> {
  const tenantId = `t-${run}`
  try {
    await db.ventaDetalle.deleteMany({ where: { venta: { tenantId } } })
    await db.venta.deleteMany({ where: { tenantId } })
    await db.aperturaCierreDeCaja.deleteMany({ where: { tenantId } })
    await db.compraDetalle.deleteMany({ where: { compra: { tenantId } } })
    await db.compra.deleteMany({ where: { tenantId } })
    await db.cita.deleteMany({ where: { consultorio: { tenantId } } })
    await db.medico.deleteMany({ where: { consultorio: { tenantId } } })
    await db.servicioMedico.deleteMany({ where: { consultorio: { tenantId } } })
    await db.consultorio.deleteMany({ where: { tenantId } })
    await db.proveedor.deleteMany({ where: { tenantId } })
    await db.turnosDeAtencion.deleteMany({ where: { tenantId } })
    await db.puntosDeVenta.deleteMany({ where: { tenantId } })
    await db.producto.deleteMany({ where: { tenantId } })
    await db.categoria.deleteMany({ where: { tenantId } })
    await db.unidadMedida.deleteMany({ where: { tenantId } })
    await db.actividadEconomica.deleteMany({ where: { tenantId } })
    await db.claProducto.deleteMany({ where: { claActividadEconomica: { codigo: `CLA-ACT-${run}` } } })
    await db.claCategoria.deleteMany({ where: { claActividadEconomica: { codigo: `CLA-ACT-${run}` } } })
    await db.claUnidadMedida.deleteMany({ where: { unidad: { contains: run } } })
    await db.claActividadEconomica.deleteMany({ where: { codigo: `CLA-ACT-${run}` } })
    await db.tenantMember.deleteMany({ where: { organizationId: tenantId } })
    await db.tenant.deleteMany({ where: { id: tenantId } })
    await db.user.deleteMany({ where: { id: `u-${run}` } })
  } catch {
    // best-effort cleanup — no debe hacer fallar el test si algo ya se eliminó en cascada
  }
}
