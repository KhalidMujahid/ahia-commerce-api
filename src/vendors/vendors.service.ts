import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendorDto, UpdateVendorDto, SubmitKYCDto, VendorQueryDto } from './dto/vendor.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VendorsService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async create(userId: string, createVendorDto: CreateVendorDto) {
    const existingVendor = await this.prisma.vendor.findUnique({
      where: { userId },
    });

    if (existingVendor) {
      throw new ConflictException('You already have a vendor account');
    }

    const storeSlug = this.generateSlug(createVendorDto.storeName);

    const vendor = await this.prisma.vendor.create({
      data: {
        userId,
        storeName: createVendorDto.storeName,
        storeSlug,
        storeDescription: createVendorDto.storeDescription,
        storeLogo: createVendorDto.storeLogo,
        storeBanner: createVendorDto.storeBanner,
        businessType: createVendorDto.businessType,
        taxId: createVendorDto.taxId,
        country: createVendorDto.country,
        state: createVendorDto.state,
        city: createVendorDto.city,
        address: createVendorDto.address,
        status: 'PENDING',
        kycStatus: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { role: 'VENDOR' as any },
    });

    return vendor;
  }

  async findById(id: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return vendor;
  }

  async findByUserId(userId: string) {
    return this.prisma.vendor.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });
  }

  async findBySlug(slug: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { storeSlug: slug },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return vendor;
  }

  async update(vendorId: string, userId: string, updateVendorDto: UpdateVendorDto) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    if (vendor.userId !== userId) {
      throw new ForbiddenException('You can only update your own vendor store');
    }

    return this.prisma.vendor.update({
      where: { id: vendorId },
      data: updateVendorDto,
    });
  }

  async submitKYC(vendorId: string, userId: string, kycDto: SubmitKYCDto) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    if (vendor.userId !== userId) {
      throw new ForbiddenException('You can only submit KYC for your own store');
    }

    return this.prisma.vendor.update({
      where: { id: vendorId },
      data: {
        kycDocuments: kycDto.documents,
        kycStatus: 'PENDING' as any,
      },
    });
  }

  async findAll(query: VendorQueryDto) {
    const { page = 1, limit = 20, status, kycStatus, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (kycStatus) {
      where.kycStatus = kycStatus;
    }

    if (search) {
      where.OR = [
        { storeName: { contains: search, mode: 'insensitive' } },
        { storeSlug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [vendors, total] = await Promise.all([
      this.prisma.vendor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.vendor.count({ where }),
    ]);

    return {
      data: vendors,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async verifyVendor(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return this.prisma.vendor.update({
      where: { id: vendorId },
      data: {
        status: 'VERIFIED' as any,
        verifiedAt: new Date(),
      },
    });
  }

  async rejectVendor(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return this.prisma.vendor.update({
      where: { id: vendorId },
      data: {
        status: 'REJECTED' as any,
      },
    });
  }

  async suspendVendor(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return this.prisma.vendor.update({
      where: { id: vendorId },
      data: {
        status: 'SUSPENDED' as any,
      },
    });
  }

  async getVendorProducts(vendorId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { vendorId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          images: {
            orderBy: { isPrimary: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.product.count({ where: { vendorId } }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getVendorStats(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const productCount = await this.prisma.product.count({
      where: { vendorId },
    });

    return {
      totalSales: vendor.totalSales,
      totalOrders: vendor.totalOrders,
      totalProducts: productCount,
      averageRating: vendor.averageRating,
    };
  }

  private generateSlug(name: string): string {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    return `${slug}-${Date.now()}`;
  }
}
