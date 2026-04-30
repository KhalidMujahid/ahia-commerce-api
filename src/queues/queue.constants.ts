import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';

export const QUEUE_NAMES = {
  EMAIL: 'email-queue',
  NOTIFICATION: 'notification-queue',
  PAYMENT: 'payment-queue',
  ORDER: 'order-queue',
  PRODUCT_INDEX: 'product-index-queue',
  ANALYTICS: 'analytics-queue',
  ESCROW: 'escrow-queue',
} as const;

@Injectable()
export class QueueService {
  constructor(private configService: ConfigService) {}

  createQueue(name: string): Queue {
    return new Queue(name, {
      connection: {
        host: this.configService.get<string>('redis.host') || 'localhost',
        port: this.configService.get<number>('redis.port') || 6379,
        password: this.configService.get<string>('redis.password') || undefined,
      },
    });
  }

  createWorker(
    name: string,
    processor: (job: any) => Promise<any>,
    options?: any,
  ): Worker {
    return new Worker(name, processor, {
      connection: {
        host: this.configService.get<string>('redis.host') || 'localhost',
        port: this.configService.get<number>('redis.port') || 6379,
        password: this.configService.get<string>('redis.password') || undefined,
      },
      ...options,
    });
  }

  async addEmailJob(data: {
    to: string;
    subject: string;
    template: string;
    context?: Record<string, any>;
  }) {
    const queue = this.createQueue(QUEUE_NAMES.EMAIL);
    return queue.add('send-email', data);
  }

  async addNotificationJob(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    data?: Record<string, any>;
  }) {
    const queue = this.createQueue(QUEUE_NAMES.NOTIFICATION);
    return queue.add('send-notification', data);
  }

  async addPaymentJob(data: {
    orderId: string;
    action: 'process' | 'refund' | 'escrow_hold' | 'escrow_release';
    amount: number;
    metadata?: Record<string, any>;
  }) {
    const queue = this.createQueue(QUEUE_NAMES.PAYMENT);
    return queue.add('process-payment', data);
  }

  async addOrderJob(data: {
    orderId: string;
    action: string;
    vendorId?: string;
    metadata?: Record<string, any>;
  }) {
    const queue = this.createQueue(QUEUE_NAMES.ORDER);
    return queue.add('process-order', data);
  }

  async addProductIndexJob(data: {
    productId: string;
    action: 'index' | 'update' | 'delete';
  }) {
    const queue = this.createQueue(QUEUE_NAMES.PRODUCT_INDEX);
    return queue.add('index-product', data);
  }

  async addAnalyticsJob(data: {
    event: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, any>;
  }) {
    const queue = this.createQueue(QUEUE_NAMES.ANALYTICS);
    return queue.add('track-event', data);
  }

  async addEscrowJob(data: {
    orderId: string;
    action: 'hold' | 'release' | 'auto_release';
    daysUntilRelease?: number;
  }) {
    const queue = this.createQueue(QUEUE_NAMES.ESCROW);
    return queue.add('process-escrow', data);
  }
}
