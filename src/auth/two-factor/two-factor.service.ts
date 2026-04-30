import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface TwoFactorSetupResponse {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async setupTwoFactor(userId: string, email: string): Promise<TwoFactorSetupResponse> {
    const speakeasy = require('speakeasy');
    const QRCode = require('qrcode');

    const secret = speakeasy.generateSecret({
      name: `AhiaGlobal (${email})`,
      issuer: 'AhiaGlobal',
      length: 32,
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    const backupCodes = this.generateBackupCodes();

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret.base32,
      },
    });

    this.logger.log(`2FA setup initiated for user ${userId}`);

    return {
      secret: secret.base32,
      qrCode,
      backupCodes,
    };
  }


  async verifyAndEnableTwoFactor(
    userId: string,
    token: string,
  ): Promise<{ success: boolean; message: string }> {
    const speakeasy = require('speakeasy');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorSecret) {
      throw new BadRequestException('2FA not set up for this user');
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!verified) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isTwoFactorEnabled: true,
      },
    });

    this.logger.log(`2FA enabled for user ${userId}`);

    return {
      success: true,
      message: 'Two-factor authentication enabled successfully',
    };
  }


  async disableTwoFactor(
    userId: string,
    token: string,
  ): Promise<{ success: boolean; message: string }> {
    const speakeasy = require('speakeasy');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.isTwoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('2FA is not enabled for this user');
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!verified) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isTwoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    this.logger.log(`2FA disabled for user ${userId}`);

    return {
      success: true,
      message: 'Two-factor authentication disabled successfully',
    };
  }

  async verifyTwoFactor(userId: string, token: string): Promise<boolean> {
    const speakeasy = require('speakeasy');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isTwoFactorEnabled || !user.twoFactorSecret) {
      return false;
    }

    return speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1,
    });
  }

  async isTwoFactorEnabled(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isTwoFactorEnabled: true,
      },
    });

    return user?.isTwoFactorEnabled ?? false;
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }
}
