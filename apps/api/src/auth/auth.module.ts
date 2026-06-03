import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { OTP_PROVIDER } from './otp/otp.provider';
import { FakeOtpProvider } from './otp/fake-otp.provider';
import { TwilioOtpProvider } from './otp/twilio-otp.provider';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        secret: c.get<string>('JWT_SECRET', 'dev-secret'),
        signOptions: {},
      }),
    }),
    PassportModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: OTP_PROVIDER,
      inject: [ConfigService],
      useFactory: (c: ConfigService) =>
        c.get('OTP_PROVIDER') === 'twilio'
          ? new TwilioOtpProvider(c)
          : new FakeOtpProvider(),
    },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
