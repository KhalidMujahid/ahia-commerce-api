import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  DeliveryCompany,
  Prisma,
  RiderStatus,
  UserRole,
} from '@prisma/client';
import { Model } from 'mongoose';
import {
  DeliveryAssignmentResponseDto,
  CompanyAssignRiderDto,
  CompanyOrdersQueryDto,
  DeliveryCompaniesQueryDto,
  DeliveryRidersQueryDto,
  ManualAssignDeliveryDto,
  OnboardDeliveryCompanyDto,
  CreateMyDeliveryRiderDto,
  UpdateDeliveryStatusDto,
  CreateDeliveryCompanyDto,
  CreateDeliveryRiderDto,
  UpdateDeliveryCompanyDto,
  UpdateDeliveryRiderDto,
} from './dto/delivery.dto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  DeliveryStatus,
  DeliveryType,
  Order,
  OrderDocument,
  OrderStatus,
} from '../database/mongo/schemas/order.schema';

type CoverageArea = {
  country?: string;
  state?: string;
  city?: string;
};

@Injectable()
export class DeliveryService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async assignDelivery(
    orderId: string,
    actor: { userId: string; role: string; vendorId?: string },
    manualAssignment?: ManualAssignDeliveryDto,
  ): Promise<DeliveryAssignmentResponseDto> {
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (actor.role === 'VENDOR') {
      if (!actor.vendorId) {
        throw new BadRequestException('Vendor account is required');
      }

      const belongsToVendor = order.vendorOrders.some(
        (vendorOrder) => vendorOrder.vendorId.toString() === actor.vendorId,
      );

      if (!belongsToVendor) {
        throw new BadRequestException('Order does not belong to this vendor');
      }
    }

    if (
      order.deliveryAssignment &&
      order.deliveryStatus &&
      ![DeliveryStatus.CANCELLED, DeliveryStatus.DELAYED].includes(
        order.deliveryStatus,
      ) &&
      !manualAssignment
    ) {
      return this.buildAssignmentResponse(order);
    }

    const vendors = await this.getOrderVendors(order);
    const deliveryType = this.determineDeliveryType(order, vendors);
    const destination = this.normalizeLocation(order.shippingAddress);
    const manualRider = manualAssignment?.riderId
      ? await this.getDeliveryRiderOrFail(manualAssignment.riderId)
      : undefined;

    const candidateCompanies = manualAssignment?.companyId
      ? [await this.getDeliveryCompanyOrFail(manualAssignment.companyId)]
      : manualRider
        ? [await this.getDeliveryCompanyOrFail(manualRider.companyId)]
      : await this.findCandidateCompanies(destination, deliveryType);

    if (!candidateCompanies.length) {
      await this.markDeliveryDelayed(
        order,
        'No delivery company is currently available for this destination.',
      );

      throw new BadRequestException(
        'No delivery company is currently available for this destination',
      );
    }

    const rankedCompanies = await this.rankCompanies(
      candidateCompanies,
      destination,
      deliveryType,
    );
    const selectedCompany = rankedCompanies[0];

    let rider:
      | (Prisma.DeliveryRiderGetPayload<{ include: { company: true } }> & {
          score?: number;
        })
      | undefined;

    if (deliveryType === DeliveryType.LOCAL) {
      rider = manualRider
        ? { ...manualRider, score: manualRider.rating * 50 }
        : await this.findBestRider(selectedCompany.id, destination);

      if (!rider) {
        const fallbackCompany = await this.findFallbackCompanyWithAvailableRider(
          rankedCompanies.slice(1),
          destination,
        );

        if (fallbackCompany) {
          rider = fallbackCompany.rider;
          rankedCompanies[0] = fallbackCompany.company;
        } else {
          await this.markDeliveryDelayed(
            order,
            'No rider is currently available. Assignment delayed for automatic retry.',
          );

          throw new BadRequestException(
            'No rider is currently available for this local delivery',
          );
        }
      }
    }

    const winningCompany = rankedCompanies[0];
    const estimatedDeliveryTime = this.estimateDeliveryWindow(
      winningCompany.averageDeliveryHours,
      deliveryType,
    );
    const now = new Date();

    order.deliveryType = deliveryType;
    order.deliveryStatus = DeliveryStatus.ASSIGNED;
    order.deliveryAssignment = {
      companyId: winningCompany.id,
      companyName: winningCompany.name,
      riderId: rider?.id,
      riderName: rider?.name,
      deliveryType,
      status: DeliveryStatus.ASSIGNED,
      estimatedDeliveryTime,
      companyScore: winningCompany.score,
      riderScore: rider?.score || 0,
      assignedAt: now,
      lastUpdatedAt: now,
      notes: manualAssignment ? 'Manually overridden by admin' : undefined,
    } as any;
    order.status = OrderStatus.ASSIGNED;
    order.timeline.push({
      status: OrderStatus.ASSIGNED,
      date: now,
      description: rider
        ? `Assigned to ${winningCompany.name} and rider ${rider.name}`
        : `Assigned to ${winningCompany.name}`,
    });

    await order.save();

    if (rider) {
      await this.prisma.deliveryRider.update({
        where: { id: rider.id },
        data: {
          currentStatus: RiderStatus.BUSY,
          currentWorkload: { increment: 1 },
        },
      });
    }

    await this.notificationsService.notifyDeliveryAssigned(
      order.userId.toString(),
      order.id,
      winningCompany.name,
      rider?.name,
    );

    return this.buildAssignmentResponse(order);
  }

  async updateDeliveryStatus(orderId: string, dto: UpdateDeliveryStatusDto) {
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!order.deliveryAssignment) {
      throw new BadRequestException('Order has no delivery assignment');
    }

    order.deliveryStatus = dto.status;
    order.deliveryAssignment.status = dto.status;
    order.deliveryAssignment.lastUpdatedAt = new Date();
    if (dto.note) {
      order.deliveryAssignment.notes = dto.note;
    }

    if (dto.status === DeliveryStatus.IN_TRANSIT) {
      order.status = OrderStatus.IN_TRANSIT;
    }

    if (dto.status === DeliveryStatus.DELIVERED) {
      order.status = OrderStatus.DELIVERED;
      order.deliveredAt = new Date();
    }

    if (dto.status === DeliveryStatus.CANCELLED) {
      order.status = OrderStatus.CANCELLED;
      order.cancelledAt = new Date();
    }

    order.timeline.push({
      status: order.status,
      date: new Date(),
      description: `Delivery status updated to ${dto.status}`,
      note: dto.note,
    });

    await order.save();

    if (
      order.deliveryAssignment.riderId &&
      [DeliveryStatus.DELIVERED, DeliveryStatus.CANCELLED].includes(dto.status)
    ) {
      await this.prisma.deliveryRider.update({
        where: { id: order.deliveryAssignment.riderId },
        data: {
          currentStatus: RiderStatus.AVAILABLE,
          currentWorkload: { decrement: 1 },
        },
      });
    }

    await this.notificationsService.notifyDeliveryStatusChanged(
      order.userId.toString(),
      order.id,
      dto.status,
      order.deliveryAssignment.riderName,
    );

    return order;
  }

  async getDeliveryDetails(orderId: string) {
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      orderId: order.id,
      deliveryType: order.deliveryType,
      deliveryStatus: order.deliveryStatus || DeliveryStatus.PENDING,
      assignment: order.deliveryAssignment || null,
    };
  }

  async createCompany(dto: CreateDeliveryCompanyDto) {
    throw new BadRequestException(
      'Admin company creation must specify an owner. Use onboarding flow instead.',
    );
  }

  async createCompanyAsAdmin(ownerUserId: string, dto: CreateDeliveryCompanyDto) {
    await this.ensureUserCanOwnCompany(ownerUserId);

    const company = await this.prisma.deliveryCompany.create({
      data: {
        ownerUserId,
        ...dto,
        coverageAreas: dto.coverageAreas as unknown as Prisma.InputJsonValue,
      },
    });

    await this.promoteUserToDeliveryCompany(ownerUserId);

    return company;
  }

  async updateCompany(id: string, dto: UpdateDeliveryCompanyDto) {
    await this.getDeliveryCompanyOrFail(id);

    return this.prisma.deliveryCompany.update({
      where: { id },
      data: {
        ...dto,
        coverageAreas: dto.coverageAreas as unknown as
          | Prisma.InputJsonValue
          | undefined,
      },
    });
  }

  async listCompanies(query: DeliveryCompaniesQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.DeliveryCompanyWhereInput = {
      ...(typeof query.active === 'boolean' ? { active: query.active } : {}),
      ...(query.search
        ? {
            name: {
              contains: query.search,
              mode: 'insensitive',
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.deliveryCompany.findMany({
        where,
        skip,
        take: limit,
        include: {
          riders: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.deliveryCompany.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCompany(id: string) {
    return this.getDeliveryCompanyOrFail(id);
  }

  async createRider(dto: CreateDeliveryRiderDto) {
    await this.getDeliveryCompanyOrFail(dto.companyId);

    return this.prisma.deliveryRider.create({
      data: {
        companyId: dto.companyId,
        name: dto.name,
        phone: dto.phone,
        currentStatus: dto.currentStatus || RiderStatus.OFFLINE,
        currentLatitude: dto.currentLocation?.latitude,
        currentLongitude: dto.currentLocation?.longitude,
        coverageAreas: dto.coverageAreas as unknown as
          | Prisma.InputJsonValue
          | undefined,
        rating: dto.rating ?? 0,
        currentWorkload: dto.currentWorkload ?? 0,
        isOnline: dto.isOnline ?? false,
        active: dto.active ?? true,
      },
      include: {
        company: true,
      },
    });
  }

  async updateRider(id: string, dto: UpdateDeliveryRiderDto) {
    const rider = await this.getDeliveryRiderOrFail(id);

    if (dto.companyId && dto.companyId !== rider.companyId) {
      await this.getDeliveryCompanyOrFail(dto.companyId);
    }

    return this.prisma.deliveryRider.update({
      where: { id },
      data: {
        companyId: dto.companyId,
        name: dto.name,
        phone: dto.phone,
        currentStatus: dto.currentStatus,
        currentLatitude: dto.currentLocation?.latitude,
        currentLongitude: dto.currentLocation?.longitude,
        coverageAreas: dto.coverageAreas as unknown as
          | Prisma.InputJsonValue
          | undefined,
        rating: dto.rating,
        currentWorkload: dto.currentWorkload,
        isOnline: dto.isOnline,
        active: dto.active,
      },
      include: {
        company: true,
      },
    });
  }

  async listRiders(query: DeliveryRidersQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.DeliveryRiderWhereInput = {
      ...(query.companyId ? { companyId: query.companyId } : {}),
      ...(query.currentStatus ? { currentStatus: query.currentStatus } : {}),
      ...(typeof query.active === 'boolean' ? { active: query.active } : {}),
      ...(query.search
        ? {
            name: {
              contains: query.search,
              mode: 'insensitive',
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.deliveryRider.findMany({
        where,
        skip,
        take: limit,
        include: {
          company: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.deliveryRider.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getRider(id: string) {
    return this.getDeliveryRiderOrFail(id);
  }

  async onboardCompany(userId: string, dto: OnboardDeliveryCompanyDto) {
    await this.ensureUserCanOwnCompany(userId);

    const company = await this.prisma.deliveryCompany.create({
      data: {
        ownerUserId: userId,
        ...dto,
        coverageAreas: dto.coverageAreas as unknown as Prisma.InputJsonValue,
      },
      include: {
        riders: true,
      },
    });

    await this.promoteUserToDeliveryCompany(userId);

    return company;
  }

  async getMyCompany(userId: string, role?: string) {
    this.ensureDeliveryCompanyRole(role);
    return this.getDeliveryCompanyByOwnerOrFail(userId);
  }

  async updateMyCompany(userId: string, dto: UpdateDeliveryCompanyDto, role?: string) {
    this.ensureDeliveryCompanyRole(role);
    const company = await this.getDeliveryCompanyByOwnerOrFail(userId);
    return this.updateCompany(company.id, dto);
  }

  async getMyCompanyRiders(userId: string, query: DeliveryRidersQueryDto, role?: string) {
    this.ensureDeliveryCompanyRole(role);
    const company = await this.getDeliveryCompanyByOwnerOrFail(userId);
    return this.listRiders({
      ...query,
      companyId: company.id,
    });
  }

  async createMyCompanyRider(userId: string, dto: CreateMyDeliveryRiderDto, role?: string) {
    this.ensureDeliveryCompanyRole(role);
    const company = await this.getDeliveryCompanyByOwnerOrFail(userId);
    return this.createRider({
      ...dto,
      companyId: company.id,
    });
  }

  async updateMyCompanyRider(
    userId: string,
    riderId: string,
    dto: UpdateDeliveryRiderDto,
    role?: string,
  ) {
    this.ensureDeliveryCompanyRole(role);
    const company = await this.getDeliveryCompanyByOwnerOrFail(userId);
    const rider = await this.getDeliveryRiderOrFail(riderId);

    if (rider.companyId !== company.id) {
      throw new BadRequestException('Rider does not belong to your company');
    }

    return this.updateRider(riderId, {
      ...dto,
      companyId: company.id,
    });
  }

  async listMyCompanyOrders(userId: string, query: CompanyOrdersQueryDto, role?: string) {
    this.ensureDeliveryCompanyRole(role);
    const company = await this.getDeliveryCompanyByOwnerOrFail(userId);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      'deliveryAssignment.companyId': company.id,
    };

    if (query.status) {
      filter.deliveryStatus = query.status;
    }

    const [data, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.orderModel.countDocuments(filter),
    ]);

    return {
      company: {
        id: company.id,
        name: company.name,
      },
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMyCompanyOrderDelivery(userId: string, orderId: string, role?: string) {
    this.ensureDeliveryCompanyRole(role);
    const company = await this.getDeliveryCompanyByOwnerOrFail(userId);
    const order = await this.getCompanyOrderOrFail(company.id, orderId);

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      deliveryType: order.deliveryType,
      deliveryStatus: order.deliveryStatus,
      assignment: order.deliveryAssignment,
    };
  }

  async updateMyCompanyOrderDeliveryStatus(
    userId: string,
    orderId: string,
    dto: UpdateDeliveryStatusDto,
    role?: string,
  ) {
    this.ensureDeliveryCompanyRole(role);
    const company = await this.getDeliveryCompanyByOwnerOrFail(userId);
    await this.getCompanyOrderOrFail(company.id, orderId);
    return this.updateDeliveryStatus(orderId, dto);
  }

  async assignRiderForMyCompanyOrder(
    userId: string,
    orderId: string,
    dto: CompanyAssignRiderDto,
    role?: string,
  ) {
    this.ensureDeliveryCompanyRole(role);
    const company = await this.getDeliveryCompanyByOwnerOrFail(userId);
    const order = await this.getCompanyOrderOrFail(company.id, orderId);
    const rider = await this.getDeliveryRiderOrFail(dto.riderId);

    if (rider.companyId !== company.id) {
      throw new BadRequestException('Rider does not belong to your company');
    }

    if (!order.deliveryAssignment) {
      throw new BadRequestException('Order has no delivery assignment');
    }

    order.deliveryAssignment.riderId = rider.id;
    order.deliveryAssignment.riderName = rider.name;
    order.deliveryAssignment.riderScore = rider.rating * 50;
    order.deliveryAssignment.lastUpdatedAt = new Date();
    order.timeline.push({
      status: order.status,
      date: new Date(),
      description: `Rider assigned to ${rider.name}`,
    });
    await order.save();

    await this.prisma.deliveryRider.update({
      where: { id: rider.id },
      data: {
        currentStatus: RiderStatus.BUSY,
        currentWorkload: { increment: 1 },
      },
    });

    return this.buildAssignmentResponse(order);
  }

  private async getOrderVendors(order: OrderDocument) {
    const vendorIds = order.vendorOrders.map((vendorOrder) =>
      vendorOrder.vendorId.toString(),
    );

    return this.prisma.vendor.findMany({
      where: {
        id: {
          in: vendorIds,
        },
      },
      select: {
        id: true,
        storeName: true,
        city: true,
        state: true,
        country: true,
      },
    });
  }

  private determineDeliveryType(
    order: OrderDocument,
    vendors: Array<{ city: string | null; state: string | null }>,
  ) {
    const destination = this.normalizeLocation(order.shippingAddress);
    const allVendorsInSameState = vendors.every(
      (vendor) => this.normalizeString(vendor.state) === destination.state,
    );

    return allVendorsInSameState ? DeliveryType.LOCAL : DeliveryType.INTERSTATE;
  }

  private async findCandidateCompanies(
    destination: CoverageArea,
    deliveryType: DeliveryType,
  ) {
    const companies = await this.prisma.deliveryCompany.findMany({
      where: {
        active: true,
        acceptingOrders: true,
      },
      include: {
        riders: true,
      },
    });

    return companies.filter((company) =>
      this.companyCoversDestination(company, destination, deliveryType),
    );
  }

  private async rankCompanies(
    companies: Array<Prisma.DeliveryCompanyGetPayload<{ include: { riders: true } }>>,
    destination: CoverageArea,
    deliveryType: DeliveryType,
  ) {
    return companies
      .map((company) => {
        const matchingRiders = company.riders.filter(
          (rider) =>
            rider.active &&
            rider.isOnline &&
            rider.currentStatus !== RiderStatus.OFFLINE &&
            this.riderCoversDestination(rider, destination),
        );
        const score =
          company.rating * 40 +
          Math.max(0, 25 - company.averageDeliveryHours) * 2 +
          Math.max(0, 10 - company.baseCost) * 2 +
          (deliveryType === DeliveryType.LOCAL ? matchingRiders.length * 10 : 0);

        return {
          ...company,
          score,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  private async findBestRider(companyId: string, destination: CoverageArea) {
    const riders = await this.prisma.deliveryRider.findMany({
      where: {
        companyId,
        active: true,
        isOnline: true,
        currentStatus: {
          in: [RiderStatus.AVAILABLE, RiderStatus.BUSY],
        },
      },
      include: {
        company: true,
      },
    });

    const rankedRiders = riders
      .filter((rider) => rider.currentStatus === RiderStatus.AVAILABLE)
      .filter((rider) => this.riderCoversDestination(rider, destination))
      .map((rider) => ({
        ...rider,
        score:
          rider.rating * 50 +
          Math.max(0, 10 - rider.currentWorkload) * 5 +
          (rider.currentLatitude !== null && rider.currentLongitude !== null
            ? 10
            : 0),
      }))
      .sort((a, b) => b.score - a.score);

    return rankedRiders[0];
  }

  private async findFallbackCompanyWithAvailableRider(
    companies: Array<Prisma.DeliveryCompanyGetPayload<{ include: { riders: true } }> & { score: number }>,
    destination: CoverageArea,
  ) {
    for (const company of companies) {
      const rider = await this.findBestRider(company.id, destination);
      if (rider) {
        return { company, rider };
      }
    }

    return null;
  }

  private companyCoversDestination(
    company: DeliveryCompany & { coverageAreas: Prisma.JsonValue },
    destination: CoverageArea,
    deliveryType: DeliveryType,
  ) {
    const coverageAreas = this.parseCoverageAreas(company.coverageAreas);

    if (!coverageAreas.length) {
      return false;
    }

    return coverageAreas.some((area) => {
      const stateMatches =
        !area.state || this.normalizeString(area.state) === destination.state;
      const cityMatches =
        !area.city || this.normalizeString(area.city) === destination.city;

      if (deliveryType === DeliveryType.LOCAL) {
        return stateMatches && cityMatches;
      }

      return stateMatches;
    });
  }

  private riderCoversDestination(
    rider: { coverageAreas: Prisma.JsonValue | null; company?: DeliveryCompany | null },
    destination: CoverageArea,
  ) {
    const coverageAreas = this.parseCoverageAreas(rider.coverageAreas);
    if (!coverageAreas.length) {
      return true;
    }

    return coverageAreas.some((area) => {
      const stateMatches =
        !area.state || this.normalizeString(area.state) === destination.state;
      const cityMatches =
        !area.city || this.normalizeString(area.city) === destination.city;
      return stateMatches && cityMatches;
    });
  }

  private normalizeLocation(location: {
    state?: string;
    city?: string;
    country?: string;
  }): CoverageArea {
    return {
      state: this.normalizeString(location.state),
      city: this.normalizeString(location.city),
      country: this.normalizeString(location.country),
    };
  }

  private normalizeString(value?: string | null) {
    return value?.trim().toLowerCase() || undefined;
  }

  private parseCoverageAreas(value: Prisma.JsonValue | null | undefined) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value as CoverageArea[];
  }

  private estimateDeliveryWindow(hours: number, deliveryType: DeliveryType) {
    if (deliveryType === DeliveryType.LOCAL) {
      const minHours = Math.max(1, Math.floor(hours / 2));
      const maxHours = Math.max(minHours + 1, Math.ceil(hours));
      return `${minHours}-${maxHours} hours`;
    }

    const minDays = Math.max(1, Math.floor(hours / 24));
    const maxDays = Math.max(minDays + 1, Math.ceil(hours / 24));
    return `${minDays}-${maxDays} days`;
  }

  private async markDeliveryDelayed(order: OrderDocument, note: string) {
    order.deliveryStatus = DeliveryStatus.DELAYED;
    order.status = OrderStatus.PROCESSING;
    order.timeline.push({
      status: OrderStatus.PROCESSING,
      date: new Date(),
      description: 'Delivery assignment delayed',
      note,
    });
    await order.save();
  }

  private buildAssignmentResponse(order: OrderDocument): DeliveryAssignmentResponseDto {
    if (!order.deliveryAssignment || !order.deliveryType) {
      throw new BadRequestException('Order has no delivery assignment');
    }

    return {
      orderId: order.id,
      deliveryType: order.deliveryType,
      assignedCompany: {
        id: order.deliveryAssignment.companyId,
        name: order.deliveryAssignment.companyName,
      },
      assignedRider: order.deliveryAssignment.riderId
        ? {
            id: order.deliveryAssignment.riderId,
            name: order.deliveryAssignment.riderName,
          }
        : undefined,
      estimatedDeliveryTime: order.deliveryAssignment.estimatedDeliveryTime,
      status: order.deliveryAssignment.status,
    };
  }

  private async getDeliveryCompanyOrFail(id: string) {
    const company = await this.prisma.deliveryCompany.findUnique({
      where: { id },
      include: {
        riders: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Delivery company not found');
    }

    return company;
  }

  private async getDeliveryCompanyByOwnerOrFail(userId: string) {
    const company = await this.prisma.deliveryCompany.findUnique({
      where: { ownerUserId: userId },
      include: {
        riders: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Delivery company profile not found');
    }

    return company;
  }

  private async getDeliveryRiderOrFail(id: string) {
    const rider = await this.prisma.deliveryRider.findUnique({
      where: { id },
      include: {
        company: true,
      },
    });

    if (!rider) {
      throw new NotFoundException('Delivery rider not found');
    }

    return rider;
  }

  private async getCompanyOrderOrFail(companyId: string, orderId: string) {
    const order = await this.orderModel.findOne({
      _id: orderId,
      'deliveryAssignment.companyId': companyId,
    });

    if (!order) {
      throw new NotFoundException('Assigned order not found for your company');
    }

    return order;
  }

  private async ensureUserCanOwnCompany(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, ownedDeliveryCompany: { select: { id: true } } },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.ownedDeliveryCompany) {
      throw new BadRequestException('User already owns a delivery company');
    }
  }

  private async promoteUserToDeliveryCompany(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { role: UserRole.DELIVERY_COMPANY },
    });
  }

  private ensureDeliveryCompanyRole(role?: string) {
    const allowedRoles: string[] = [
      UserRole.DELIVERY_COMPANY,
      UserRole.ADMIN,
      UserRole.SUPER_ADMIN,
    ];

    if (
      role &&
      !allowedRoles.includes(role)
    ) {
      throw new ForbiddenException(
        'Only delivery company accounts can manage delivery company operations',
      );
    }
  }
}
