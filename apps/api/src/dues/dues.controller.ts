import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DuesService } from './dues.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/scope.helper';

@ApiTags('dues')
@ApiBearerAuth()
@Controller('dues')
export class DuesController {
  constructor(private readonly duesService: DuesService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query()
    query: {
      distributorId?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    return this.duesService.findAll(user, query);
  }

  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthUser,
    @Body()
    dto: {
      distributorId: string;
      invoiceRef?: string;
      amount: number;
      dueDate?: string;
    },
  ) {
    return this.duesService.create(user, dto);
  }

  @Patch(':id')
  @Roles('admin')
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body()
    dto: {
      amount?: number;
      invoiceRef?: string;
      dueDate?: string;
    },
  ) {
    return this.duesService.update(id, user, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.duesService.remove(id, user);
  }

  @Post('sync-tally')
  @Roles('admin')
  syncTally() {
    return this.duesService.syncTally();
  }
}
