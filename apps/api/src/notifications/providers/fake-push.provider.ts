import { Injectable } from '@nestjs/common';
import { PushProvider } from './interfaces';

interface RecordedPushCall {
  token: string;
  title: string;
  body: string;
}

const recordedCalls: RecordedPushCall[] = [];

export function getRecordedPushCalls(): RecordedPushCall[] {
  return recordedCalls;
}

@Injectable()
export class FakePushProvider implements PushProvider {
  async send(token: string, title: string, body: string): Promise<void> {
    const call = { token, title, body };
    recordedCalls.push(call);
    console.log('[FakePush] send:', call);
  }
}
