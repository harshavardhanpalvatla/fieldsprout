import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StockService, StockQueryDto, StockHistoryQueryDto, RestockDto, AdjustDto } from './stock.service';
import { AuthUser } from '../auth/scope.helper';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('stock')
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get('available')
  @Roles('rep')
  getAvailableStock(@CurrentUser() user: AuthUser) {
    return this.stockService.getAvailableStock(user);
  }

  @Get('history')
  @Roles('admin', 'warehouse_mgr')
  getHistory(@CurrentUser() user: AuthUser, @Query() query: StockHistoryQueryDto) {
    return this.stockService.getHistory(user, query);
  }

  @Get('low-alerts')
  @Roles('admin')
  getLowAlerts() {
    return this.stockService.getLowAlerts();
  }

  @Get()
  @Roles('admin', 'warehouse_mgr')
  getStock(@CurrentUser() user: AuthUser, @Query() query: StockQueryDto) {
    return this.stockService.getStock(user, query);
  }

  @Post('restock')
  @Roles('warehouse_mgr')
  restock(@CurrentUser() user: AuthUser, @Body() dto: RestockDto) {
    return this.stockService.restock(user, dto);
  }

  @Post('adjust')
  @Roles('warehouse_mgr')
  adjust(@CurrentUser() user: AuthUser, @Body() dto: AdjustDto) {
    return this.stockService.adjust(user, dto);
  }
}
