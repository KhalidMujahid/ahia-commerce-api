import { Controller, Post, Get, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('stripe/intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe payment intent' })
  @ApiResponse({ status: 201, description: 'Payment intent created' })
  async createStripeIntent(@Body() data: { amount: number; currency: string; metadata?: Record<string, any> }) {
    return this.paymentsService.createStripePaymentIntent(data);
  }

  @Post('stripe/verify/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify Stripe payment' })
  @ApiResponse({ status: 200, description: 'Payment verified' })
  async verifyStripePayment(@Param('id') id: string) {
    return this.paymentsService.verifyStripePayment(id);
  }

  @Post('paystack/initiate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate Paystack payment' })
  @ApiResponse({ status: 201, description: 'Payment initiated' })
  async initiatePaystackPayment(@Body() data: { amount: number; currency: string; email: string; metadata?: Record<string, any> }) {
    return this.paymentsService.createPaystackPayment(data);
  }

  @Post('paystack/verify/:reference')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify Paystack payment' })
  @ApiResponse({ status: 200, description: 'Payment verified' })
  async verifyPaystackPayment(@Param('reference') reference: string) {
    return this.paymentsService.verifyPaystackPayment(reference);
  }

  @Post('escrow/hold')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Hold payment in escrow' })
  @ApiResponse({ status: 201, description: 'Payment held in escrow' })
  async holdInEscrow(@Request() req: any, @Body() data: { orderId: string; amount: number }) {
    return this.paymentsService.holdInEscrow(req.user.id, data.orderId, data.amount);
  }

  @Post('escrow/release/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Release escrow payment' })
  @ApiResponse({ status: 200, description: 'Escrow released' })
  async releaseEscrow(@Param('orderId') orderId: string) {
    return this.paymentsService.releaseEscrow(orderId);
  }

  @Post('escrow/refund/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refund escrow payment' })
  @ApiResponse({ status: 200, description: 'Escrow refunded' })
  async refundEscrow(@Param('orderId') orderId: string, @Body() data: { amount?: number }) {
    return this.paymentsService.refundEscrow(orderId, data.amount);
  }

  @Get('escrow/status/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get escrow status' })
  @ApiResponse({ status: 200, description: 'Escrow status retrieved' })
  async getEscrowStatus(@Param('orderId') orderId: string) {
    return this.paymentsService.getEscrowStatus(orderId);
  }

  @Post('wallet/deposit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deposit to wallet' })
  @ApiResponse({ status: 201, description: 'Deposit successful' })
  async depositToWallet(@Request() req: any, @Body() data: { amount: number }) {
    return this.paymentsService.createWalletDeposit(req.user.id, data.amount);
  }

  @Get('wallet/balance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get wallet balance' })
  @ApiResponse({ status: 200, description: 'Balance retrieved' })
  async getWalletBalance(@Request() req: any) {
    return this.paymentsService.getWalletBalance(req.user.id);
  }

  @Post('vendor/payout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process vendor payout' })
  @ApiResponse({ status: 201, description: 'Payout processed' })
  async processVendorPayout(@Request() req: any, @Body() data: { amount: number; vendorId: string; method?: string }) {
    return this.paymentsService.processVendorPayout(data.vendorId, data.amount, data.method);
  }
}
