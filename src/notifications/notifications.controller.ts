import { Controller, Get, Put, Delete, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/constants';
import { UserRole } from '../auth/constants';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved' })
  async findAll(@Request() req: any, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.notificationsService.findByUserId(req.user.id, page || 1, limit || 20);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Count retrieved' })
  async getUnreadCount(@Request() req: any) {
    return this.notificationsService.getUnreadCount(req.user.id);
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(@Request() req: any, @Param('id') id: string) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@Request() req: any) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.notificationsService.delete(id, req.user.id);
  }

  @Post('broadcast')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Broadcast notification to all users (Admin)' })
  @ApiResponse({ status: 201, description: 'Notification broadcasted' })
  async broadcast(@Body() data: { title: string; message: string; data?: Record<string, any> }) {
    return this.notificationsService.broadcast(data.title, data.message, data.data);
  }
}
