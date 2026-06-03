import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpProvider } from './otp.provider';

export class TwilioOtpProvider implements OtpProvider {
  private readonly logger = new Logger(TwilioOtpProvider.name);
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly serviceSid: string;

  constructor(private readonly config: ConfigService) {
    this.accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID', '');
    this.authToken = this.config.get<string>('TWILIO_AUTH_TOKEN', '');
    this.serviceSid = this.config.get<string>('TWILIO_VERIFY_SERVICE_SID', '');
  }

  private get basicAuth(): string {
    return Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
  }

  async send(phone: string): Promise<void> {
    try {
      const url = `https://verify.twilio.com/v2/Services/${this.serviceSid}/Verifications`;
      const body = new URLSearchParams({ To: phone, Channel: 'sms' });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${this.basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const text = await response.text();
        this.logger.error(`Twilio send failed (${response.status}): ${text}`);
      }
    } catch (err) {
      this.logger.error('Twilio send error', err);
    }
  }

  async verify(phone: string, code: string): Promise<boolean> {
    try {
      const url = `https://verify.twilio.com/v2/Services/${this.serviceSid}/VerificationChecks`;
      const body = new URLSearchParams({ To: phone, Code: code });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${this.basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const text = await response.text();
        this.logger.error(`Twilio verify failed (${response.status}): ${text}`);
        return false;
      }

      const data = (await response.json()) as { status: string };
      return data.status === 'approved';
    } catch (err) {
      this.logger.error('Twilio verify error', err);
      return false;
    }
  }
}
