import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../constants';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'username123' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(8)
  password: string;

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

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.CUSTOMER })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class AdminRegisterDto {
  @ApiProperty({ example: 'admin@ahia.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'admin_user' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'StrongPassword123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: 'System' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Admin' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ enum: [UserRole.ADMIN, UserRole.SUPER_ADMIN] })
  @IsEnum([UserRole.ADMIN, UserRole.SUPER_ADMIN] as const)
  role: UserRole.ADMIN | UserRole.SUPER_ADMIN;

  @ApiProperty({ example: 'admin registration secret' })
  @IsString()
  @IsNotEmpty()
  adminSecret: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class VerifyEmailDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class VerifyOtpDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: '6-digit OTP code' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @IsNotEmpty()
  otp: string;
}

export class ResendOtpDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ enum: ['verification', 'login', 'password_reset'], description: 'Purpose of OTP' })
  @IsString()
  @IsNotEmpty()
  purpose: 'verification' | 'login' | 'password_reset';
}
