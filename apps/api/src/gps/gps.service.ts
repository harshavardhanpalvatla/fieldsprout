import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/scope.helper';
import { AppException, Errors } from '../common/helpers/app-exception';

function getIstToday(): Date {
  const nowMs = Date.now();
  const istMs = nowMs + 330 * 60 * 1000;
  const d = new Date(istMs);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

@Injectable()
export class GpsService {
  constructor(private readonly prisma: PrismaService) {}

  async batchInsert(
    user: AuthUser,
    dto: {
      attendanceId: string;
      points: { lat: number; lng: number; capturedAt: string }[];
    },
  ) {
    const attendance = await this.prisma.attendance.findFirst({
      where: { id: dto.attendanceId, repId: user.sub },
    });
    if (!attendance) throw Errors.NOT_FOUND('Attendance record not found');

    if (attendance.checkoutAt !== null) {
      throw new AppException('CONFLICT', 409, 'Attendance is already closed');
    }

    const syncedAt = new Date();
    const mapped = dto.points.map((p) => ({
      repId: user.sub,
      attendanceId: dto.attendanceId,
      lat: p.lat,
      lng: p.lng,
      capturedAt: new Date(p.capturedAt),
      syncedAt,
    }));

    const existingDates = await this.prisma.gpsLocation.findMany({
      where: {
        repId: user.sub,
        capturedAt: { in: mapped.map((p) => p.capturedAt) },
      },
      select: { capturedAt: true },
    });
    const existingSet = new Set(existingDates.map((e) => e.capturedAt.toISOString()));
    const newPoints = mapped.filter((p) => !existingSet.has(p.capturedAt.toISOString()));

    if (newPoints.length > 0) {
      await this.prisma.gpsLocation.createMany({ data: newPoints });
    }

    return { stored: newPoints.length, skipped: mapped.length - newPoints.length };
  }

  async getLive() {
    const nowMs = Date.now();
    const today = getIstToday();

    const openAttendance = await this.prisma.attendance.findMany({
      where: { checkoutAt: null, workDate: today },
      include: { rep: { select: { name: true } } },
    });

    const result = await Promise.all(
      openAttendance.map(async (a) => {
        const latest = await this.prisma.gpsLocation.findFirst({
          where: { repId: a.repId, attendanceId: a.id },
          orderBy: { capturedAt: 'desc' },
        });
        if (!latest) return null;
        const staleMinutes = Math.floor((nowMs - latest.capturedAt.getTime()) / 60000);
        return {
          repId: a.repId,
          name: a.rep.name,
          lat: Number(latest.lat),
          lng: Number(latest.lng),
          capturedAt: latest.capturedAt,
          staleMinutes,
        };
      }),
    );

    return result.filter(Boolean);
  }

  async getHistory(repId: string, date: string) {
    const start = new Date(date + 'T00:00:00.000Z');
    const end = new Date(date + 'T23:59:59.999Z');

    return this.prisma.gpsLocation.findMany({
      where: { repId, capturedAt: { gte: start, lte: end } },
      orderBy: { capturedAt: 'asc' },
    });
  }

  async getCompliance(query: { repId: string; date: string }) {
    const { repId, date } = query;
    const start = new Date(date + 'T00:00:00.000Z');
    const end = new Date(date + 'T23:59:59.999Z');

    const plannedDistributors = await this.prisma.distributor.findMany({
      where: { assignedRepId: repId, deletedAt: null },
      select: { id: true, name: true },
    });

    const visits = await this.prisma.visit.findMany({
      where: { repId, checkinAt: { gte: start, lte: end } },
      select: { distributorId: true, geoVerified: true, checkinAt: true },
    });

    const visitMap = new Map<string, { geoVerified: boolean; checkinAt: Date }>();
    for (const v of visits) {
      if (!visitMap.has(v.distributorId) || v.geoVerified) {
        visitMap.set(v.distributorId, { geoVerified: v.geoVerified, checkinAt: v.checkinAt });
      }
    }

    const details = plannedDistributors.map((d) => ({
      distributorId: d.id,
      name: d.name,
      visited: visitMap.has(d.id),
      geoVerified: visitMap.get(d.id)?.geoVerified ?? false,
      checkinAt: visitMap.get(d.id)?.checkinAt ?? null,
    }));

    const visited = details.filter((d) => d.visited).length;
    const verified = details.filter((d) => d.geoVerified).length;

    return {
      planned: plannedDistributors.length,
      visited,
      verified,
      details,
    };
  }
}
