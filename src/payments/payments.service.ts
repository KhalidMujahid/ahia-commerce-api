import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../cache/redis.service';
import Stripe from 'stripe';
import Paystack from 'paystack';

export interface PaymentIntent {
  amount: number;
  currency: string;
  metadata?: Record<string, any>;
}

export interface EscrowHold {
  orderId: string;
  amount: number;
  releaseDate?: Date;
}

@Injectable()
export class PaymentsService {
  private stripe: Stripe;
  private paystack: any;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {
    const stripeKey = this.configService.get<string>('stripe.secretKey');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey, { apiVersion: '2025-02-24.acacia' });
    }

    const paystackKey = this.configService.get<string>('paystack.secretKey');
    if (paystackKey) {
      this.paystack = Paystack(paystackKey);
    }
  }

  async createStripePaymentIntent(data: PaymentIntent) {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const intent = await this.stripe.paymentIntents.create({
      amount: Math.round(data.amount * 100),
      currency: data.currency.toLowerCase(),
      metadata: data.metadata,
    });

    return {
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
    };
  }

  async verifyStripePayment(paymentIntentId: string) {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    return {
      status: intent.status,
      amount: intent.amount / 100,
      currency: intent.currency,
    };
  }

  async createPaystackPayment(data: PaymentIntent & { email: string }) {
    if (!this.paystack) {
      throw new BadRequestException('Paystack is not configured');
    }

    const response = await this.paystack.transaction.initialize({
      email: data.email,
      amount: Math.round(data.amount * 100),
      currency: data.currency,
      metadata: data.metadata,
    });

    return {
      authorizationUrl: response.data.authorization_url,
      reference: response.data.reference,
    };
  }

  async verifyPaystackPayment(reference: string) {
    if (!this.paystack) {
      throw new BadRequestException('Paystack is not configured');
    }

    const response = await this.paystack.transaction.verify(reference);
    return {
      status: response.data.status,
      amount: response.data.amount / 100,
      currency: response.data.currency,
      reference: response.data.reference,
    };
  }

  async holdInEscrow(userId: string, orderId: string, amount: number) {
    const escrowKey = `escrow:hold:${orderId}`;
    await this.redis.setJson(escrowKey, {
      orderId,
      amount,
      status: 'held',
      heldAt: new Date().toISOString(),
    }, 7 * 24 * 60 * 60);

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        amount,
        currency: 'USD',
        method: 'ESCROW' as any,
        type: 'ESCROW' as any,
        status: 'PROCESSING' as any,
        metadata: { orderId, escrowStatus: 'held' },
      },
    });

    return {
      escrowId: payment.id,
      status: 'held',
      amount,
      orderId,
    };
  }

  async releaseEscrow(orderId: string) {
    const escrowKey = `escrow:hold:${orderId}`;
    const escrowData = await this.redis.getJson<any>(escrowKey);

    if (!escrowData) {
      throw new BadRequestException('No escrow found for this order');
    }

    await this.redis.setJson(escrowKey, {
      ...escrowData,
      status: 'released',
      releasedAt: new Date().toISOString(),
    }, 24 * 60 * 60);

    await this.prisma.payment.updateMany({
      where: { metadata: { path: ['orderId'], equals: orderId } },
      data: {
        status: 'COMPLETED' as any,
        escrowStatus: 'released',
        escrowReleasedAt: new Date(),
      },
    });

    return {
      status: 'released',
      amount: escrowData.amount,
      orderId,
    };
  }

  async refundEscrow(orderId: string, amount?: number) {
    const escrowKey = `escrow:hold:${orderId}`;
    const escrowData = await this.redis.getJson<any>(escrowKey);

    if (!escrowData) {
      throw new BadRequestException('No escrow found for this order');
    }

    const refundAmount = amount || escrowData.amount;

    await this.redis.setJson(escrowKey, {
      ...escrowData,
      status: 'refunded',
      refundedAmount: refundAmount,
      refundedAt: new Date().toISOString(),
    }, 24 * 60 * 60);

    await this.prisma.payment.updateMany({
      where: { metadata: { path: ['orderId'], equals: orderId } },
      data: {
        status: 'REFUNDED' as any,
        escrowStatus: 'refunded',
      },
    });

    return {
      status: 'refunded',
      amount: refundAmount,
      orderId,
    };
  }

  async getEscrowStatus(orderId: string) {
    const escrowKey = `escrow:hold:${orderId}`;
    const escrowData = await this.redis.getJson<any>(escrowKey);

    if (!escrowData) {
      return { status: 'not_found', orderId };
    }

    return {
      status: escrowData.status,
      amount: escrowData.amount,
      heldAt: escrowData.heldAt,
      releasedAt: escrowData.releasedAt,
      refundedAt: escrowData.refundedAt,
      orderId,
    };
  }

  async createWalletDeposit(userId: string, amount: number) {
    let wallet = await this.prisma.wallet.findFirst({
      where: { userId, type: 'customer' },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: { userId, type: 'customer' },
      });
    }

    const transaction = await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'deposit',
        amount,
        currency: 'USD',
        reference: `WALLET-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        status: 'completed',
      },
    });

    await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: amount } },
    });

    return { transaction, wallet };
  }

  async getWalletBalance(userId: string) {
    const wallet = await this.prisma.wallet.findFirst({
      where: { userId, type: 'customer' },
    });

    return { balance: wallet?.balance || 0 };
  }

  async processVendorPayout(vendorId: string, amount: number, method: string = 'bank_transfer') {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new BadRequestException('Vendor not found');
    }

    const commissionRate = vendor.commissionRate || 10;
    const commission = amount * (commissionRate / 100);
    const netAmount = amount - commission;

    const payout = await this.prisma.payout.create({
      data: {
        vendorId,
        amount,
        currency: 'USD',
        grossAmount: amount,
        commission,
        netAmount,
        method,
        status: 'pending',
      },
    });

    try {
      if (method === 'stripe' && this.stripe) {
        const vendorMetadata = vendor.kycDocuments as Record<string, any> || {};
        const stripeAccountId = vendorMetadata.stripeAccountId;

        if (stripeAccountId) {
          const transfer = await this.stripe.transfers.create({
            amount: Math.round(netAmount * 100),
            currency: 'usd',
            destination: stripeAccountId,
            metadata: {
              payoutId: payout.id,
              vendorId: vendor.id,
              orderId: vendorMetadata.lastOrderId || '',
            },
          });

          await this.prisma.payout.update({
            where: { id: payout.id },
            data: {
              status: 'completed',
              transactionId: transfer.id,
            },
          });

          return {
            ...payout,
            status: 'completed',
            transactionId: transfer.id,
            message: 'Payout completed via Stripe Connect',
          };
        }
      } else if (method === 'paystack' && this.paystack) {
        const vendorMetadata = vendor.kycDocuments as Record<string, any> || {};
        const paystackRecipientCode = vendorMetadata.paystackRecipientCode;

        if (paystackRecipientCode) {
          const transfer = await this.paystack.transfer.initiate({
            source: 'balance',
            amount: Math.round(netAmount * 100),
            recipient: paystackRecipientCode,
            reason: `Vendor payout for vendor ${vendor.storeName}`,
          });

          await this.prisma.payout.update({
            where: { id: payout.id },
            data: {
              status: 'completed',
              transactionId: transfer.data.reference,
            },
          });

          return {
            ...payout,
            status: 'completed',
            transactionId: transfer.data.reference,
            message: 'Payout completed via Paystack',
          };
        }
      }
    } catch (error) {
      console.error('Payout transfer failed:', error);
      await this.prisma.payout.update({
        where: { id: payout.id },
        data: {
          status: 'failed',
          gatewayResponse: { error: error.message },
        },
      });
    }

    return payout;
  }

  async createVendorStripeAccount(vendorId: string, email: string) {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const account = await this.stripe.accounts.create({
      type: 'express',
      email,
      metadata: {
        vendorId,
      },
      capabilities: {
        transfers: { requested: true },
      },
    });

    await this.prisma.vendor.update({
      where: { id: vendorId },
      data: {
        kycDocuments: {
          stripeAccountId: account.id,
        },
      },
    });

    const accountLink = await this.stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${this.configService.get('app.frontendUrl')}/vendor/stripe/reauth`,
      return_url: `${this.configService.get('app.frontendUrl')}/vendor/stripe/connected`,
      type: 'account_onboarding',
    });

    return {
      accountId: account.id,
      onboardingUrl: accountLink.url,
    };
  }

  async getVendorStripeOnboardingLink(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new BadRequestException('Vendor not found');
    }

    const vendorMetadata = vendor.kycDocuments as Record<string, any> || {};
    const stripeAccountId = vendorMetadata.stripeAccountId;

    if (!stripeAccountId || !this.stripe) {
      throw new BadRequestException('Stripe account not set up');
    }

    const accountLink = await this.stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${this.configService.get('app.frontendUrl')}/vendor/stripe/reauth`,
      return_url: `${this.configService.get('app.frontendUrl')}/vendor/stripe/connected`,
      type: 'account_onboarding',
    });

    return { onboardingUrl: accountLink.url };
  }
}
