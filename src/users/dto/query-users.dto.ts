import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryUsersDto extends PaginationQueryDto {
  /** Filter by role id. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  roleId?: number;

  /** Filter by active status (?active=true | false). */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  active?: boolean;
}
