import { Injectable, Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { InjectRedis } from '../common/decorators/inject-redis.decorator';
import { Errors } from '../common/helpers/app-exception';
import { OTP_PROVIDER, OtpProvider } from './otp/otp.provider';
import { JwtPayload } from '@fieldsprout/types';

interface SessionData {
  accessJti: string;
  refreshJti: string;
}

interface RefreshPayload extends JwtPayload {
  jti: string;
  tokenType: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis,
    private readonly jwtService: JwtService,
    @Inject(OTP_PROVIDER) private readonly otpProvider: OtpProvider,
    private readonly config: ConfigService,
  ) {}

  async requestOtp(phone: string): Promise<{ sent: boolean }> {
    const rateKey = `otp:rate:${phone}`;
    const count = await this.redis.incr(rateKey);
    if (count === 1) {
      await this.redis.expire(rateKey, 900);
    }
    if (count > 5) {
      throw Errors.OTP_RATE_LIMITED();
    }

    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user || user.status !== 'active') {
      throw Errors.NOT_FOUND('User not found');
    }

    await this.otpProvider.send(phone);
    return { sent: true };
  }

  async verifyOtp(
    phone: string,
    code: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      name: string;
      role: string;
      phone: string;
      territory: string | null;
      state: string | null;
    };
  }> {
    const valid = await this.otpProvider.verify(phone, code);
    if (!valid) {
      throw Errors.OTP_INVALID();
    }

    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user || user.status !== 'active') {
      throw Errors.NOT_FOUND('User not found');
    }

    const assignments = await this.prisma.userWarehouseAssignment.findMany({
      where: { userId: user.id, isActive: true },
    });

    const warehouseIds = assignments.map(
      (a: { warehouseId: string }) => a.warehouseId,
    );

    const payload: JwtPayload = {
      sub: user.id,
      role: user.role as JwtPayload['role'],
      warehouseIds,
      territory: user.territory ?? null,
      state: user.state ?? null,
    };

    const accessJti = crypto.randomUUID();
    const refreshJti = crypto.randomUUID();

    const accessToken = this.jwtService.sign(
      { ...payload, jti: accessJti },
      { expiresIn: '24h' },
    );

    const refreshToken = this.jwtService.sign(
      { ...payload, jti: refreshJti, tokenType: 'refresh' },
      { expiresIn: '7d' },
    );

    const session: SessionData = { accessJti, refreshJti };
    await this.redis.set(`session:${user.id}`, JSON.stringify(session));

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        phone: user.phone,
        territory: user.territory ?? null,
        state: user.state ?? null,
      },
    };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    let decoded: RefreshPayload;
    try {
      decoded = this.jwtService.verify<RefreshPayload>(refreshToken);
    } catch {
      throw Errors.UNAUTHENTICATED('Invalid or expired refresh token');
    }

    if (decoded.tokenType !== 'refresh') {
      throw Errors.UNAUTHENTICATED('Invalid token type');
    }

    const sessionRaw = await this.redis.get(`session:${decoded.sub}`);
    if (!sessionRaw) {
      throw Errors.SESSION_INVALIDATED();
    }

    const session = JSON.parse(sessionRaw) as SessionData;
    if (decoded.jti !== session.refreshJti) {
      throw Errors.SESSION_INVALIDATED();
    }

    const newAccessJti = crypto.randomUUID();

    const payload: JwtPayload = {
      sub: decoded.sub,
      role: decoded.role,
      warehouseIds: decoded.warehouseIds,
      territory: decoded.territory,
      state: decoded.state,
    };

    const accessToken = this.jwtService.sign(
      { ...payload, jti: newAccessJti },
      { expiresIn: '24h' },
    );

    const updatedSession: SessionData = {
      accessJti: newAccessJti,
      refreshJti: session.refreshJti,
    };
    await this.redis.set(`session:${decoded.sub}`, JSON.stringify(updatedSession));

    return { accessToken };
  }

  async logout(userId: string): Promise<{ success: boolean }> {
    await this.redis.del(`session:${userId}`);
    return { success: true };
  }

  async validateAccessToken(token: string): Promise<JwtPayload> {
    let decoded: JwtPayload & { jti: string };
    try {
      decoded = this.jwtService.verify<JwtPayload & { jti: string }>(token);
    } catch {
      throw Errors.UNAUTHENTICATED('Invalid or expired token');
    }

    const sessionRaw = await this.redis.get(`session:${decoded.sub}`);
    if (!sessionRaw) {
      throw Errors.SESSION_INVALIDATED();
    }

    const session = JSON.parse(sessionRaw) as SessionData;
    if (decoded.jti !== session.accessJti) {
      throw Errors.SESSION_INVALIDATED();
    }

    return decoded;
  }
}
