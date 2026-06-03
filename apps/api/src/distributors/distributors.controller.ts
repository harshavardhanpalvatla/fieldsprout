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
  DistributorsService,
  CreateDistributorDto,
  UpdateDistributorDto,
  ApproveDistributorDto,
  FindAllDistributorsQuery,
} from './distributors.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/scope.helper';

@ApiTags('distributors')
@ApiBearerAuth()
@Controller('distributors')
export class DistributorsController {
  constructor(private readonly distributorsService: DistributorsService) {}

  // NOTE: /import must come before /:id routes

  @Post('import')
  @Roles('admin')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  importDistributors(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.distributorsService.importDistributors(file.buffer, user);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDistributorDto) {
    return this.distributorsService.create(user, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('state') state?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const query: FindAllDistributorsQuery = {
      status,
      state,
      search,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    };
    return this.distributorsService.findAll(user, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.distributorsService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateDistributorDto,
  ) {
    return this.distributorsService.update(id, user, dto);
  }

  @Post(':id/approve')
  @Roles('admin')
  approve(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ApproveDistributorDto,
  ) {
    return this.distributorsService.approve(id, user, dto);
  }

  @Post(':id/reject')
  @Roles('admin')
  reject(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body('reason') reason: string,
  ) {
    return this.distributorsService.reject(id, user, reason);
  }

  @Post(':id/reassign')
  @Roles('admin')
  reassign(
    @Param('id') id: string,
    @Body('assignedRepId') assignedRepId: string,
  ) {
    return this.distributorsService.reassign(id, assignedRepId);
  }
}
