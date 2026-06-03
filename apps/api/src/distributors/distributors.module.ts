import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { DistributorsService } from './distributors.service';
import { DistributorsController } from './distributors.controller';

@Module({
  imports: [MulterModule.register({})],
  controllers: [DistributorsController],
  providers: [DistributorsService],
  exports: [DistributorsService],
})
export class DistributorsModule {}
