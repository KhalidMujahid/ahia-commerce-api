import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  IsObject,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ProductStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DELETED = 'DELETED',
}

export enum ProductType {
  PHYSICAL = 'PHYSICAL',
  DIGITAL = 'DIGITAL',
  SERVICE = 'SERVICE',
}

export class CreateProductDto {
  @ApiProperty({ example: 'iPhone 15 Pro' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiProperty({ type: Number, example: 999.99 })
  @IsNumber()
  priceCurrent: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsNumber()
  priceOld?: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsNumber()
  costPrice?: number;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ type: Number, example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPct?: number;

  @ApiProperty({ enum: ProductType, example: 'PHYSICAL' })
  @IsEnum(ProductType)
  type: ProductType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ type: Number, example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQuantity?: number;

  @ApiPropertyOptional({ type: Number, example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lowStockThreshold?: number;

  @ApiProperty({ type: String })
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metaTitle?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metaDescription?: Record<string, string>;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  metaKeywords?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  weightUnit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dimensions?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isTrending?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isNewArrival?: boolean;
}

// ================= CATEGORY DTO =================

export class CreateCategoryDto {
  @ApiProperty({ example: 'Electronics' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'All electronic items' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://image-url.com/category.jpg' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ example: 'parent-category-uuid' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  priceCurrent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  priceOld?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  costPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  discountPct?: number;

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  stockQuantity?: number;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isTrending?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isNewArrival?: boolean;
}

export class ProductVariantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  priceAdjustment?: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  image?: string;
}

export class ProductImageDto {
  @ApiProperty()
  @IsString()
  url: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  altText?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  // ✅ FIXED PROPERLY
  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class ProductSpecificationDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  value: string;
}

export class ProductQueryDto {
  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({ enum: ProductType })
  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsNumber()
  minPrice?: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsNumber()
  maxPrice?: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsNumber()
  minRating?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isTrending?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  inStock?: boolean;

  @ApiPropertyOptional({ example: 'price_asc' })
  @IsOptional()
  @IsString()
  sortBy?: string;
}
