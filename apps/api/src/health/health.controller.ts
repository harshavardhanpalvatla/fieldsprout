import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { InjectRedis } from '../common/decorators/inject-redis.decorator';
import Redis from 'ioredis';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check — pings DB and Redis' })
  async check() {
    let db = false;
    let redisOk = false;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = true;
    } catch {}

    try {
      const pong = await this.redis.ping();
      redisOk = pong === 'PONG';
    } catch {}

    return { status: 'ok', db, redis: redisOk };
  }
}
