import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { StockModule } from './stock/stock.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { DistributorsModule } from './distributors/distributors.module';
import { OrdersModule } from './orders/orders.module';
import { AttendanceModule } from './attendance/attendance.module';
import { VisitsModule } from './visits/visits.module';
import { GpsModule } from './gps/gps.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { DuesModule } from './dues/dues.module';
import { AuditModule } from './audit/audit.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    EventEmitterModule.forRoot({ wildcard: false }),
    PrismaModule,
    RedisModule,
    HealthModule,
    AuthModule,
    StockModule,
    WarehousesModule,
    UsersModule,
    ProductsModule,
    DistributorsModule,
    OrdersModule,
    AttendanceModule,
    VisitsModule,
    GpsModule,
    NotificationsModule,
    ReportsModule,
    DuesModule,
    AuditModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
