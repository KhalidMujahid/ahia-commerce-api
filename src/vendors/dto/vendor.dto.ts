import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, IsArray, IsObject, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum VendorStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  SUSPENDED = 'SUSPENDED',
  REJECTED = 'REJECTED',
}

export enum KYCStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export class CreateVendorDto {
  @ApiProperty({ example: 'My Store' })
  @IsString()
  storeName: string;

  @ApiPropertyOptional({ example: 'Electronics, Fashion' })
  @IsOptional()
  @IsString()
  storeDescription?: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png' })
  @IsOptional()
  @IsString()
  storeLogo?: string;

  @ApiPropertyOptional({ example: 'https://example.com/banner.png' })
  @IsOptional()
  @IsString()
  storeBanner?: string;

  @ApiPropertyOptional({ example: 'LLC' })
  @IsOptional()
  @IsString()
  businessType?: string;

  @ApiPropertyOptional({ example: 'TAX-123456' })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({ example: 'Nigeria' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'Lagos' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: 'Lagos' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: '123 Business Ave' })
  @IsOptional()
  @IsString()
  address?: string;
}

export class UpdateVendorDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storeDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storeLogo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storeBanner?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;
}

export class SubmitKYCDto {
  @ApiProperty()
  @IsObject()
  documents: {
    idType?: string;
    idNumber?: string;
    businessLicense?: string;
    taxCertificate?: string;
  };
}

export class VendorQueryDto {
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

  @ApiPropertyOptional({ enum: VendorStatus })
  @IsOptional()
  @IsEnum(VendorStatus)
  status?: VendorStatus;

  @ApiPropertyOptional({ enum: KYCStatus })
  @IsOptional()
  @IsEnum(KYCStatus)
  kycStatus?: KYCStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class VendorStatsResponseDto {
  @ApiProperty()
  totalSales: number;

  @ApiProperty()
  totalOrders: number;

  @ApiProperty()
  totalProducts: number;

  @ApiProperty()
  averageRating: number;

  @ApiProperty()
  pendingOrders: number;

  @ApiProperty()
  processingOrders: number;
}
