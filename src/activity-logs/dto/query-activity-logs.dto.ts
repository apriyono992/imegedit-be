import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryActivityLogsDto extends PaginationQueryDto {
  /** Filter by tool name. */
  @IsOptional()
  @IsString()
  toolName?: string;

  /** Filter by user id (admin "all" endpoint only; ignored for own logs). */
  @IsOptional()
  @IsUUID()
  userId?: string;
}
