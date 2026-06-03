import { OtpProvider } from './otp.provider';

interface SendRecord {
  phone: string;
  sentAt: Date;
}

export class FakeOtpProvider implements OtpProvider {
  private readonly sends: SendRecord[] = [];

  async send(phone: string): Promise<void> {
    this.sends.push({ phone, sentAt: new Date() });
  }

  async verify(_phone: string, code: string): Promise<boolean> {
    return code === '000000';
  }

  getRecordedSends(): SendRecord[] {
    return [...this.sends];
  }
}
