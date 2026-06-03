import { Module } from '@nestjs/common';
import { DuesService } from './dues.service';
import { DuesController } from './dues.controller';
import { TALLY_PROVIDER } from './tally.provider';
import { FakeTallyProvider } from './tally.provider';

@Module({
  controllers: [DuesController],
  providers: [
    DuesService,
    {
      provide: TALLY_PROVIDER,
      useClass: FakeTallyProvider,
    },
  ],
  exports: [DuesService],
})
export class DuesModule {}
