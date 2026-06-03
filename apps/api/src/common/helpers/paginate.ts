export interface PaginateOptions {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export async function paginate<T>(
  model: { findMany: (args: unknown) => Promise<T[]>; count: (args: unknown) => Promise<number> },
  args: Record<string, unknown>,
  opts: PaginateOptions = {},
): Promise<PaginatedResult<T>> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  const [data, total] = await Promise.all([
    model.findMany({ ...args, skip, take: pageSize }),
    model.count({ where: (args as { where?: unknown }).where }),
  ]);

  return {
    data,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}
