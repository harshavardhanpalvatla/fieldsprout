import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsWorker } from './notifications.worker';
import { NotificationsListener } from './notifications.listener';
import { PUSH_PROVIDER, WHATSAPP_PROVIDER, SMS_PROVIDER } from './providers/interfaces';
import { FakePushProvider } from './providers/fake-push.provider';
import { FakeWhatsappProvider } from './providers/fake-whatsapp.provider';
import { FakeSmsProvider } from './providers/fake-sms.provider';
import { FcmProvider } from './providers/fcm.provider';
import { GupshupProvider } from './providers/gupshup.provider';
import { Msg91Provider } from './providers/msg91.provider';

const isProduction = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6380),
          url: config.get<string>('REDIS_URL'),
        },
      }),
    }),
    BullModule.registerQueue({ name: 'notifications' }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsWorker,
    NotificationsListener,
    {
      provide: PUSH_PROVIDER,
      useClass: isProduction ? FcmProvider : FakePushProvider,
    },
    {
      provide: WHATSAPP_PROVIDER,
      useClass: isProduction ? GupshupProvider : FakeWhatsappProvider,
    },
    {
      provide: SMS_PROVIDER,
      useClass: isProduction ? Msg91Provider : FakeSmsProvider,
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
