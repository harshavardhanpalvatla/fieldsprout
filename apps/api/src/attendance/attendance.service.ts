import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/scope.helper';
import { AppException } from '../common/helpers/app-exception';
import { paginate } from '../common/helpers/paginate';

function getIstWorkDate(): Date {
  const nowMs = Date.now();
  const istMs = nowMs + 330 * 60 * 1000;
  const d = new Date(istMs);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async checkin(user: AuthUser, dto: { lat: number; lng: number }) {
    const workDate = getIstWorkDate();
    try {
      return await this.prisma.attendance.create({
        data: {
          repId: user.sub,
          workDate,
          checkinAt: new Date(),
          checkinLat: dto.lat,
          checkinLng: dto.lng,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const existing = await this.prisma.attendance.findFirst({
          where: { repId: user.sub, workDate },
        });
        throw new AppException('DUPLICATE_CHECKIN', 409, 'Already checked in today', {
          attendance: existing,
        });
      }
      throw e;
    }
  }

  async checkout(user: AuthUser) {
    const workDate = getIstWorkDate();
    const attendance = await this.prisma.attendance.findFirst({
      where: { repId: user.sub, workDate, checkoutAt: null },
    });
    if (!attendance) {
      throw new AppException('NOT_FOUND', 404, 'No open attendance record found for today');
    }
    return this.prisma.attendance.update({
      where: { id: attendance.id },
      data: { checkoutAt: new Date() },
    });
  }

  async findAll(
    user: AuthUser,
    query: {
      repId?: string;
      from?: string;
      to?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const where: Prisma.AttendanceWhereInput = {};

    if (user.role === 'rep') {
      where.repId = user.sub;
    } else if (query.repId) {
      where.repId = query.repId;
    }

    if (query.from || query.to) {
      where.workDate = {};
      if (query.from) (where.workDate as Prisma.DateTimeFilter).gte = new Date(query.from);
      if (query.to) (where.workDate as Prisma.DateTimeFilter).lte = new Date(query.to);
    }

    const result = await paginate(
      this.prisma.attendance,
      {
        where,
        include: { rep: { select: { id: true, name: true } } },
        orderBy: { workDate: 'desc' },
      },
      { page: query.page, pageSize: query.pageSize },
    );

    return {
      ...result,
      data: result.data.map((a) => {
        const att = a as typeof a & { checkinAt: Date; checkoutAt: Date | null };
        const hoursWorked = att.checkoutAt
          ? Math.round((att.checkoutAt.getTime() - att.checkinAt.getTime()) / 360000) / 10
          : null;
        return { ...a, hoursWorked };
      }),
    };
  }
}
