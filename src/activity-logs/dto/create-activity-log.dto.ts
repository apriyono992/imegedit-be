import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateActivityLogDto {
  @IsString()
  toolName: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
