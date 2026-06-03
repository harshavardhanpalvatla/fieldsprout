import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

interface NotifJob {
  channel: 'push' | 'whatsapp' | 'sms';
  to: string;
  event: string;
  context: Record<string, string>;
}

interface NotificationConfigRow {
  event: string;
  pushEnabled: boolean;
  whatsappEnabled: boolean;
  smsEnabled: boolean;
  recipient: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('notifications') private readonly queue: Queue,
  ) {}

  async emit(event: string, context: Record<string, string>): Promise<void> {
    try {
      const config = await this.prisma.notificationConfig.findUnique({ where: { event } });
      if (!config) return;

      const jobs = await this.buildJobs(config as NotificationConfigRow, context);
      for (const job of jobs) {
        await this.queue.add(event, job, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 60000 },
        });
      }
    } catch (e) {
      console.error('[Notifications] emit error:', e);
    }
  }

  private async buildJobs(
    config: NotificationConfigRow,
    context: Record<string, string>,
  ): Promise<NotifJob[]> {
    const jobs: NotifJob[] = [];

    // Resolve rep phone/token
    let repFcmToken: string | null = null;
    let repPhone: string | null = null;
    let distributorPhone: string | null = null;

    if (context.repId) {
      const rep = await this.prisma.user.findFirst({
        where: { id: context.repId },
        select: { fcmToken: true, phone: true },
      });
      repFcmToken = rep?.fcmToken ?? null;
      repPhone = rep?.phone ?? null;
    }

    if (context.distributorId) {
      const dist = await this.prisma.distributor.findFirst({
        where: { id: context.distributorId },
        select: { phone: true },
      });
      distributorPhone = dist?.phone ?? null;
    }

    const recipient = config.recipient; // 'rep' | 'distributor' | 'both'

    if (config.pushEnabled) {
      if ((recipient === 'rep' || recipient === 'both') && repFcmToken) {
        jobs.push({ channel: 'push', to: repFcmToken, event: config.event, context });
      }
    }

    if (config.whatsappEnabled) {
      if ((recipient === 'rep' || recipient === 'both') && repPhone) {
        jobs.push({ channel: 'whatsapp', to: repPhone, event: config.event, context });
      }
      if ((recipient === 'distributor' || recipient === 'both') && distributorPhone) {
        jobs.push({ channel: 'whatsapp', to: distributorPhone, event: config.event, context });
      }
    }

    if (config.smsEnabled) {
      if ((recipient === 'rep' || recipient === 'both') && repPhone) {
        jobs.push({ channel: 'sms', to: repPhone, event: config.event, context });
      }
      if ((recipient === 'distributor' || recipient === 'both') && distributorPhone) {
        jobs.push({ channel: 'sms', to: distributorPhone, event: config.event, context });
      }
    }

    return jobs;
  }

  async updateConfig(
    event: string,
    dto: {
      pushEnabled?: boolean;
      whatsappEnabled?: boolean;
      smsEnabled?: boolean;
      recipient?: string;
    },
    updatedBy: string,
  ) {
    await this.prisma.notificationConfig.upsert({
      where: { event },
      create: { event, ...(dto as Record<string, unknown>), updatedBy } as Parameters<
        typeof this.prisma.notificationConfig.upsert
      >[0]['create'],
      update: { ...(dto as Record<string, unknown>), updatedBy },
    });
    await this.prisma.auditLog.create({
      data: {
        userId: updatedBy,
        action: 'notifications.config.updated',
        entity: 'notification_config',
        entityId: event,
        payload: dto,
      },
    });
  }

  async storeFcmToken(userId: string, fcmToken: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { fcmToken } });
  }

  async findAllConfigs() {
    return this.prisma.notificationConfig.findMany();
  }
}
