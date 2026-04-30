import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, UserRole } from '../auth/constants';
import { DeliveryService } from './delivery.service';
import {
  CompanyAssignRiderDto,
  CompanyOrdersQueryDto,
  CreateMyDeliveryRiderDto,
  DeliveryRidersQueryDto,
  OnboardDeliveryCompanyDto,
  UpdateDeliveryCompanyDto,
  UpdateDeliveryRiderDto,
  UpdateDeliveryStatusDto,
} from './dto/delivery.dto';

@ApiTags('Delivery Companies')
@Controller('delivery-companies')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Post('onboard')
  @ApiOperation({ summary: 'Onboard a delivery company' })
  @ApiResponse({ status: 201, description: 'Delivery company onboarded' })
  async onboardCompany(
    @Request() req: any,
    @Body() data: OnboardDeliveryCompanyDto,
  ) {
    return this.deliveryService.onboardCompany(req.user.id, data);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DELIVERY_COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get my delivery company profile' })
  @ApiResponse({ status: 200, description: 'Delivery company retrieved' })
  async getMyCompany(@Request() req: any) {
    return this.deliveryService.getMyCompany(req.user.id, req.user.role);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DELIVERY_COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update my delivery company profile' })
  @ApiResponse({ status: 200, description: 'Delivery company updated' })
  async updateMyCompany(
    @Request() req: any,
    @Body() data: UpdateDeliveryCompanyDto,
  ) {
    return this.deliveryService.updateMyCompany(req.user.id, data, req.user.role);
  }

  @Get('me/riders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DELIVERY_COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List my company riders' })
  async getMyRiders(@Request() req: any, @Query() query: DeliveryRidersQueryDto) {
    return this.deliveryService.getMyCompanyRiders(
      req.user.id,
      query,
      req.user.role,
    );
  }

  @Post('me/riders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DELIVERY_COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create rider for my company' })
  async createMyRider(
    @Request() req: any,
    @Body() data: CreateMyDeliveryRiderDto,
  ) {
    return this.deliveryService.createMyCompanyRider(
      req.user.id,
      data,
      req.user.role,
    );
  }

  @Put('me/riders/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DELIVERY_COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update rider for my company' })
  async updateMyRider(
    @Request() req: any,
    @Param('id') riderId: string,
    @Body() data: UpdateDeliveryRiderDto,
  ) {
    return this.deliveryService.updateMyCompanyRider(
      req.user.id,
      riderId,
      data,
      req.user.role,
    );
  }

  @Get('me/orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DELIVERY_COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List orders assigned to my company' })
  async getMyOrders(@Request() req: any, @Query() query: CompanyOrdersQueryDto) {
    return this.deliveryService.listMyCompanyOrders(
      req.user.id,
      query,
      req.user.role,
    );
  }

  @Get('me/orders/:id/delivery')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DELIVERY_COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get assigned order delivery details for my company' })
  async getMyOrderDelivery(@Request() req: any, @Param('id') orderId: string) {
    return this.deliveryService.getMyCompanyOrderDelivery(
      req.user.id,
      orderId,
      req.user.role,
    );
  }

  @Put('me/orders/:id/delivery-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DELIVERY_COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update delivery status for my company order' })
  async updateMyOrderDeliveryStatus(
    @Request() req: any,
    @Param('id') orderId: string,
    @Body() data: UpdateDeliveryStatusDto,
  ) {
    return this.deliveryService.updateMyCompanyOrderDeliveryStatus(
      req.user.id,
      orderId,
      data,
      req.user.role,
    );
  }

  @Put('me/orders/:id/assign-rider')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DELIVERY_COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Assign or reassign rider for my company order' })
  async assignRiderToOrder(
    @Request() req: any,
    @Param('id') orderId: string,
    @Body() data: CompanyAssignRiderDto,
  ) {
    return this.deliveryService.assignRiderForMyCompanyOrder(
      req.user.id,
      orderId,
      data,
      req.user.role,
    );
  }
}
