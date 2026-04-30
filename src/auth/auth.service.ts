import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, AdminRegisterDto } from './dto/auth.dto';
import { UserRole } from './constants';
import { EmailService } from '../email/email.service';
import { RedisService } from '../cache/redis.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    private redis: RedisService,
  ) {}

  async register(
    registerDto: RegisterDto,
    options: { allowPrivilegedRoles?: boolean } = {},
  ) {
    const { email, username, password, firstName, lastName, phone, role } = registerDto;
    const { allowPrivilegedRoles = false } = options;

    if (
      !allowPrivilegedRoles &&
      role &&
      [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.DELIVERY_COMPANY].includes(role)
    ) {
      throw new ForbiddenException(
        'This role cannot be created from the public registration endpoint',
      );
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email or username already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role: role || UserRole.CUSTOMER,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    try {
      await this.emailService.sendWelcomeEmail(user.email, user.firstName || '');
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      ...tokens,
    };
  }

  async registerAdmin(adminRegisterDto: AdminRegisterDto) {
    const adminRegistrationSecret = this.configService.get<string>(
      'ADMIN_REGISTRATION_SECRET',
    );

    if (!adminRegistrationSecret) {
      throw new ForbiddenException('Admin registration is not configured');
    }

    if (adminRegisterDto.adminSecret !== adminRegistrationSecret) {
      throw new ForbiddenException('Invalid admin registration secret');
    }

    const { adminSecret: _adminSecret, ...payload } = adminRegisterDto;
    return this.register(payload, { allowPrivilegedRoles: true });
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { vendor: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    console.log('User logged in:', user.vendor ? `Vendor ID: ${user.vendor.id}` : 'No vendor');

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        vendor: user.vendor,
      },
      ...tokens,
    };
  }

  async loginAdmin(loginDto: LoginDto) {
    const result = await this.login(loginDto);

    if (
      ![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(
        result.user.role as UserRole,
      )
    ) {
      throw new UnauthorizedException('Admin credentials required');
    }

    return result;
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { vendor: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      vendor: user.vendor,
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { message: 'If the email exists, an OTP will be sent' };
    }

    const otp = this.generateOTP();
    const otpExpiry = 10 * 60; 

    await this.redis.set(`otp:${user.id}`, otp, otpExpiry);

    await this.emailService.sendOTPEmail(user.email, otp, 'password_reset');

    return { message: 'If the email exists, an OTP will be sent' };
  }


  async verifyOTP(userId: string, otp: string): Promise<boolean> {
    const storedOTP = await this.redis.get(`otp:${userId}`);
    
    if (!storedOTP || storedOTP !== otp) {
      return false;
    }

    await this.redis.del(`otp:${userId}`);

    const resetToken = await this.jwtService.signAsync(
      { sub: userId, type: 'password_reset' },
      { secret: this.configService.get<string>('jwt.secret'), expiresIn: 900 },
    );

    await this.redis.set(`reset_token:${userId}`, resetToken, 900);

    return true;
  }

  async resetPassword(userId: string, newPassword: string) {
    const resetToken = await this.redis.get(`reset_token:${userId}`);

    if (!resetToken) {
      throw new BadRequestException('Reset token expired or invalid');
    }

    await this.redis.del(`reset_token:${userId}`);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      await this.emailService.sendPasswordChangedEmail(user.email);
    }

    return { message: 'Password reset successfully' };
  }


  async resendOTP(userId: string, purpose: 'verification' | 'login' | 'password_reset') {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const otp = this.generateOTP();
    const otpExpiry = 10 * 60;

    await this.redis.set(`otp:${user.id}`, otp, otpExpiry);

    await this.emailService.sendOTPEmail(user.email, otp, purpose);

    return { message: 'OTP sent successfully' };
  }

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const tokens = await this.generateTokens(user.id, user.email, user.role);
      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, accessToken: string) {
    const tokenExpiry = this.configService.get<number>('jwt.expiresIn') || 604800;
    await this.redis.set(`blacklist:${accessToken}`, '1', tokenExpiry);

    return { message: 'Logout successful' };
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email, role },
        {
          secret: this.configService.get<string>('jwt.secret'),
          expiresIn: this.configService.get<number>('jwt.expiresIn') || 604800,
        },
      ),
      this.jwtService.signAsync(
        { sub: userId, email, role },
        {
          secret: this.configService.get<string>('jwt.refreshSecret'),
          expiresIn: this.configService.get<number>('jwt.refreshExpiresIn') || 604800 * 7,
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
