import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, orderScope, visitsScope, stockScope } from '../auth/scope.helper';
import { paginate } from '../common/helpers/paginate';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async attendanceReport(
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

  async visitsReport(
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
    const scope = visitsScope(user);
    const where: Prisma.VisitWhereInput = { ...scope };

    if (user.role !== 'rep' && query.repId) where.repId = query.repId;
    if (query.distributorId) where.distributorId = query.distributorId;

    if (query.date) {
      const start = new Date(query.date + 'T00:00:00.000Z');
      const end = new Date(query.date + 'T23:59:59.999Z');
      where.checkinAt = { gte: start, lte: end };
    }

    if (query.geoVerified !== undefined) {
      where.geoVerified = query.geoVerified === 'true';
    }

    const result = await paginate(
      this.prisma.visit,
      {
        where,
        include: {
          rep: { select: { id: true, name: true } },
          distributor: { select: { id: true, name: true } },
        },
        orderBy: { checkinAt: 'desc' },
      },
      { page: query.page, pageSize: query.pageSize },
    );

    return {
      ...result,
      data: result.data.map((v) => {
        const visit = v as typeof v & { photoUrl: string | null };
        return { ...v, hasPhoto: !!visit.photoUrl };
      }),
    };
  }

  async complianceReport(
    user: AuthUser,
    query: { repId: string; date: string },
  ) {
    const { repId, date } = query;
    const start = new Date(date + 'T00:00:00.000Z');
    const end = new Date(date + 'T23:59:59.999Z');

    // Use count queries instead of loading all rows
    const planned = await this.prisma.distributor.count({
      where: { assignedRepId: repId, deletedAt: null },
    });

    const visited = await this.prisma.visit.count({
      where: { repId, checkinAt: { gte: start, lte: end } },
    });

    const verified = await this.prisma.visit.count({
      where: { repId, checkinAt: { gte: start, lte: end }, geoVerified: true },
    });

    // For details, load distributor list and visit map
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

    return { repId, date, planned, visited, verified, details };
  }

  async ordersReport(
    user: AuthUser,
    query: {
      repId?: string;
      distributorId?: string;
      status?: string;
      from?: string;
      to?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const scope = orderScope(user);
    const where: Prisma.OrderWhereInput = { ...scope, deletedAt: null };

    if (user.role !== 'rep' && query.repId) where.repId = query.repId;
    if (query.distributorId) where.distributorId = query.distributorId;
    if (query.status) where.status = query.status as Prisma.EnumOrderStatusFilter;

    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(query.from);
      if (query.to) (where.createdAt as Prisma.DateTimeFilter).lte = new Date(query.to);
    }

    return paginate(
      this.prisma.order,
      {
        where,
        include: {
          rep: { select: { id: true, name: true } },
          distributor: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      { page: query.page, pageSize: query.pageSize },
    );
  }

  async stockReport(
    user: AuthUser,
    query: {
      warehouseId?: string;
      lowOnly?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const scope = stockScope(user);
    const where: Prisma.StockWhereInput = { ...scope };

    if (query.warehouseId) where.warehouseId = query.warehouseId;

    const result = await paginate(
      this.prisma.stock,
      {
        where,
        include: {
          variant: {
            include: { product: { select: { id: true, name: true } } },
          },
        },
        orderBy: { updatedAt: 'desc' },
      },
      { page: query.page, pageSize: query.pageSize },
    );

    const mapped = result.data.map((s) => {
      const stock = s as typeof s & { physicalQty: number; reservedQty: number };
      return { ...s, available: stock.physicalQty - stock.reservedQty };
    });

    const filtered =
      query.lowOnly === 'true' ? mapped.filter((s) => s.available <= 10) : mapped;

    return { ...result, data: filtered };
  }

  async dailySummary(
    user: AuthUser,
    query: { date: string },
  ) {
    const parsedDate = new Date(query.date);
    const dayStart = new Date(query.date + 'T00:00:00.000Z');
    const dayEnd = new Date(query.date + 'T23:59:59.999Z');

    const scope = orderScope(user);

    const [ordersCount, ordersAgg, activeReps, visitsCount, pendingApprovals] = await Promise.all([
      this.prisma.order.count({
        where: { ...scope, deletedAt: null, createdAt: { gte: dayStart, lte: dayEnd } },
      }),
      this.prisma.order.aggregate({
        where: { ...scope, deletedAt: null, createdAt: { gte: dayStart, lte: dayEnd } },
        _sum: { totalAmount: true },
      }),
      this.prisma.attendance
        .groupBy({ by: ['repId'], where: { workDate: parsedDate } })
        .then((r) => r.length),
      this.prisma.visit.count({ where: { checkinAt: { gte: dayStart, lte: dayEnd } } }),
      this.prisma.order.count({ where: { status: 'submitted', deletedAt: null } }),
    ]);

    return {
      date: query.date,
      ordersCount,
      ordersValue: ordersAgg._sum.totalAmount?.toString() ?? '0',
      activeReps,
      visitsCount,
      pendingApprovals,
    };
  }
}
