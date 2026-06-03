import { Controller, Post, Get, Body, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/scope.helper';

@ApiTags('attendance')
@ApiBearerAuth()
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('checkin')
  @Roles('rep')
  @HttpCode(HttpStatus.CREATED)
  checkin(
    @CurrentUser() user: AuthUser,
    @Body() dto: { lat: number; lng: number },
  ) {
    return this.attendanceService.checkin(user, dto);
  }

  @Post('checkout')
  @Roles('rep')
  checkout(@CurrentUser() user: AuthUser) {
    return this.attendanceService.checkout(user);
  }

  @Get()
  findAll(
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
    return this.attendanceService.findAll(user, query);
  }
}
