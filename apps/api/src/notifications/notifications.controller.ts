import { Controller, Get, Patch, Post, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/scope.helper';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('notifications/config')
  @Roles('admin')
  findAllConfigs() {
    return this.notificationsService.findAllConfigs();
  }

  @Patch('notifications/config/:event')
  @Roles('admin')
  updateConfig(
    @Param('event') event: string,
    @CurrentUser() user: AuthUser,
    @Body()
    dto: {
      pushEnabled?: boolean;
      whatsappEnabled?: boolean;
      smsEnabled?: boolean;
      recipient?: string;
    },
  ) {
    return this.notificationsService.updateConfig(event, dto, user.sub);
  }

  @Post('users/me/fcm-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  storeFcmToken(
    @CurrentUser() user: AuthUser,
    @Body('fcmToken') fcmToken: string,
  ) {
    return this.notificationsService.storeFcmToken(user.sub, fcmToken);
  }
}
