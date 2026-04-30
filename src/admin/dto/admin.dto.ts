import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { UserRole } from '../../auth/constants';
import { ProductStatus } from '../../products/dto/product.dto';

export class AdminSalesReportQueryDto {
  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-01-31' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ enum: ['day', 'week', 'month'], default: 'day' })
  @IsOptional()
  @IsEnum(['day', 'week', 'month'] as const)
  groupBy?: 'day' | 'week' | 'month';
}

export class AdminUsersQueryDto {
  @ApiPropertyOptional({ type: Number, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ type: Number, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class AdminUpdateCategoryDto {
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
  image?: string;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sortOrder?: number;
}

export class AdminOrdersQueryDto {
  @ApiPropertyOptional({ type: Number, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ type: Number, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ example: 'pending' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'completed' })
  @IsOptional()
  @IsString()
  paymentStatus?: string;
}

export class AdminUpdateOrderStatusDto {
  @ApiProperty({ example: 'confirmed' })
  @IsString()
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class AdminUpdateOrderPaymentDto {
  @ApiProperty({ example: 'completed' })
  @IsString()
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transactionId?: string;
}

export class AdminReviewsQueryDto {
  @ApiPropertyOptional({ type: Number, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ type: Number, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ example: 'PENDING' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productId?: string;
}

export class AdminRejectReviewDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AdminProductsQueryDto {
  @ApiPropertyOptional({ type: Number, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ type: Number, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({ example: 'price_asc' })
  @IsOptional()
  @IsString()
  sortBy?: string;
}
