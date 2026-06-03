export const OTP_PROVIDER = 'OTP_PROVIDER';

export interface OtpProvider {
  send(phone: string): Promise<void>;
  verify(phone: string, code: string): Promise<boolean>;
}
