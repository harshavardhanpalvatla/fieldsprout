import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PushProvider } from './interfaces';

@Injectable()
export class FcmProvider implements PushProvider {
  constructor(private readonly config: ConfigService) {}

  async send(token: string, title: string, body: string): Promise<void> {
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';

    if (!isProduction) {
      console.log(`[FCM push] to ${token}: ${title} — ${body}`);
      return;
    }

    const serverKey = this.config.get<string>('FCM_SERVER_KEY');
    const projectId = this.config.get<string>('FCM_PROJECT_ID');

    if (!serverKey || !projectId) {
      console.warn('[FCM] Missing FCM_SERVER_KEY or FCM_PROJECT_ID');
      return;
    }

    const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serverKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
        },
      }),
    });
  }
}
