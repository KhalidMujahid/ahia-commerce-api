import { Controller, Post, Body, Get, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor/two-factor.service';
import { UsersService } from '../users/users.service';
import { 
  AdminRegisterDto,
  RegisterDto, 
  LoginDto, 
  RefreshTokenDto, 
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyOtpDto,
  ResendOtpDto
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './constants';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly twoFactorService: TwoFactorService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('admin/register')
  @ApiOperation({ summary: 'Register a new admin or super admin' })
  @ApiResponse({ status: 201, description: 'Admin successfully registered' })
  @ApiResponse({ status: 403, description: 'Invalid admin registration secret' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async registerAdmin(@Body() adminRegisterDto: AdminRegisterDto) {
    return this.authService.registerAdmin(adminRegisterDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'User successfully logged in' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login admin or super admin' })
  @ApiResponse({ status: 200, description: 'Admin successfully logged in' })
  @ApiResponse({ status: 401, description: 'Invalid admin credentials' })
  async loginAdmin(@Body() loginDto: LoginDto) {
    return this.authService.loginAdmin(loginDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'User successfully logged out' })
  async logout(@Request() req: any) {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader ? authHeader.replace('Bearer ', '') : '';
    return this.authService.logout(req.user.id, accessToken);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset OTP' })
  @ApiResponse({ status: 200, description: 'OTP sent if email exists' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP for password reset' })
  @ApiResponse({ status: 200, description: 'OTP verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async verifyOTP(@Body() verifyOtpDto: VerifyOtpDto) {
    const isValid = await this.authService.verifyOTP(verifyOtpDto.userId, verifyOtpDto.otp);
    if (!isValid) {
      return { valid: false, message: 'Invalid or expired OTP' };
    }
    return { valid: true, message: 'OTP verified successfully' };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password after OTP verification' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired reset token' })
  async resetPassword(@Body() body: { userId: string; newPassword: string }) {
    return this.authService.resetPassword(body.userId, body.newPassword);
  }

  @Public()
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend OTP to user email' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  async resendOTP(@Body() resendOtpDto: ResendOtpDto) {
    return this.authService.resendOTP(resendOtpDto.userId, resendOtpDto.purpose);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid current password' })
  async changePassword(@Request() req: any, @Body() changePasswordDto: ChangePasswordDto) {
    return this.authService.changePassword(
      req.user.id,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  async getProfile(@Request() req: any) {
    return req.user;
  }


  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Setup 2FA for user account' })
  @ApiResponse({ status: 200, description: '2FA secret and QR code generated' })
  async setupTwoFactor(@Request() req: any) {
    const user = await this.usersService.findById(req.user.id);
    return this.twoFactorService.setupTwoFactor(req.user.id, user.email);
  }

  @Post('2fa/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify and enable 2FA' })
  @ApiResponse({ status: 200, description: '2FA enabled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid verification code' })
  async verifyTwoFactor(@Request() req: any, @Body() body: { token: string }) {
    return this.twoFactorService.verifyAndEnableTwoFactor(req.user.id, body.token);
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable 2FA for user account' })
  @ApiResponse({ status: 200, description: '2FA disabled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid verification code' })
  async disableTwoFactor(@Request() req: any, @Body() body: { token: string }) {
    return this.twoFactorService.disableTwoFactor(req.user.id, body.token);
  }

  @Public()
  @Post('2fa/verify-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify 2FA token during login' })
  @ApiResponse({ status: 200, description: '2FA verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid 2FA token' })
  async verifyTwoFactorLogin(@Body() body: { userId: string; token: string }) {
    const isValid = await this.twoFactorService.verifyTwoFactor(body.userId, body.token);
    if (!isValid) {
      return { success: false, message: 'Invalid 2FA token' };
    }
    return { success: true, message: '2FA verified successfully' };
  }

  @Get('2fa/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if 2FA is enabled' })
  @ApiResponse({ status: 200, description: '2FA status retrieved' })
  async getTwoFactorStatus(@Request() req: any) {
    const isEnabled = await this.twoFactorService.isTwoFactorEnabled(req.user.id);
    return { isTwoFactorEnabled: isEnabled };
  }
}
