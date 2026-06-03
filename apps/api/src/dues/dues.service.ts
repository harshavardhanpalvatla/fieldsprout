import { Injectable, Inject } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/scope.helper';
import { Errors } from '../common/helpers/app-exception';
import { TALLY_PROVIDER, TallyProvider } from './tally.provider';

interface CreateDuesDto {
  distributorId: string;
  invoiceRef?: string;
  amount: number;
  dueDate?: string;
}

interface UpdateDuesDto {
  amount?: number;
  invoiceRef?: string;
  dueDate?: string;
}

interface FindAllDuesQuery {
  distributorId?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class DuesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(TALLY_PROVIDER) private readonly tallyProvider: TallyProvider,
  ) {}

  async findAll(user: AuthUser, query: FindAllDuesQuery) {
    const where: Prisma.DuesWhereInput = { deletedAt: null };

    if (user.role === 'rep') {
      // Rep only sees dues for their assigned distributors
      const assignedDistributors = await this.prisma.distributor.findMany({
        where: { assignedRepId: user.sub, deletedAt: null },
        select: { id: true },
      });
      where.distributorId = { in: assignedDistributors.map((d) => d.id) };
    } else if (query.distributorId) {
      where.distributorId = query.distributorId;
    }

    const dues = await this.prisma.dues.findMany({
      where,
      include: { distributor: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Group by distributorId in JS
    const grouped = new Map<
      string,
      { distributorId: string; name: string; invoices: typeof dues; totalOutstanding: number }
    >();

    for (const due of dues) {
      const distId = due.distributorId;
      const dist = due.distributor;
      if (!grouped.has(distId)) {
        grouped.set(distId, {
          distributorId: distId,
          name: dist.name,
          invoices: [],
          totalOutstanding: 0,
        });
      }
      const entry = grouped.get(distId)!;
      entry.invoices.push(due);
      entry.totalOutstanding += Number(due.amount);
    }

    const data = Array.from(grouped.values());

    // Simple pagination on grouped result
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const total = data.length;
    const totalPages = Math.ceil(total / pageSize);
    const sliced = data.slice((page - 1) * pageSize, page * pageSize);

    return {
      data: sliced,
      meta: { page, pageSize, total, totalPages },
    };
  }

  async create(user: AuthUser, dto: CreateDuesDto) {
    const due = await this.prisma.dues.create({
      data: {
        distributorId: dto.distributorId,
        invoiceRef: dto.invoiceRef ?? null,
        amount: dto.amount,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        source: 'manual',
        updatedBy: user.sub,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        userId: user.sub,
        action: 'dues.create',
        entity: 'dues',
        entityId: due.id,
        payload: JSON.parse(JSON.stringify(dto)),
      },
    });
    return due;
  }

  async update(id: string, user: AuthUser, dto: UpdateDuesDto) {
    const existing = await this.prisma.dues.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw Errors.NOT_FOUND('Due record not found');

    const due = await this.prisma.dues.update({
      where: { id },
      data: {
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.invoiceRef !== undefined && { invoiceRef: dto.invoiceRef }),
        ...(dto.dueDate !== undefined && { dueDate: new Date(dto.dueDate) }),
        updatedBy: user.sub,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        userId: user.sub,
        action: 'dues.update',
        entity: 'dues',
        entityId: id,
        payload: JSON.parse(JSON.stringify(dto)),
      },
    });
    return due;
  }

  async remove(id: string, user: AuthUser) {
    const existing = await this.prisma.dues.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw Errors.NOT_FOUND('Due record not found');

    await this.prisma.dues.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: user.sub },
    });
    await this.prisma.auditLog.create({
      data: {
        userId: user.sub,
        action: 'dues.delete',
        entity: 'dues',
        entityId: id,
        payload: {},
      },
    });
    return { success: true };
  }

  async syncTally() {
    const rows = await this.tallyProvider.fetchDues();
    let synced = 0;
    const errors: { distributorRef: string; invoiceRef: string; error: string }[] = [];

    for (const row of rows) {
      const dist = await this.prisma.distributor.findFirst({
        where: { phone: row.distributorRef, deletedAt: null },
        select: { id: true },
      });

      if (!dist) {
        errors.push({ distributorRef: row.distributorRef, invoiceRef: row.invoiceRef, error: 'Distributor not found' });
        continue;
      }

      try {
        const existing = await this.prisma.dues.findFirst({
          where: { distributorId: dist.id, invoiceRef: row.invoiceRef, deletedAt: null },
        });

        if (existing) {
          await this.prisma.dues.update({
            where: { id: existing.id },
            data: {
              amount: row.amount,
              source: 'tally_sync',
              ...(row.dueDate && { dueDate: new Date(row.dueDate) }),
            },
          });
        } else {
          await this.prisma.dues.create({
            data: {
              distributorId: dist.id,
              invoiceRef: row.invoiceRef,
              amount: row.amount,
              dueDate: row.dueDate ? new Date(row.dueDate) : null,
              source: 'tally_sync',
            },
          });
        }
        synced++;
      } catch (e) {
        errors.push({
          distributorRef: row.distributorRef,
          invoiceRef: row.invoiceRef,
          error: e instanceof Error ? e.message : 'Unknown error',
        });
      }
    }

    return { synced, errors };
  }
}
