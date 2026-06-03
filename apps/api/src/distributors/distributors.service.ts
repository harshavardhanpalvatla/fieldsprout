import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';
import { AppException, Errors } from '../common/helpers/app-exception';
import { paginate, PaginatedResult } from '../common/helpers/paginate';
import { AuthUser } from '../auth/scope.helper';
import { Distributor, Prisma } from '@prisma/client';

export interface CreateDistributorDto {
  name: string;
  phone?: string;
  address?: string;
  state?: string;
  lat: number;
  lng: number;
  geofenceRadius?: number;
}

export interface UpdateDistributorDto {
  name?: string;
  phone?: string;
  address?: string;
  state?: string;
  lat?: number;
  lng?: number;
  geofenceRadius?: number;
}

export interface ApproveDistributorDto {
  lat?: number;
  lng?: number;
  geofenceRadius?: number;
}

export interface FindAllDistributorsQuery {
  status?: string;
  state?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface BulkImportResult {
  created: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
}

export interface DistributorDetail extends Distributor {
  lastThreeOrders: Array<{
    id: string;
    status: string;
    totalAmount: number;
    createdAt: Date;
  }>;
  totalDues: number;
}

@Injectable()
export class DistributorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(user: AuthUser, dto: CreateDistributorDto): Promise<Distributor> {
    const isRep = user.role === 'rep';

    const distributor = await this.prisma.distributor.create({
      data: {
        ...dto,
        status: isRep ? 'pending' : 'active',
        addedBy: user.sub,
        ...(isRep ? { assignedRepId: user.sub } : {}),
      },
    });

    if (isRep) {
      this.eventEmitter.emit('distributor.pending', { distributor, user });
    }

    return distributor;
  }

  async findAll(
    user: AuthUser,
    query: FindAllDistributorsQuery,
  ): Promise<PaginatedResult<Distributor>> {
    const where: Prisma.DistributorWhereInput = { deletedAt: null };

    if (user.role === 'rep') {
      where.OR = [
        { assignedRepId: user.sub },
        {
          status: 'active',
          ...(user.state ? { state: user.state } : {}),
        },
      ];
    }

    if (query.status) where.status = query.status as Distributor['status'];
    if (query.state) where.state = query.state;

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    return paginate(
      this.prisma.distributor as Parameters<typeof paginate>[0],
      { where, orderBy: { createdAt: 'desc' } },
      { page: query.page, pageSize: query.pageSize },
    ) as Promise<PaginatedResult<Distributor>>;
  }

  async findOne(id: string, user: AuthUser): Promise<DistributorDetail> {
    const distributor = await this.prisma.distributor.findUnique({
      where: { id, deletedAt: null },
      include: {
        orders: {
          take: 3,
          orderBy: { createdAt: 'desc' },
          select: { id: true, status: true, totalAmount: true, createdAt: true },
        },
        dues: {
          where: { deletedAt: null },
          select: { amount: true },
        },
      },
    });

    if (!distributor) throw Errors.NOT_FOUND('Distributor not found');

    if (
      user.role === 'rep' &&
      distributor.assignedRepId !== user.sub &&
      distributor.status !== 'active'
    ) {
      throw Errors.NOT_FOUND('Distributor not found');
    }

    const totalDues = distributor.dues.reduce(
      (sum, d) => sum + Number(d.amount),
      0,
    );

    const { dues, orders, ...rest } = distributor;

    return {
      ...rest,
      lastThreeOrders: orders.map((o) => ({
        id: o.id,
        status: o.status,
        totalAmount: Number(o.totalAmount),
        createdAt: o.createdAt,
      })),
      totalDues,
    };
  }

  async update(
    id: string,
    user: AuthUser,
    dto: UpdateDistributorDto,
  ): Promise<Distributor> {
    if (user.role === 'rep') {
      const distributor = await this.prisma.distributor.findUnique({
        where: { id, deletedAt: null },
      });
      if (!distributor) throw Errors.NOT_FOUND('Distributor not found');
      if (
        distributor.assignedRepId !== user.sub ||
        distributor.status !== 'pending'
      ) {
        throw Errors.FORBIDDEN('Cannot update this distributor');
      }
    }

    return this.prisma.distributor.update({
      where: { id },
      data: dto as Prisma.DistributorUpdateInput,
    });
  }

  async approve(
    id: string,
    user: AuthUser,
    dto: ApproveDistributorDto,
  ): Promise<Distributor> {
    return this.prisma.distributor.update({
      where: { id },
      data: {
        status: 'active',
        ...(dto.lat !== undefined && { lat: dto.lat }),
        ...(dto.lng !== undefined && { lng: dto.lng }),
        ...(dto.geofenceRadius !== undefined && {
          geofenceRadius: dto.geofenceRadius,
        }),
      },
    });
  }

  async reject(id: string, user: AuthUser, reason: string): Promise<void> {
    await this.prisma.distributor.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.sub,
        action: 'distributor.rejected',
        entity: 'distributors',
        entityId: id,
        payload: { reason },
      },
    });
  }

  async reassign(id: string, assignedRepId: string): Promise<Distributor> {
    return this.prisma.distributor.update({
      where: { id },
      data: { assignedRepId },
    });
  }

  async importDistributors(
    buffer: Buffer,
    user: AuthUser,
  ): Promise<BulkImportResult> {
    const wb = XLSX.read(buffer);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];

    let created = 0;
    let failed = 0;
    const errors: Array<{ row: number; message: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      if (!row['name'] || typeof row['name'] !== 'string') {
        failed++;
        errors.push({ row: i + 2, message: 'name: Required string' });
        continue;
      }

      if (row['lat'] === undefined || row['lng'] === undefined) {
        failed++;
        errors.push({ row: i + 2, message: 'lat and lng are required' });
        continue;
      }

      try {
        await this.create(user, {
          name: row['name'] as string,
          phone: row['phone'] as string | undefined,
          address: row['address'] as string | undefined,
          state: row['state'] as string | undefined,
          lat: Number(row['lat']),
          lng: Number(row['lng']),
          geofenceRadius: row['geofenceRadius']
            ? Number(row['geofenceRadius'])
            : undefined,
        });
        created++;
      } catch (err) {
        failed++;
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push({ row: i + 2, message: msg });
      }
    }

    return { created, failed, errors };
  }
}
