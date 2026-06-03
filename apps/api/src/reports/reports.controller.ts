import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/scope.helper';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('attendance')
  attendanceReport(
    @CurrentUser() user: AuthUser,
    @Query()
    query: {
      repId?: string;
      from?: string;
      to?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    return this.reportsService.attendanceReport(user, query);
  }

  @Get('visits')
  visitsReport(
    @CurrentUser() user: AuthUser,
    @Query()
    query: {
      repId?: string;
      distributorId?: string;
      date?: string;
      geoVerified?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    return this.reportsService.visitsReport(user, query);
  }

  @Get('compliance')
  complianceReport(
    @CurrentUser() user: AuthUser,
    @Query() query: { repId: string; date: string },
  ) {
    return this.reportsService.complianceReport(user, query);
  }

  @Get('orders')
  ordersReport(
    @CurrentUser() user: AuthUser,
    @Query()
    query: {
      repId?: string;
      distributorId?: string;
      status?: string;
      from?: string;
      to?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    return this.reportsService.ordersReport(user, query);
  }

  @Get('stock')
  stockReport(
    @CurrentUser() user: AuthUser,
    @Query()
    query: {
      warehouseId?: string;
      lowOnly?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    return this.reportsService.stockReport(user, query);
  }

  @Get('daily-summary')
  dailySummary(
    @CurrentUser() user: AuthUser,
    @Query() query: { date: string },
  ) {
    return this.reportsService.dailySummary(user, query);
  }
}
