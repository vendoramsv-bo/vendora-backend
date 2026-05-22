import { z } from "zod"

// ─── Schema Factory ───────────────────────────────────────────────────────────

export function makeQueryParamsSchema<T extends string>(allowedOrderByFields: T[]) {
  return z.object({
    take: z.coerce.number().int().min(1).max(100).default(20),
    skip: z.coerce.number().int().min(0).default(0),
    orderBy: z.enum(allowedOrderByFields as [T, ...T[]]).optional(),
    order: z.enum(["asc", "desc"]).default("desc"),
    search: z.string().optional(),
    filterField: z.string().optional(),
    filterOp: z.enum(["equals", "contains", "startsWith", "endsWith", "gt", "gte", "lt", "lte"]).optional(),
    filterValue: z.string().optional(),
  })
}

export type QueryParams = ReturnType<typeof makeQueryParamsSchema<string>>["_output"]

// ─── Prisma Converter ─────────────────────────────────────────────────────────

export function toPrismaArgs(params: QueryParams, searchFields?: string[]) {
  const { take, skip, orderBy, order, search, filterField, filterOp, filterValue } = params

  const where: Record<string, unknown> = {}

  if (search && searchFields && searchFields.length > 0) {
    where["OR"] = searchFields.map((field) => ({
      [field]: { contains: search, mode: "insensitive" },
    }))
  }

  if (filterField && filterOp && filterValue !== undefined) {
    if (filterOp === "contains") {
      where[filterField] = { contains: filterValue, mode: "insensitive" }
    } else if (filterOp === "startsWith") {
      where[filterField] = { startsWith: filterValue, mode: "insensitive" }
    } else if (filterOp === "endsWith") {
      where[filterField] = { endsWith: filterValue, mode: "insensitive" }
    } else {
      where[filterField] = { [filterOp]: filterValue }
    }
  }

  return {
    take,
    skip,
    orderBy: orderBy ? { [orderBy]: order } : { createdAt: order },
    where,
  }
}

// ─── Pagination Helper ────────────────────────────────────────────────────────

export function paginate<T>(data: T[], total: number, params: QueryParams) {
  const { take, skip } = params
  return {
    data,
    meta: {
      take,
      skip,
      total,
      hasMore: skip + data.length < total,
      nextCursor: skip + data.length < total ? skip + take : null,
    },
  }
}
