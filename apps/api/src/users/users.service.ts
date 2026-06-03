import { Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import * as XLSX from 'xlsx';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { AppException, Errors } from '../common/helpers/app-exception';
import { paginate, PaginatedResult } from '../common/helpers/paginate';
import { AuthUser } from '../auth/scope.helper';
import { createUserSchema } from '@fieldsprout/validation';
import { Prisma, User, UserWarehouseAssignment } from '@prisma/client';

export type CreateUserDto = z.infer<typeof createUserSchema>;

export interface UpdateMeDto {
  name?: string;
  photoUrl?: string;
}

export interface UpdateUserDto {
  name?: string;
  phone?: string;
  role?: string;
  employeeId?: string;
  territory?: string;
  state?: string;
  reportingManagerId?: string;
  photoUrl?: string;
}

export interface FindAllUsersQuery {
  role?: string;
  state?: string;
  territory?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface BulkImportResult {
  created: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(
    userId: string,
  ): Promise<User & { warehouseAssignments: UserWarehouseAssignment[] }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { warehouseAssignments: { where: { isActive: true } } },
    });
    if (!user) throw Errors.NOT_FOUND('User not found');
    return user as User & { warehouseAssignments: UserWarehouseAssignment[] };
  }

  async updateMe(userId: string, dto: UpdateMeDto): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.photoUrl !== undefined && { photoUrl: dto.photoUrl }),
      },
    });
  }

  async create(currentUser: AuthUser, dto: CreateUserDto): Promise<User> {
    let user: User;
    try {
      user = await this.prisma.user.create({ data: dto });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new AppException('CONFLICT', 409, 'Phone already registered');
      }
      throw err;
    }

    if (dto.warehouseId) {
      await this.prisma.userWarehouseAssignment.create({
        data: {
          userId: user.id,
          warehouseId: dto.warehouseId,
          assignedBy: currentUser.sub,
          isActive: true,
        },
      });
    }

    return user;
  }

  async findAll(query: FindAllUsersQuery): Promise<PaginatedResult<User>> {
    const where: Prisma.UserWhereInput = { deletedAt: null };

    if (query.role) where.role = query.role as User['role'];
    if (query.state) where.state = query.state;
    if (query.territory) where.territory = query.territory;
    if (query.status) where.status = query.status as User['status'];

    return paginate(
      this.prisma.user as Parameters<typeof paginate>[0],
      { where, orderBy: { createdAt: 'desc' } },
      { page: query.page, pageSize: query.pageSize },
    ) as Promise<PaginatedResult<User>>;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: dto as Prisma.UserUpdateInput,
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw Errors.NOT_FOUND('User not found');
      }
      throw err;
    }
  }

  async deactivate(id: string, redis: Redis): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'inactive' },
    });

    await redis.del('session:' + id);

    await this.prisma.auditLog.create({
      data: {
        userId: id,
        action: 'user.deactivated',
        entity: 'users',
        entityId: id,
        payload: {},
      },
    });
  }

  async bulkImport(buffer: Buffer, currentUser: AuthUser): Promise<BulkImportResult> {
    const wb = XLSX.read(buffer);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];

    let created = 0;
    let failed = 0;
    const errors: Array<{ row: number; message: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const result = createUserSchema.safeParse(row);

      if (!result.success) {
        failed++;
        const fieldErrors = result.error.flatten().fieldErrors;
        const message = Object.entries(fieldErrors)
          .map(([field, msgs]) => `${field}: ${(msgs ?? []).join(', ')}`)
          .join('; ');
        errors.push({ row: i + 2, message });
        continue;
      }

      try {
        await this.create(currentUser, result.data);
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
