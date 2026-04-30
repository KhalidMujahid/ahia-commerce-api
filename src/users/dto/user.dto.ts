import { IsString, IsEmail, IsOptional, IsEnum, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../auth/constants';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsString()
  avatar?: string;
}

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  username: string;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  avatar?: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty()
  isEmailVerified: boolean;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  lastLoginAt?: Date;

  @ApiProperty()
  createdAt: Date;
}

export class AddressDto {
  @ApiProperty({ example: 'shipping' })
  @IsString()
  type: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  company?: string;

  @ApiProperty({ example: '+1234567890' })
  @IsString()
  phone: string;

  @ApiProperty({ example: '123 Main Street' })
  @IsString()
  addressLine1: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiProperty({ example: 'New York' })
  @IsString()
  city: string;

  @ApiProperty({ example: 'NY' })
  @IsString()
  state: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiProperty({ example: 'US' })
  @IsString()
  country: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
