import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsProvider } from './interfaces';

@Injectable()
export class Msg91Provider implements SmsProvider {
  constructor(private readonly config: ConfigService) {}

  async send(phone: string, message: string): Promise<void> {
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';

    if (!isProduction) {
      console.log(`[MSG91] to ${phone}: ${message}`);
      return;
    }

    const authKey = this.config.get<string>('MSG91_AUTH_KEY');
    const senderId = this.config.get<string>('MSG91_SENDER_ID') ?? 'SEEDCO';

    if (!authKey) {
      console.warn('[MSG91] Missing MSG91_AUTH_KEY');
      return;
    }

    const url = 'https://api.msg91.com/api/v5/flow/';

    await fetch(url, {
      method: 'POST',
      headers: {
        authkey: authKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        flow_id: this.config.get<string>('MSG91_FLOW_ID'),
        sender: senderId,
        mobiles: phone.replace('+', ''),
        message,
      }),
    });
  }
}
