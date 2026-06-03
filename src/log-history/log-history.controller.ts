import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { LogHistoryService } from './log-history.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('log-history')
export class LogHistoryController {
  constructor(private readonly logHistoryService: LogHistoryService) {}

  @Get()
  findAll() {
    return this.logHistoryService.findAll();
  }
}
