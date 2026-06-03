import { Inject } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PUSH_PROVIDER, WHATSAPP_PROVIDER, SMS_PROVIDER } from './providers/interfaces';
import type { PushProvider, WhatsappProvider, SmsProvider } from './providers/interfaces';
import { TEMPLATES, replaceVars } from './templates';

@Processor('notifications')
export class NotificationsWorker extends WorkerHost {
  constructor(
    @Inject(PUSH_PROVIDER) private readonly push: PushProvider,
    @Inject(WHATSAPP_PROVIDER) private readonly whatsapp: WhatsappProvider,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const {
      channel,
      to,
      event,
      context,
    }: {
      channel: 'push' | 'whatsapp' | 'sms';
      to: string;
      event: string;
      context: Record<string, string>;
    } = job.data as {
      channel: 'push' | 'whatsapp' | 'sms';
      to: string;
      event: string;
      context: Record<string, string>;
    };

    const template = TEMPLATES[event];

    switch (channel) {
      case 'push':
        await this.push.send(
          to,
          replaceVars(template?.push?.title ?? event, context),
          replaceVars(template?.push?.body ?? '', context),
        );
        break;
      case 'whatsapp':
        await this.whatsapp.send(
          to,
          template?.whatsapp?.templateName ?? event,
          template?.whatsapp?.params(context) ?? [],
        );
        break;
      case 'sms':
        await this.sms.send(to, replaceVars(template?.sms?.message ?? event, context));
        break;
    }
  }

  onFailed(job: Job | undefined, error: Error): void {
    console.error('[Sentry stub] Notification failed:', job?.failedReason ?? error.message);
  }
}
