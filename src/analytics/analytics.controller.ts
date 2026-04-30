import { Controller, Get, Query, Request, UseGuards, Param, SetMetadata } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('admin/dashboard')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get admin dashboard summary' })
  @ApiResponse({ status: 200, description: 'Dashboard summary retrieved' })
  async getAdminDashboard() {
    return this.analyticsService.getAdminDashboard();
  }

  @Get('vendor/analytics')
  @Roles('VENDOR')
  @ApiOperation({ summary: 'Get vendor analytics' })
  @ApiResponse({ status: 200, description: 'Vendor analytics retrieved' })
  async getVendorAnalytics(@Request() req: any) {
    return this.analyticsService.getVendorAnalytics(req.user.vendorId);
  }

  @Get('vendor/sales-report')
  @Roles('VENDOR')
  @ApiOperation({ summary: 'Get vendor sales report' })
  @ApiResponse({ status: 200, description: 'Sales report retrieved' })
  async getVendorSalesReport(
    @Request() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('groupBy') groupBy: 'day' | 'week' | 'month' = 'day',
  ) {
    return this.analyticsService.getSalesReport(
      new Date(startDate),
      new Date(endDate),
      groupBy,
    );
  }

  @Get('sales-report')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get sales report' })
  @ApiResponse({ status: 200, description: 'Sales report retrieved' })
  async getSalesReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('groupBy') groupBy: 'day' | 'week' | 'month' = 'day',
  ) {
    return this.analyticsService.getSalesReport(
      new Date(startDate),
      new Date(endDate),
      groupBy,
    );
  }

  @Get('products/:id')
  @Roles('VENDOR', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get product analytics' })
  @ApiResponse({ status: 200, description: 'Product analytics retrieved' })
  async getProductAnalytics(@Param('id') productId: string) {
    return this.analyticsService.getProductAnalytics(productId);
  }

  @Get('system/health')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get system health metrics' })
  @ApiResponse({ status: 200, description: 'System health retrieved' })
  async getSystemHealth() {
    return this.analyticsService.getSystemHealth();
  }
}
