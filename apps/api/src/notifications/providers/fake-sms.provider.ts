import { Injectable } from '@nestjs/common';
import { SmsProvider } from './interfaces';

interface RecordedSmsCall {
  phone: string;
  message: string;
}

const recordedCalls: RecordedSmsCall[] = [];

export function getRecordedSmsCalls(): RecordedSmsCall[] {
  return recordedCalls;
}

@Injectable()
export class FakeSmsProvider implements SmsProvider {
  async send(phone: string, message: string): Promise<void> {
    const call = { phone, message };
    recordedCalls.push(call);
    console.log('[FakeSms] send:', call);
  }
}
