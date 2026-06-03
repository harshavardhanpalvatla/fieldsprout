import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/scope.helper';
import { Errors } from '../common/helpers/app-exception';
import { paginate } from '../common/helpers/paginate';
import { distanceMeters } from '../common/utils/haversine';

@Injectable()
export class VisitsService {
  constructor(private readonly prisma: PrismaService) {}

  async checkin(
    user: AuthUser,
    dto: {
      distributorId: string;
      lat: number;
      lng: number;
      attendanceId: string;
      photoUrl?: string;
    },
  ) {
    const distributor = await this.prisma.distributor.findFirst({
      where: { id: dto.distributorId, deletedAt: null },
      select: { id: true, lat: true, lng: true, geofenceRadius: true },
    });
    if (!distributor) throw Errors.NOT_FOUND('Distributor not found');

    const dist = distanceMeters(
      dto.lat,
      dto.lng,
      Number(distributor.lat),
      Number(distributor.lng),
    );
    const geoVerified = dist <= distributor.geofenceRadius;

    const visit = await this.prisma.visit.create({
      data: {
        repId: user.sub,
        distributorId: dto.distributorId,
        attendanceId: dto.attendanceId,
        checkinLat: dto.lat,
        checkinLng: dto.lng,
        geoVerified,
        photoUrl: dto.photoUrl ?? null,
        checkinAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.sub,
        action: 'visit.checkin',
        entity: 'visits',
        entityId: visit.id,
        payload: { geoVerified, distanceMeters: Math.round(dist) },
      },
    });

    return { ...visit, distanceMeters: Math.round(dist) };
  }

  async checkout(user: AuthUser, visitId: string) {
    const visit = await this.prisma.visit.findFirst({
      where: { id: visitId, repId: user.sub },
    });
    if (!visit) throw Errors.NOT_FOUND('Visit not found');

    return this.prisma.visit.update({
      where: { id: visitId },
      data: { checkoutAt: new Date() },
    });
  }

  async findAll(
    user: AuthUser,
    query: {
      repId?: string;
      distributorId?: string;
      date?: string;
      geoVerified?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const where: Prisma.VisitWhereInput = {};

    if (user.role === 'rep') {
      where.repId = user.sub;
    } else if (query.repId) {
      where.repId = query.repId;
    }

    if (query.distributorId) {
      where.distributorId = query.distributorId;
    }

    if (query.date) {
      const start = new Date(query.date + 'T00:00:00.000Z');
      const end = new Date(query.date + 'T23:59:59.999Z');
      where.checkinAt = { gte: start, lte: end };
    }

    if (query.geoVerified !== undefined) {
      where.geoVerified = query.geoVerified === 'true';
    }

    return paginate(
      this.prisma.visit,
      {
        where,
        include: {
          distributor: { select: { id: true, name: true } },
          rep: { select: { id: true, name: true } },
        },
        orderBy: { checkinAt: 'desc' },
      },
      { page: query.page, pageSize: query.pageSize },
    );
  }
}
