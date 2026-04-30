import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConflictResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { VendorsService } from './vendors.service';
import {
  CreateVendorDto,
  UpdateVendorDto,
  SubmitKYCDto,
  VendorQueryDto,
} from './dto/vendor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/constants';
import { UserRole } from '../auth/constants';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { S3Service } from './s3/s3.service';
import { multerOptions } from './upload.interceptor';

interface MulterS3File extends Express.Multer.File {
  location: string;
}

@ApiTags('Vendors')
@Controller('vendors')
export class VendorsController {
  constructor(
    private readonly vendorsService: VendorsService,
    private readonly s3Service: S3Service,
  ) {}

  @Get(':slug')
  @ApiOperation({ summary: 'Get vendor by store slug' })
  @ApiResponse({ status: 200, description: 'Vendor retrieved' })
  async getVendorBySlug(@Param('slug') slug: string) {
    return this.vendorsService.findBySlug(slug);
  }

  @Get(':id/products')
  @ApiOperation({ summary: 'Get vendor products' })
  @ApiResponse({ status: 200, description: 'Products retrieved' })
  async getVendorProducts(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.vendorsService.getVendorProducts(id, page || 1, limit || 20);
  }

  @ApiConsumes('multipart/form-data')
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'storeLogo', maxCount: 1 },
        { name: 'storeBanner', maxCount: 1 },
      ],
      multerOptions(new S3Service().s3), // works fine for dev
    ),
  )
  async create(
    @Request() req: any,
    @Body() createVendorDto: any,
    @UploadedFiles()
    files: {
      storeLogo?: MulterS3File[];
      storeBanner?: MulterS3File[];
    },
  ) {
    const logo = files?.storeLogo?.[0]?.location || null;
    const banner = files?.storeBanner?.[0]?.location || null;

    return this.vendorsService.create(req.user.id, {
      ...createVendorDto,
      storeLogo: logo,
      storeBanner: banner,
    });
  }

  @Get('me/profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my vendor profile' })
  @ApiResponse({ status: 200, description: 'Vendor profile retrieved' })
  async getMyVendorProfile(@Request() req: any) {
    return this.vendorsService.findByUserId(req.user.id);
  }

  @Put('me/profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update my vendor profile' })
  @ApiResponse({ status: 200, description: 'Vendor updated' })
  async updateMyVendorProfile(
    @Request() req: any,
    @Body() updateVendorDto: UpdateVendorDto,
  ) {
    const vendor = await this.vendorsService.findByUserId(req.user.id);
    if (!vendor) {
      throw new Error('Vendor profile not found');
    }
    return this.vendorsService.update(vendor.id, req.user.id, updateVendorDto);
  }

  @Post('me/kyc')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit KYC documents' })
  @ApiResponse({ status: 200, description: 'KYC submitted' })
  async submitKYC(@Request() req: any, @Body() kycDto: SubmitKYCDto) {
    const vendor = await this.vendorsService.findByUserId(req.user.id);
    if (!vendor) {
      throw new Error('Vendor profile not found');
    }
    return this.vendorsService.submitKYC(vendor.id, req.user.id, kycDto);
  }

  @Get('me/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get vendor statistics' })
  @ApiResponse({ status: 200, description: 'Stats retrieved' })
  async getMyVendorStats(@Request() req: any) {
    const vendor = await this.vendorsService.findByUserId(req.user.id);
    if (!vendor) {
      throw new Error('Vendor profile not found');
    }
    return this.vendorsService.getVendorStats(vendor.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all vendors (Admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'kycStatus', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Vendors retrieved' })
  async getAllVendors(@Query() query: VendorQueryDto) {
    return this.vendorsService.findAll(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get vendor by ID (Admin)' })
  @ApiResponse({ status: 200, description: 'Vendor retrieved' })
  async getVendorById(@Param('id') id: string) {
    return this.vendorsService.findById(id);
  }

  @Put(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify vendor (Admin)' })
  @ApiResponse({ status: 200, description: 'Vendor verified' })
  async verifyVendor(@Param('id') id: string) {
    return this.vendorsService.verifyVendor(id);
  }

  @Put(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject vendor (Admin)' })
  @ApiResponse({ status: 200, description: 'Vendor rejected' })
  async rejectVendor(@Param('id') id: string) {
    return this.vendorsService.rejectVendor(id);
  }

  @Put(':id/suspend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Suspend vendor (Admin)' })
  @ApiResponse({ status: 200, description: 'Vendor suspended' })
  async suspendVendor(@Param('id') id: string) {
    return this.vendorsService.suspendVendor(id);
  }
}
