import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import {
  ProductsService,
  CreateProductDto,
  UpdateProductDto,
  CreateVariantDto,
  UpdateVariantDto,
  FindAllProductsQuery,
} from './products.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/scope.helper';

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // NOTE: /import-template and /import must come before /:id routes

  @Get('import-template')
  getImportTemplate() {
    return this.productsService.getImportTemplate();
  }

  @Post('import')
  @Roles('admin', 'warehouse_mgr')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  importProducts(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.productsService.importProducts(file.buffer, user);
  }

  @Post()
  @Roles('admin', 'warehouse_mgr')
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const query: FindAllProductsQuery = {
      category,
      search,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    };
    return this.productsService.findAll(user, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin', 'warehouse_mgr')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Post(':id/deactivate')
  @Roles('admin', 'warehouse_mgr')
  deactivate(@Param('id') id: string) {
    return this.productsService.deactivate(id);
  }

  @Post(':id/variants')
  @Roles('admin', 'warehouse_mgr')
  createVariant(
    @Param('id') productId: string,
    @Body() dto: CreateVariantDto,
  ) {
    return this.productsService.createVariant(productId, dto);
  }
}

// Variants sub-controller (separate path prefix /variants)
@ApiTags('products')
@ApiBearerAuth()
@Controller('variants')
export class VariantsController {
  constructor(private readonly productsService: ProductsService) {}

  @Patch(':id')
  @Roles('admin', 'warehouse_mgr')
  updateVariant(@Param('id') variantId: string, @Body() dto: UpdateVariantDto) {
    return this.productsService.updateVariant(variantId, dto);
  }

  @Post(':id/deactivate')
  @Roles('admin', 'warehouse_mgr')
  deactivateVariant(@Param('id') variantId: string) {
    return this.productsService.deactivateVariant(variantId);
  }
}
