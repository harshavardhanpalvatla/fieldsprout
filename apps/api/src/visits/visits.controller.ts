import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { VisitsService } from './visits.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/scope.helper';

@ApiTags('visits')
@ApiBearerAuth()
@Controller('visits')
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Post('checkin')
  @Roles('rep')
  @HttpCode(HttpStatus.CREATED)
  checkin(
    @CurrentUser() user: AuthUser,
    @Body()
    dto: {
      distributorId: string;
      lat: number;
      lng: number;
      attendanceId: string;
      photoUrl?: string;
    },
  ) {
    return this.visitsService.checkin(user, dto);
  }

  @Post(':id/checkout')
  @Roles('rep')
  checkout(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.visitsService.checkout(user, id);
  }

  @Get()
  findAll(
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
    return this.visitsService.findAll(user, query);
  }
}
