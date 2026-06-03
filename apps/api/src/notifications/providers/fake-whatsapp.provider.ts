import { Injectable } from '@nestjs/common';
import { WhatsappProvider } from './interfaces';

interface RecordedWhatsappCall {
  phone: string;
  templateName: string;
  params: string[];
}

const recordedCalls: RecordedWhatsappCall[] = [];

export function getRecordedWhatsappCalls(): RecordedWhatsappCall[] {
  return recordedCalls;
}

@Injectable()
export class FakeWhatsappProvider implements WhatsappProvider {
  async send(phone: string, templateName: string, params: string[]): Promise<void> {
    const call = { phone, templateName, params };
    recordedCalls.push(call);
    console.log('[FakeWhatsapp] send:', call);
  }
}
