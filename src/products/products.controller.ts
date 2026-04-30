import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductVariantDto,
  ProductImageDto,
  ProductSpecificationDto,
  ProductQueryDto,
  CreateCategoryDto,
} from './dto/product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/constants';
import { UserRole } from '../auth/constants';
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { multerOptions } from 'src/vendors/upload.interceptor';
import { S3Service } from 'src/vendors/s3/s3.service';

type MulterS3File = Express.Multer.File & {
  location: string;
  key: string;
  bucket: string;
};

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly s3Service: S3Service,
  ) {}

// ================= CATEGORY ROUTES =================

@Post('categories')
@ApiOperation({ summary: 'Create category' })
async createCategory(@Body() dto: CreateCategoryDto) {
  return this.productsService.createCat(dto);
}

@Get('categories')
@ApiOperation({ summary: 'Get all categories' })
async getCategories() {
  return this.productsService.findAllCategories();
}

 

  // @Get()
  // @ApiOperation({ summary: 'Get all products' })
  // @ApiQuery({ name: 'page', required: false, type: Number })
  // @ApiQuery({ name: 'limit', required: false, type: Number })
  // @ApiQuery({ name: 'search', required: false, type: String })
  // @ApiResponse({ status: 200, description: 'Products retrieved' })
  // async getAllProducts(@Query() query: ProductQueryDto) {
  //   return this.productsService.findAll(query);
  // }

  @Get()
  @ApiOperation({ summary: 'Get all products' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Products retrieved' })
  async getAllProducts(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending products' })
  @ApiResponse({ status: 200, description: 'Trending products retrieved' })
  async getTrendingProducts(@Query('limit') limit?: number) {
    return this.productsService.getTrending(limit || 10);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured products' })
  @ApiResponse({ status: 200, description: 'Featured products retrieved' })
  async getFeaturedProducts(@Query('limit') limit?: number) {
    return this.productsService.getFeatured(limit || 10);
  }

  @Get('new')
  @ApiOperation({ summary: 'Get new arrival products' })
  @ApiResponse({ status: 200, description: 'New arrival products retrieved' })
  async getNewArrivals(@Query('limit') limit?: number) {
    return this.productsService.getNewArrivals(limit || 10);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({ status: 200, description: 'Product retrieved' })
  async getProductById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get product by slug' })
  @ApiResponse({ status: 200, description: 'Product retrieved' })
  async getProductBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create product (Vendor)' })
  @ApiResponse({ status: 201, description: 'Product created' })
  async createProduct(
    @Request() req: any,
    @Body() createProductDto: CreateProductDto,
  ) {
    const vendor = req.user.vendor;
    if (!vendor) {
      throw new Error('You must have a vendor account to create products');
    }
    return this.productsService.create(vendor.id, createProductDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product (Vendor)' })
  @ApiResponse({ status: 200, description: 'Product updated' })
  async updateProduct(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    const vendor = req.user.vendor;
    if (!vendor) {
      throw new Error('You must have a vendor account to update products');
    }
    return this.productsService.update(id, vendor.id, updateProductDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete product (Vendor)' })
  @ApiResponse({ status: 200, description: 'Product deleted' })
  async deleteProduct(@Request() req: any, @Param('id') id: string) {
    const vendor = req.user.vendor;
    if (!vendor) {
      throw new Error('You must have a vendor account to delete products');
    }
    return this.productsService.delete(id, vendor.id);
  }


@Post(':id/images')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiConsumes('multipart/form-data')
@UseInterceptors(
  FileFieldsInterceptor(
    [{ name: 'images', maxCount: 5 }],
    multerOptions(new S3Service().s3),
  ),
)
async addImages(
  @Request() req: any,
  @Param('id') id: string,
  @UploadedFiles() files: { images?: MulterS3File[] },
  @Body() body: any,
) {
  const vendor = req.user.vendor;

  if (!vendor) {
    throw new Error('You must have a vendor account');
  }

  const uploadedImages = files?.images || [];

  if (!uploadedImages.length) {
    throw new BadRequestException('No images uploaded');
  }

  const images = uploadedImages.map((file, index) => ({
    url: file.location,
    isPrimary: body?.primaryIndex
      ? Number(body.primaryIndex) === index
      : index === 0,
    altText: body?.altTexts?.[index] || null,
    sortOrder: index,
  }));

  return this.productsService.addMultipleImages(id, vendor.id, images);
}


  @Post(':id/variants')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add product variant (Vendor)' })
  @ApiResponse({ status: 201, description: 'Variant added' })
  async addVariant(
    @Request() req: any,
    @Param('id') id: string,
    @Body() variantDto: ProductVariantDto,
  ) {
    const vendor = req.user.vendor;
    if (!vendor) {
      throw new Error('You must have a vendor account');
    }
    return this.productsService.addVariant(id, vendor.id, variantDto);
  }

  @Post(':id/specifications')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add product specification (Vendor)' })
  @ApiResponse({ status: 201, description: 'Specification added' })
  async addSpecification(
    @Request() req: any,
    @Param('id') id: string,
    @Body() specDto: ProductSpecificationDto,
  ) {
    const vendor = req.user.vendor;
    if (!vendor) {
      throw new Error('You must have a vendor account');
    }
    return this.productsService.addSpecification(id, vendor.id, specDto);
  }
}
