import {
  Body,
  Controller,
  Get,
  Ip,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User } from '../users/user.entity';
import { ActivityLogsService } from './activity-logs.service';
import { CreateActivityLogDto } from './dto/create-activity-log.dto';
import { QueryActivityLogsDto } from './dto/query-activity-logs.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('activity-logs')
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @Post()
  create(
    @CurrentUser() user: User,
    @Body() dto: CreateActivityLogDto,
    @Ip() ip: string,
  ) {
    return this.activityLogsService.create({
      userId: user.id,
      toolName: dto.toolName,
      metadata: dto.metadata,
      ipAddress: ip,
    });
  }

  @Get()
  findMine(
    @CurrentUser() user: User,
    @Query() query: QueryActivityLogsDto,
  ) {
    return this.activityLogsService.findByUser(user.id, query);
  }

  @Roles('admin')
  @Get('all')
  findAll(@Query() query: QueryActivityLogsDto) {
    return this.activityLogsService.findAll(query);
  }
}
