import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Base query DTO for list endpoints: pagination, sorting, and free-text search.
 * Module-specific query DTOs extend this and add their own filter fields.
 *
 * NOTE: the global ValidationPipe runs with `forbidNonWhitelisted: true`, so any
 * query param must be declared on a DTO or the request is rejected.
 */
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  /** Field to sort by. Validated against a per-endpoint whitelist in the service. */
  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC', 'asc', 'desc'])
  sortOrder?: string;

  /** Free-text search applied across the endpoint's searchable columns. */
  @IsOptional()
  @IsString()
  search?: string;
}
