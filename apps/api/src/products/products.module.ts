import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { ProductsController, VariantsController } from './products.controller';

@Module({
  imports: [MulterModule.register({})],
  controllers: [ProductsController, VariantsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
