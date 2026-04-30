import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  DeliveryStatus,
  DeliveryType,
} from '../../database/mongo/schemas/order.schema';
import { RiderStatus } from '@prisma/client';

export class CoverageAreaDto {
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
}

export class CreateDeliveryCompanyDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ type: [CoverageAreaDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoverageAreaDto)
  coverageAreas: CoverageAreaDto[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  acceptingOrders?: boolean;

  @ApiPropertyOptional({ default: 4.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ default: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  averageDeliveryHours?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  baseCost?: number;
}

export class OnboardDeliveryCompanyDto extends CreateDeliveryCompanyDto {}

export class AdminCreateDeliveryCompanyDto extends CreateDeliveryCompanyDto {
  @ApiProperty()
  @IsUUID()
  ownerUserId: string;
}

export class UpdateDeliveryCompanyDto extends PartialType(
  CreateDeliveryCompanyDto,
) {}

export class RiderLocationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;
}

export class CreateDeliveryRiderDto {
  @ApiProperty()
  @IsUUID()
  companyId: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: RiderStatus, default: RiderStatus.OFFLINE })
  @IsOptional()
  @IsEnum(RiderStatus)
  currentStatus?: RiderStatus;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ default: 4.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentWorkload?: number;

  @ApiPropertyOptional({ type: RiderLocationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RiderLocationDto)
  currentLocation?: RiderLocationDto;

  @ApiPropertyOptional({ type: [CoverageAreaDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoverageAreaDto)
  coverageAreas?: CoverageAreaDto[];
}

export class CreateMyDeliveryRiderDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: RiderStatus, default: RiderStatus.OFFLINE })
  @IsOptional()
  @IsEnum(RiderStatus)
  currentStatus?: RiderStatus;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ default: 4.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentWorkload?: number;

  @ApiPropertyOptional({ type: RiderLocationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RiderLocationDto)
  currentLocation?: RiderLocationDto;

  @ApiPropertyOptional({ type: [CoverageAreaDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoverageAreaDto)
  coverageAreas?: CoverageAreaDto[];
}

export class UpdateDeliveryRiderDto extends PartialType(CreateDeliveryRiderDto) {}

export class DeliveryCompaniesQueryDto {
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
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;
}

export class DeliveryRidersQueryDto extends DeliveryCompaniesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional({ enum: RiderStatus })
  @IsOptional()
  @IsEnum(RiderStatus)
  currentStatus?: RiderStatus;
}

export class UpdateDeliveryStatusDto {
  @ApiProperty({ enum: DeliveryStatus })
  @IsEnum(DeliveryStatus)
  status: DeliveryStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class CompanyOrdersQueryDto {
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

  @ApiPropertyOptional({ enum: DeliveryStatus })
  @IsOptional()
  @IsEnum(DeliveryStatus)
  status?: DeliveryStatus;
}

export class CompanyAssignRiderDto {
  @ApiProperty()
  @IsUUID()
  riderId: string;
}

export class ManualAssignDeliveryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  riderId?: string;
}

export class DeliveryAssignmentResponseDto {
  @ApiProperty()
  @IsString()
  orderId: string;

  @ApiProperty({ enum: DeliveryType })
  @IsEnum(DeliveryType)
  deliveryType: DeliveryType;

  @ApiProperty()
  @IsObject()
  assignedCompany: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  assignedRider?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  estimatedDeliveryTime?: string;

  @ApiProperty({ enum: DeliveryStatus })
  @IsEnum(DeliveryStatus)
  status: DeliveryStatus;
}
