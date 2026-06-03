import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsappProvider } from './interfaces';

@Injectable()
export class GupshupProvider implements WhatsappProvider {
  constructor(private readonly config: ConfigService) {}

  async send(phone: string, templateName: string, params: string[]): Promise<void> {
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';

    if (!isProduction) {
      console.log(`[Gupshup] to ${phone}: template=${templateName}, params=${params.join(',')}`);
      return;
    }

    const apiKey = this.config.get<string>('GUPSHUP_API_KEY');
    const appName = this.config.get<string>('GUPSHUP_APP_NAME');
    const srcName = this.config.get<string>('GUPSHUP_SRC_NAME');

    if (!apiKey || !appName || !srcName) {
      console.warn('[Gupshup] Missing GUPSHUP_API_KEY, GUPSHUP_APP_NAME, or GUPSHUP_SRC_NAME');
      return;
    }

    const url = 'https://api.gupshup.io/sm/api/v1/template/msg';

    await fetch(url, {
      method: 'POST',
      headers: {
        apikey: apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        channel: 'whatsapp',
        source: srcName,
        destination: phone,
        template: JSON.stringify({ id: templateName, params }),
        'src.name': appName,
      }),
    });
  }
}
