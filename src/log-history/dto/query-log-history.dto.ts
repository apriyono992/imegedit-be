import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryLogHistoryDto extends PaginationQueryDto {
  /** Filter by HTTP method (GET, POST, ...). */
  @IsOptional()
  @IsString()
  method?: string;

  /** Filter by HTTP status code. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  statusCode?: number;

  /** Filter by user id. */
  @IsOptional()
  @IsUUID()
  userId?: string;
}
