import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthUser } from '../auth/scope.helper';
import { createOrderSchema } from '@fieldsprout/validation';
import { z } from 'zod';

type CreateOrderDto = z.infer<typeof createOrderSchema>;

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles('rep')
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createOrderSchema)) dto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(user, dto);
  }

  @Patch(':id')
  @Roles('rep')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: { items: { variantId: string; quantity: number }[] },
  ) {
    return this.ordersService.updateOrder(user, id, dto);
  }

  @Post(':id/submit')
  @Roles('rep')
  submit(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ordersService.submitOrder(user, id);
  }

  @Post(':id/approve')
  @Roles('warehouse_mgr')
  approve(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ordersService.approveOrder(user, id);
  }

  @Post(':id/reject')
  @Roles('warehouse_mgr')
  reject(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.ordersService.rejectOrder(user, id, body.reason);
  }

  @Post(':id/dispatch')
  @Roles('warehouse_mgr')
  dispatch(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ordersService.dispatchOrder(user, id);
  }

  @Post(':id/deliver')
  @Roles('rep')
  deliver(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ordersService.deliverOrder(user, id);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ordersService.cancelOrder(user, id);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query()
    query: {
      status?: string;
      distributorId?: string;
      from?: string;
      to?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    return this.ordersService.findAll(user, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ordersService.findOne(user, id);
  }
}
