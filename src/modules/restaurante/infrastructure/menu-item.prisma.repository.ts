import { prismaBase } from "../../../core/prisma-scoped.js"
import type { IMenuItemRepository, MenuItemCreateData, MenuItemUpdateData } from "../domain/ports/IMenuItemRepository.js"
import { MenuItemEntity, type MenuItemRaw } from "../domain/menu-item.entity.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prismaBase as any

const ESTADOS_RESERVA_ACTIVA = ["RESERVADA", "CONFIRMADA", "EN_PREPARACION", "LISTA", "ENTREGADA"]

export class MenuItemPrismaRepository implements IMenuItemRepository {
  async findAllByMenu(menuId: string): Promise<MenuItemEntity[]> {
    const rows = await db.menuItem.findMany({
      where: { menuId },
      orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
    })
    return rows.map((r: MenuItemRaw) => MenuItemEntity.fromPrisma(r))
  }

  async findById(id: string): Promise<MenuItemEntity | null> {
    const row = await db.menuItem.findUnique({ where: { id } })
    return row ? MenuItemEntity.fromPrisma(row) : null
  }

  async findByProductoEnMenu(
    menuId: string,
    tiempoComidaId: string,
    productoId: string,
  ): Promise<MenuItemEntity | null> {
    const row = await db.menuItem.findUnique({
      where: { menuId_tiempoComidaId_productoId: { menuId, tiempoComidaId, productoId } },
    })
    return row ? MenuItemEntity.fromPrisma(row) : null
  }

  async create(data: MenuItemCreateData): Promise<MenuItemEntity> {
    // Fetch product snapshot from catalogo schema
    const producto = await db.producto.findUnique({
      where: { id: data.productoId },
      select: { nombre: true, descripcion: true, imagenUrl: true },
    })

    const row = await db.menuItem.create({
      data: {
        menuId: data.menuId,
        tiempoComidaId: data.tiempoComidaId,
        productoId: data.productoId,
        nombreSnapshot: producto?.nombre ?? data.productoId,
        descripcionSnapshot: producto?.descripcion ?? null,
        imagenSnapshot: producto?.imagenUrl ?? null,
        precio: data.precio,
        esEspecial: data.esEspecial ?? false,
        destacado: data.destacado ?? false,
        disponible: data.disponible ?? true,
        orden: data.orden ?? 0,
        notaMenu: data.notaMenu ?? null,
        estado: "ACTIVO",
      },
    })
    return MenuItemEntity.fromPrisma(row)
  }

  async update(id: string, data: MenuItemUpdateData): Promise<MenuItemEntity> {
    const row = await db.menuItem.update({
      where: { id },
      data: {
        ...(data.precio !== undefined && { precio: data.precio }),
        ...(data.esEspecial !== undefined && { esEspecial: data.esEspecial }),
        ...(data.destacado !== undefined && { destacado: data.destacado }),
        ...(data.disponible !== undefined && { disponible: data.disponible }),
        ...(data.orden !== undefined && { orden: data.orden }),
        ...(data.notaMenu !== undefined && { notaMenu: data.notaMenu }),
      },
    })
    return MenuItemEntity.fromPrisma(row)
  }

  async delete(id: string): Promise<void> {
    await db.menuItem.delete({ where: { id } })
  }

  async countReservasActivas(menuItemId: string): Promise<number> {
    return db.reservaDetalle.count({
      where: {
        menuItemId,
        reserva: { estado: { in: ESTADOS_RESERVA_ACTIVA } },
      },
    })
  }
}
