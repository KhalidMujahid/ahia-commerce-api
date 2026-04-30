import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../cache/redis.service';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async create(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    channel: string;
    data?: Record<string, any>;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        channel: data.channel,
        data: data.data as any,
        sentAt: new Date(),
      },
    });

    const realtimeKey = `notifications:realtime:${data.userId}`;
    await this.redis.lpush(realtimeKey, JSON.stringify(notification));
    await this.redis.expire(realtimeKey, 3600);

    return notification;
  }

  async findByUserId(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      data: notifications,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      unreadCount,
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async delete(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.delete({ where: { id: notificationId } });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return { unreadCount: count };
  }

  async notifyOrderPlaced(userId: string, orderId: string, orderNumber: string) {
    return this.create({
      userId,
      type: 'order',
      title: 'Order Placed',
      message: `Your order ${orderNumber} has been placed successfully.`,
      channel: 'in_app',
      data: { orderId, orderNumber },
    });
  }

  async notifyOrderStatusChanged(userId: string, orderId: string, status: string) {
    return this.create({
      userId,
      type: 'order',
      title: 'Order Status Updated',
      message: `Your order status has been updated to: ${status}`,
      channel: 'in_app',
      data: { orderId, status },
    });
  }

  async notifyPaymentReceived(userId: string, orderId: string, amount: number) {
    return this.create({
      userId,
      type: 'payment',
      title: 'Payment Received',
      message: `Payment of $${amount} has been received for your order.`,
      channel: 'in_app',
      data: { orderId, amount },
    });
  }

  async notifyNewReview(userId: string, productId: string, productName: string) {
    return this.create({
      userId,
      type: 'review',
      title: 'New Review',
      message: `Someone reviewed your product "${productName}"`,
      channel: 'in_app',
      data: { productId },
    });
  }

  async notifyNewOrder(vendorId: string, orderId: string, orderNumber: string) {
    return this.create({
      userId: vendorId,
      type: 'order',
      title: 'New Order Received',
      message: `You have a new order: ${orderNumber}`,
      channel: 'in_app',
      data: { orderId, orderNumber },
    });
  }

  async notifyDeliveryAssigned(
    userId: string,
    orderId: string,
    companyName: string,
    riderName?: string,
  ) {
    return this.create({
      userId,
      type: 'delivery',
      title: 'Delivery Assigned',
      message: riderName
        ? `Your order has been assigned to ${companyName} and rider ${riderName}.`
        : `Your order has been assigned to ${companyName}.`,
      channel: 'in_app',
      data: { orderId, companyName, riderName },
    });
  }

  async notifyDeliveryStatusChanged(
    userId: string,
    orderId: string,
    status: string,
    riderName?: string,
  ) {
    return this.create({
      userId,
      type: 'delivery',
      title: 'Delivery Status Updated',
      message: riderName
        ? `Your delivery is now ${status} with ${riderName}.`
        : `Your delivery is now ${status}.`,
      channel: 'in_app',
      data: { orderId, status, riderName },
    });
  }

  async broadcast(title: string, message: string, data?: Record<string, any>) {
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    const notifications = users.map(user =>
      this.create({
        userId: user.id,
        type: 'system',
        title,
        message,
        channel: 'in_app',
        data,
      }),
    );

    return Promise.all(notifications);
  }
}
