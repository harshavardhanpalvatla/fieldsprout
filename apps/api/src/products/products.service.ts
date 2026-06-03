import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';
import { Errors } from '../common/helpers/app-exception';
import { paginate, PaginatedResult } from '../common/helpers/paginate';
import { AuthUser } from '../auth/scope.helper';
import { Prisma, Product, ProductVariant } from '@prisma/client';

export interface CreateProductDto {
  name: string;
  category?: string;
  description?: string;
  imageUrl?: string;
  regions?: string[];
}

export interface UpdateProductDto {
  name?: string;
  category?: string;
  description?: string;
  imageUrl?: string;
  regions?: string[];
  isActive?: boolean;
}

export interface CreateVariantDto {
  sku: string;
  unit: string;
  price: number;
  priceEffectiveFrom?: string;
}

export interface UpdateVariantDto {
  sku?: string;
  unit?: string;
  price?: number;
  priceEffectiveFrom?: string;
  isActive?: boolean;
}

export interface FindAllProductsQuery {
  category?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface BulkImportResult {
  created: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto): Promise<Product> {
    return this.prisma.product.create({ data: dto });
  }

  async findAll(
    user: AuthUser,
    query: FindAllProductsQuery,
  ): Promise<PaginatedResult<Product>> {
    const where: Prisma.ProductWhereInput = { deletedAt: null };

    if (user.role === 'rep') {
      where.isActive = true;
      // regions=[] means visible to all; otherwise must contain rep's state or territory
      const regionFilters: Prisma.ProductWhereInput[] = [
        { regions: { equals: [] } },
      ];
      if (user.state) regionFilters.push({ regions: { has: user.state } });
      if (user.territory) regionFilters.push({ regions: { has: user.territory } });
      where.OR = regionFilters;
    }

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    if (query.category) {
      where.category = query.category;
    }

    return paginate(
      this.prisma.product as Parameters<typeof paginate>[0],
      {
        where,
        orderBy: { createdAt: 'desc' },
        include: { variants: { where: { isActive: true, deletedAt: null } } },
      },
      { page: query.page, pageSize: query.pageSize },
    ) as Promise<PaginatedResult<Product>>;
  }

  async findOne(id: string): Promise<Product & { variants: ProductVariant[] }> {
    const product = await this.prisma.product.findUnique({
      where: { id, deletedAt: null },
      include: { variants: { where: { deletedAt: null } } },
    });
    if (!product) throw Errors.NOT_FOUND('Product not found');
    return product as Product & { variants: ProductVariant[] };
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    try {
      return await this.prisma.product.update({
        where: { id },
        data: dto as Prisma.ProductUpdateInput,
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw Errors.NOT_FOUND('Product not found');
      }
      throw err;
    }
  }

  async deactivate(id: string): Promise<Product> {
    return this.prisma.product.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
  }

  async createVariant(
    productId: string,
    dto: CreateVariantDto,
  ): Promise<ProductVariant> {
    try {
      return await this.prisma.productVariant.create({
        data: {
          productId,
          sku: dto.sku,
          unit: dto.unit,
          price: dto.price,
          priceEffectiveFrom: dto.priceEffectiveFrom
            ? new Date(dto.priceEffectiveFrom)
            : undefined,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw Errors.SKU_EXISTS();
      }
      throw err;
    }
  }

  async updateVariant(variantId: string, dto: UpdateVariantDto): Promise<ProductVariant> {
    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: {
        ...(dto.sku !== undefined && { sku: dto.sku }),
        ...(dto.unit !== undefined && { unit: dto.unit }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.priceEffectiveFrom !== undefined && {
          priceEffectiveFrom: new Date(dto.priceEffectiveFrom),
        }),
      },
    });
  }

  async deactivateVariant(variantId: string): Promise<ProductVariant> {
    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: { isActive: false, deletedAt: new Date() },
    });
  }

  async importProducts(
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

      try {
        await this.prisma.product.create({
          data: {
            name: row['name'] as string,
            category: row['category'] as string | undefined,
            description: row['description'] as string | undefined,
            imageUrl: row['imageUrl'] as string | undefined,
            regions: [],
          },
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

  getImportTemplate(): Record<string, string> {
    return {
      columns: 'name, category, description, imageUrl',
      example_name: 'My Product',
      example_category: 'Beverages',
      example_description: 'Product description',
      example_imageUrl: 'https://example.com/image.png',
    };
  }
}
