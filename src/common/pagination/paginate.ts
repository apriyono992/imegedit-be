import { Brackets, ObjectLiteral, SelectQueryBuilder } from 'typeorm';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginateConfig {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
  /**
   * Columns searched by the free-text `search` term, as `alias.property`
   * paths (TypeORM rewrites them to real column names).
   */
  searchableColumns?: string[];
  /** Whitelist mapping public sort keys -> `alias.property` paths. */
  sortableColumns: Record<string, string>;
  /** Default sort key (must be a key of `sortableColumns`). */
  defaultSortBy: string;
  defaultSortOrder?: 'ASC' | 'DESC';
}

/**
 * Apply search, sorting, and pagination to a TypeORM query builder, returning
 * the page of rows plus pagination metadata. Filters specific to an endpoint
 * should already be applied to `qb` (e.g. via `andWhere`) before calling this.
 */
export async function paginate<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  config: PaginateConfig,
): Promise<PaginatedResult<T>> {
  const page = config.page && config.page > 0 ? config.page : 1;
  const limit = config.limit && config.limit > 0 ? config.limit : 20;

  // Free-text search: OR ILIKE across the searchable columns.
  if (config.search && config.searchableColumns?.length) {
    const term = `%${config.search}%`;
    qb.andWhere(
      new Brackets((w) => {
        for (const column of config.searchableColumns!) {
          w.orWhere(`CAST(${column} AS TEXT) ILIKE :search`, { search: term });
        }
      }),
    );
  }

  // Sort: fall back to the default when the requested key is not whitelisted.
  const sortKey =
    config.sortBy && config.sortableColumns[config.sortBy]
      ? config.sortBy
      : config.defaultSortBy;
  const sortColumn = config.sortableColumns[sortKey];
  const sortOrder =
    (config.sortOrder ?? config.defaultSortOrder ?? 'DESC').toUpperCase() ===
    'ASC'
      ? 'ASC'
      : 'DESC';
  qb.orderBy(sortColumn, sortOrder);

  qb.skip((page - 1) * limit).take(limit);

  const [data, total] = await qb.getManyAndCount();
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}
