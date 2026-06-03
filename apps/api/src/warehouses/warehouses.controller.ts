import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WarehousesService, CreateWarehouseDto, UpdateWarehouseDto } from './warehouses.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/scope.helper';

@ApiTags('warehouses')
@ApiBearerAuth()
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Post()
  @Roles('admin')
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateWarehouseDto,
  ) {
    return this.warehousesService.create(user.sub, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.warehousesService.findAll(user, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.warehousesService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: UpdateWarehouseDto) {
    return this.warehousesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.warehousesService.softDelete(id);
  }

  @Post(':id/managers')
  @Roles('admin')
  addManager(
    @Param('id') warehouseId: string,
    @Body('userId') userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.warehousesService.addManager(warehouseId, userId, user.sub);
  }

  @Delete(':id/managers/:userId')
  @Roles('admin')
  removeManager(
    @Param('id') warehouseId: string,
    @Param('userId') userId: string,
  ) {
    return this.warehousesService.removeManager(warehouseId, userId);
  }
}
