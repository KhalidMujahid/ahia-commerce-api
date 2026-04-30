import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from '../users/users.service';
import { VendorsService } from '../vendors/vendors.service';
import { CategoriesService } from '../categories/categories.service';
import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';
import { ReviewsService } from '../reviews/reviews.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { DeliveryService } from '../delivery/delivery.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, UserRole } from '../auth/constants';
import { VendorQueryDto } from '../vendors/dto/vendor.dto';
import {
  CreateCategoryDto,
  UpdateProductDto,
} from '../products/dto/product.dto';
import {
  AdminOrdersQueryDto,
  AdminProductsQueryDto,
  AdminRejectReviewDto,
  AdminReviewsQueryDto,
  AdminSalesReportQueryDto,
  AdminUpdateCategoryDto,
  AdminUpdateOrderPaymentDto,
  AdminUpdateOrderStatusDto,
  AdminUsersQueryDto,
} from './dto/admin.dto';
import {
  AdminCreateDeliveryCompanyDto,
  CreateDeliveryCompanyDto,
  CreateDeliveryRiderDto,
  DeliveryCompaniesQueryDto,
  DeliveryRidersQueryDto,
  ManualAssignDeliveryDto,
  UpdateDeliveryCompanyDto,
  UpdateDeliveryRiderDto,
  UpdateDeliveryStatusDto,
} from '../delivery/dto/delivery.dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly usersService: UsersService,
    private readonly vendorsService: VendorsService,
    private readonly categoriesService: CategoriesService,
    private readonly productsService: ProductsService,
    private readonly ordersService: OrdersService,
    private readonly reviewsService: ReviewsService,
    private readonly analyticsService: AnalyticsService,
    private readonly deliveryService: DeliveryService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard retrieved' })
  async getDashboard() {
    return this.analyticsService.getAdminDashboard();
  }

  @Get('health')
  @ApiOperation({ summary: 'Get system health' })
  @ApiResponse({ status: 200, description: 'System health retrieved' })
  async getHealth() {
    return this.analyticsService.getSystemHealth();
  }

  @Get('sales-report')
  @ApiOperation({ summary: 'Get platform sales report' })
  @ApiResponse({ status: 200, description: 'Sales report retrieved' })
  async getSalesReport(@Query() query: AdminSalesReportQueryDto) {
    return this.analyticsService.getSalesReport(
      new Date(query.startDate),
      new Date(query.endDate),
      query.groupBy || 'day',
    );
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Users retrieved' })
  async getUsers(@Query() query: AdminUsersQueryDto) {
    return this.usersService.getAllUsers(
      query.page || 1,
      query.limit || 20,
      query.role,
    );
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by ID' })
  async getUser(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Put('users/:id/activate')
  @ApiOperation({ summary: 'Activate user' })
  async activateUser(@Param('id') id: string) {
    return this.usersService.activateUser(id);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Deactivate user' })
  async deactivateUser(@Param('id') id: string) {
    return this.usersService.deactivateUser(id);
  }

  @Get('vendors')
  @ApiOperation({ summary: 'Get all vendors' })
  async getVendors(@Query() query: VendorQueryDto) {
    return this.vendorsService.findAll(query);
  }

  @Get('vendors/:id')
  @ApiOperation({ summary: 'Get vendor by ID' })
  async getVendor(@Param('id') id: string) {
    return this.vendorsService.findById(id);
  }

  @Put('vendors/:id/verify')
  @ApiOperation({ summary: 'Verify vendor' })
  async verifyVendor(@Param('id') id: string) {
    return this.vendorsService.verifyVendor(id);
  }

  @Put('vendors/:id/reject')
  @ApiOperation({ summary: 'Reject vendor' })
  async rejectVendor(@Param('id') id: string) {
    return this.vendorsService.rejectVendor(id);
  }

  @Put('vendors/:id/suspend')
  @ApiOperation({ summary: 'Suspend vendor' })
  async suspendVendor(@Param('id') id: string) {
    return this.vendorsService.suspendVendor(id);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all categories' })
  async getCategories() {
    return this.categoriesService.findAll();
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create category' })
  async createCategory(@Body() data: CreateCategoryDto) {
    return this.categoriesService.create(data);
  }

  @Put('categories/:id')
  @ApiOperation({ summary: 'Update category' })
  async updateCategory(@Param('id') id: string, @Body() data: AdminUpdateCategoryDto) {
    return this.categoriesService.update(id, data);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete category' })
  async deleteCategory(@Param('id') id: string) {
    return this.categoriesService.delete(id);
  }

  @Get('products')
  @ApiOperation({ summary: 'Get all products for admin management' })
  @ApiResponse({ status: 200, description: 'Products retrieved' })
  async getProducts(@Query() query: AdminProductsQueryDto) {
    return this.productsService.findAllForAdmin(query);
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get product by ID' })
  async getProduct(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Put('products/:id')
  @ApiOperation({ summary: 'Update product as admin' })
  async updateProduct(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.adminUpdate(id, updateProductDto);
  }

  @Delete('products/:id')
  @ApiOperation({ summary: 'Delete product as admin' })
  async deleteProduct(@Param('id') id: string) {
    return this.productsService.adminDelete(id);
  }

  @Get('orders')
  @ApiOperation({ summary: 'Get all orders' })
  @ApiResponse({ status: 200, description: 'Orders retrieved' })
  async getOrders(@Query() query: AdminOrdersQueryDto) {
    return this.ordersService.findAllOrders(
      query.page || 1,
      query.limit || 20,
      query.status,
      query.paymentStatus,
    );
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get order by ID' })
  async getOrder(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @Put('orders/:id/status')
  @ApiOperation({ summary: 'Update order status as admin' })
  async updateOrderStatus(@Param('id') id: string, @Body() data: AdminUpdateOrderStatusDto) {
    return this.ordersService.updateStatus(
      id,
      data.status as any,
      undefined,
      data.note,
    );
  }

  @Put('orders/:id/payment')
  @ApiOperation({ summary: 'Update order payment status as admin' })
  async updateOrderPayment(@Param('id') id: string, @Body() data: AdminUpdateOrderPaymentDto) {
    return this.ordersService.updatePaymentStatus(
      id,
      data.status as any,
      data.transactionId,
    );
  }

  @Post('orders/:id/assign-delivery')
  @ApiOperation({ summary: 'Assign delivery to an order as admin' })
  async assignDeliveryToOrder(
    @Param('id') id: string,
    @Body() data: ManualAssignDeliveryDto,
  ) {
    return this.deliveryService.assignDelivery(
      id,
      { userId: 'admin', role: UserRole.ADMIN },
      data.companyId || data.riderId ? data : undefined,
    );
  }

  @Get('orders/:id/delivery')
  @ApiOperation({ summary: 'Get order delivery details as admin' })
  async getOrderDelivery(@Param('id') id: string) {
    return this.deliveryService.getDeliveryDetails(id);
  }

  @Put('orders/:id/delivery-status')
  @ApiOperation({ summary: 'Update delivery status as admin' })
  async updateDeliveryStatus(
    @Param('id') id: string,
    @Body() data: UpdateDeliveryStatusDto,
  ) {
    return this.deliveryService.updateDeliveryStatus(id, data);
  }

  @Get('delivery/companies')
  @ApiOperation({ summary: 'List delivery companies' })
  async getDeliveryCompanies(@Query() query: DeliveryCompaniesQueryDto) {
    return this.deliveryService.listCompanies(query);
  }

  @Post('delivery/companies')
  @ApiOperation({ summary: 'Create delivery company' })
  async createDeliveryCompany(@Body() data: AdminCreateDeliveryCompanyDto) {
    return this.deliveryService.createCompanyAsAdmin(data.ownerUserId, data);
  }

  @Get('delivery/companies/:id')
  @ApiOperation({ summary: 'Get delivery company' })
  async getDeliveryCompany(@Param('id') id: string) {
    return this.deliveryService.getCompany(id);
  }

  @Put('delivery/companies/:id')
  @ApiOperation({ summary: 'Update delivery company' })
  async updateDeliveryCompany(
    @Param('id') id: string,
    @Body() data: UpdateDeliveryCompanyDto,
  ) {
    return this.deliveryService.updateCompany(id, data);
  }

  @Get('delivery/riders')
  @ApiOperation({ summary: 'List delivery riders' })
  async getDeliveryRiders(@Query() query: DeliveryRidersQueryDto) {
    return this.deliveryService.listRiders(query);
  }

  @Post('delivery/riders')
  @ApiOperation({ summary: 'Create delivery rider' })
  async createDeliveryRider(@Body() data: CreateDeliveryRiderDto) {
    return this.deliveryService.createRider(data);
  }

  @Get('delivery/riders/:id')
  @ApiOperation({ summary: 'Get delivery rider' })
  async getDeliveryRider(@Param('id') id: string) {
    return this.deliveryService.getRider(id);
  }

  @Put('delivery/riders/:id')
  @ApiOperation({ summary: 'Update delivery rider' })
  async updateDeliveryRider(
    @Param('id') id: string,
    @Body() data: UpdateDeliveryRiderDto,
  ) {
    return this.deliveryService.updateRider(id, data);
  }

  @Get('reviews')
  @ApiOperation({ summary: 'Get all reviews for moderation' })
  @ApiResponse({ status: 200, description: 'Reviews retrieved' })
  async getReviews(@Query() query: AdminReviewsQueryDto) {
    return this.reviewsService.findAllForAdmin(
      query.page || 1,
      query.limit || 20,
      query.status,
      query.productId,
    );
  }

  @Put('reviews/:id/approve')
  @ApiOperation({ summary: 'Approve review' })
  async approveReview(@Param('id') id: string) {
    return this.reviewsService.updateStatus(id, 'APPROVED');
  }

  @Put('reviews/:id/reject')
  @ApiOperation({ summary: 'Reject review' })
  async rejectReview(@Param('id') id: string, @Body() data: AdminRejectReviewDto) {
    return this.reviewsService.updateStatus(id, 'REJECTED', data.reason);
  }
}
