import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { QueryLogHistoryDto } from './dto/query-log-history.dto';
import { LogHistoryService } from './log-history.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('log-history')
export class LogHistoryController {
  constructor(private readonly logHistoryService: LogHistoryService) {}

  @Get()
  findAll(@Query() query: QueryLogHistoryDto) {
    return this.logHistoryService.findAll(query);
  }
}
