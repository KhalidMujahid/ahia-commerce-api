import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/constants';
import { UserRole } from '../auth/constants';
import { DeliveryService } from '../delivery/delivery.service';
import { UpdateDeliveryStatusDto } from '../delivery/dto/delivery.dto';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly deliveryService: DeliveryService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new order' })
  @ApiResponse({ status: 201, description: 'Order created' })
  async create(@Request() req: any, @Body() data: {
    items: Array<{ productId: string; variantId?: string; quantity: number }>;
    shippingAddress: any;
    paymentMethod: string;
  }) {
    return this.ordersService.create({
      userId: req.user.id,
      ...data,
    });
  }

  @Get('my-orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my orders' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Orders retrieved' })
  async getMyOrders(@Request() req: any, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.ordersService.findByUserId(req.user.id, page || 1, limit || 20);
  }

  @Get('vendor/orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get vendor orders' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Orders retrieved' })
  async getVendorOrders(@Request() req: any, @Query('page') page?: number, @Query('limit') limit?: number) {
    const vendor = req.user.vendor;
    if (!vendor) {
      throw new Error('You must have a vendor account');
    }
    return this.ordersService.findByVendorId(vendor.id, page || 1, limit || 20);
  }

  @Get('vendor/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get vendor order statistics' })
  @ApiResponse({ status: 200, description: 'Stats retrieved' })
  async getVendorStats(@Request() req: any) {
    const vendor = req.user.vendor;
    if (!vendor) {
      throw new Error('You must have a vendor account');
    }
    return this.ordersService.getVendorOrderStats(vendor.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, description: 'Order retrieved' })
  async getOrderById(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @Get(':id/timeline')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order timeline' })
  @ApiResponse({ status: 200, description: 'Timeline retrieved' })
  async getOrderTimeline(@Param('id') id: string) {
    return this.ordersService.getOrderTimeline(id);
  }

  @Post([':id/assign-delivery', ':id/assignDelivery'])
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign delivery for an order' })
  @ApiResponse({ status: 200, description: 'Delivery assigned' })
  async assignDelivery(@Param('id') id: string, @Request() req: any) {
    return this.deliveryService.assignDelivery(id, {
      userId: req.user.id,
      role: req.user.role,
      vendorId: req.user.vendor?.id,
    });
  }

  @Get(':id/delivery')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get delivery details for an order' })
  @ApiResponse({ status: 200, description: 'Delivery details retrieved' })
  async getDeliveryDetails(@Param('id') id: string) {
    return this.deliveryService.getDeliveryDetails(id);
  }

  @Put(':id/delivery-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update delivery status for an order' })
  @ApiResponse({ status: 200, description: 'Delivery status updated' })
  async updateDeliveryStatus(
    @Param('id') id: string,
    @Body() data: UpdateDeliveryStatusDto,
  ) {
    return this.deliveryService.updateDeliveryStatus(id, data);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update order status' })
  @ApiResponse({ status: 200, description: 'Order status updated' })
  async updateStatus(
    @Param('id') id: string,
    @Body() data: { status: string; note?: string },
    @Request() req: any,
  ) {
    const vendor = req.user.vendor;
    const vendorId = vendor?.id;
    return this.ordersService.updateStatus(id, data.status as any, vendorId, data.note);
  }

  @Put(':id/payment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update payment status' })
  @ApiResponse({ status: 200, description: 'Payment status updated' })
  async updatePaymentStatus(
    @Param('id') id: string,
    @Body() data: { status: string; transactionId?: string },
  ) {
    return this.ordersService.updatePaymentStatus(id, data.status as any, data.transactionId);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel order' })
  @ApiResponse({ status: 200, description: 'Order cancelled' })
  async cancelOrder(@Param('id') id: string, @Body() data: { reason: string }) {
    return this.ordersService.cancelOrder(id, data.reason);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all orders (Admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Orders retrieved' })
  async getAllOrders(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.ordersService.findAllOrders(page || 1, limit || 20);
  }
}
