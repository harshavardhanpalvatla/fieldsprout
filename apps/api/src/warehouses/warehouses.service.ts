import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppException, Errors } from '../common/helpers/app-exception';
import { paginate, PaginatedResult } from '../common/helpers/paginate';
import { AuthUser } from '../auth/scope.helper';
import { Prisma, UserWarehouseAssignment, Warehouse } from '@prisma/client';

export interface CreateWarehouseDto {
  name: string;
  address?: string;
  state?: string;
  lat?: number;
  lng?: number;
}

export interface UpdateWarehouseDto {
  name?: string;
  address?: string;
  state?: string;
  lat?: number;
  lng?: number;
}

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(currentUserId: string, dto: CreateWarehouseDto): Promise<Warehouse> {
    return this.prisma.warehouse.create({
      data: {
        name: dto.name,
        address: dto.address,
        state: dto.state,
        lat: dto.lat !== undefined ? dto.lat : undefined,
        lng: dto.lng !== undefined ? dto.lng : undefined,
      },
    });
  }

  async findAll(
    user: AuthUser,
    query: { page?: number; pageSize?: number },
  ): Promise<PaginatedResult<Warehouse & { assignments: UserWarehouseAssignment[] }>> {
    const where: Prisma.WarehouseWhereInput = { deletedAt: null };

    if (user.role === 'warehouse_mgr') {
      where.id = { in: user.warehouseIds ?? [] };
    }

    return paginate(
      this.prisma.warehouse as Parameters<typeof paginate>[0],
      {
        where,
        include: {
          assignments: {
            where: { isActive: true },
            include: { user: { select: { id: true, name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      { page: query.page, pageSize: query.pageSize },
    ) as Promise<PaginatedResult<Warehouse & { assignments: UserWarehouseAssignment[] }>>;
  }

  async findOne(id: string): Promise<Warehouse & { assignments: UserWarehouseAssignment[] }> {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id, deletedAt: null },
      include: {
        assignments: {
          where: { isActive: true },
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });
    if (!warehouse) throw Errors.NOT_FOUND('Warehouse not found');
    return warehouse as Warehouse & { assignments: UserWarehouseAssignment[] };
  }

  async update(id: string, dto: UpdateWarehouseDto): Promise<Warehouse> {
    try {
      return await this.prisma.warehouse.update({
        where: { id, deletedAt: null },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.address !== undefined && { address: dto.address }),
          ...(dto.state !== undefined && { state: dto.state }),
          ...(dto.lat !== undefined && { lat: dto.lat }),
          ...(dto.lng !== undefined && { lng: dto.lng }),
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw Errors.NOT_FOUND('Warehouse not found');
      }
      throw err;
    }
  }

  async softDelete(id: string): Promise<void> {
    const activeOrderCount = await this.prisma.order.count({
      where: {
        warehouseId: id,
        status: { notIn: ['delivered'] },
        deletedAt: null,
      },
    });

    if (activeOrderCount > 0) {
      throw new AppException('CONFLICT', 409, 'Warehouse has active orders');
    }

    await this.prisma.warehouse.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async addManager(
    warehouseId: string,
    userId: string,
    assignedBy: string,
  ): Promise<UserWarehouseAssignment> {
    return this.prisma.userWarehouseAssignment.upsert({
      where: { userId_warehouseId: { userId, warehouseId } },
      create: { userId, warehouseId, assignedBy, isActive: true },
      update: { isActive: true, assignedBy },
    });
  }

  async removeManager(
    warehouseId: string,
    userId: string,
  ): Promise<UserWarehouseAssignment> {
    return this.prisma.userWarehouseAssignment.update({
      where: { userId_warehouseId: { userId, warehouseId } },
      data: { isActive: false },
    });
  }
}
