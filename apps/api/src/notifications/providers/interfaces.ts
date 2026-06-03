export const PUSH_PROVIDER = 'PUSH_PROVIDER';
export const WHATSAPP_PROVIDER = 'WHATSAPP_PROVIDER';
export const SMS_PROVIDER = 'SMS_PROVIDER';

export interface PushProvider {
  send(token: string, title: string, body: string): Promise<void>;
}

export interface WhatsappProvider {
  send(phone: string, templateName: string, params: string[]): Promise<void>;
}

export interface SmsProvider {
  send(phone: string, message: string): Promise<void>;
}
