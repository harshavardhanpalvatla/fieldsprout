import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { GpsService } from './gps.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/scope.helper';

@ApiTags('gps')
@ApiBearerAuth()
@Controller('gps')
export class GpsController {
  constructor(private readonly gpsService: GpsService) {}

  @Post('batch')
  @Roles('rep')
  batchInsert(
    @CurrentUser() user: AuthUser,
    @Body()
    dto: {
      attendanceId: string;
      points: { lat: number; lng: number; capturedAt: string }[];
    },
  ) {
    return this.gpsService.batchInsert(user, dto);
  }

  @Get('live')
  @Roles('admin')
  getLive() {
    return this.gpsService.getLive();
  }

  @Get('history/:repId')
  @Roles('admin')
  getHistory(
    @Param('repId') repId: string,
    @Query('date') date: string,
  ) {
    return this.gpsService.getHistory(repId, date);
  }

  @Get('compliance')
  @Roles('admin')
  getCompliance(@Query() query: { repId: string; date: string }) {
    return this.gpsService.getCompliance(query);
  }
}
