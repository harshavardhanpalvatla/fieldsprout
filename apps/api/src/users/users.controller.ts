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
  UsePipes,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { UsersService, UpdateMeDto, UpdateUserDto, FindAllUsersQuery } from './users.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { createUserSchema } from '@fieldsprout/validation';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/scope.helper';
import { InjectRedis } from '../common/decorators/inject-redis.decorator';
import type { Redis } from 'ioredis';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  // NOTE: /me and /bulk-import must come before /:id to avoid param conflicts

  @Get('me')
  getMe(@CurrentUser() user: AuthUser) {
    return this.usersService.getMe(user.sub);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto) {
    return this.usersService.updateMe(user.sub, dto);
  }

  @Post('bulk-import')
  @Roles('admin')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  bulkImport(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.bulkImport(file.buffer, user);
  }

  @Post()
  @Roles('admin')
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createUserSchema)) dto: Parameters<UsersService['create']>[1],
  ) {
    return this.usersService.create(user, dto);
  }

  @Get()
  @Roles('admin')
  findAll(
    @Query('role') role?: string,
    @Query('state') state?: string,
    @Query('territory') territory?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const query: FindAllUsersQuery = {
      role,
      state,
      territory,
      status,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    };
    return this.usersService.findAll(query);
  }

  @Patch(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Post(':id/deactivate')
  @Roles('admin')
  deactivate(@Param('id') id: string) {
    return this.usersService.deactivate(id, this.redis);
  }
}
