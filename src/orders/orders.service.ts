import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument, OrderStatus, PaymentStatus } from '../database/mongo/schemas/order.schema';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../cache/redis.service';
import { v4 as uuidv4 } from 'uuid';

interface VendorOrderItem {
  productId: string;
  variantId?: string;
  quantity: number;
  productName?: string;
  price?: number;
  total?: number;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async create(data: {
    userId: string;
    items: Array<{
      productId: string;
      variantId?: string;
      quantity: number;
    }>;
    shippingAddress: any;
    paymentMethod: string;
  }) {
    const vendorItemsMap = new Map<string, VendorOrderItem[]>();
    
    for (const item of data.items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
        include: { vendor: true },
      });

      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }

      if (!product.vendor) {
        throw new BadRequestException(`Product ${item.productId} has no vendor`);
      }

      const vendorId = product.vendor.id;
      if (!vendorItemsMap.has(vendorId)) {
        vendorItemsMap.set(vendorId, []);
      }

      const price = product.priceCurrent;
      vendorItemsMap.get(vendorId)!.push({
        ...item,
        productName: product.name,
        price,
        total: price * item.quantity,
      });
    }

    const vendorOrders: Array<{
      vendorId: Types.ObjectId;
      vendorName: string;
      items: VendorOrderItem[];
      subtotal: number;
      shippingCost: number;
      tax: number;
      total: number;
      status: OrderStatus;
    }> = [];
    let totalAmount = 0;

    for (const [vendorId, items] of vendorItemsMap) {
      const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
      
      const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
      const shippingCost = 5;
      const tax = subtotal * 0.1;
      const total = subtotal + shippingCost + tax;

      vendorOrders.push({
        vendorId: new Types.ObjectId(vendorId),
        vendorName: vendor?.storeName || 'Unknown Store',
        items,
        subtotal,
        shippingCost,
        tax,
        total,
        status: OrderStatus.PENDING,
      });

      totalAmount += total;
    }

    const orderNumber = `AHG-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

    const order = await this.orderModel.create({
      orderNumber,
      userId: new Types.ObjectId(data.userId),
      vendorOrders,
      totalAmount,
      currency: 'USD',
      paymentMethod: data.paymentMethod as any,
      paymentStatus: PaymentStatus.PENDING,
      shippingAddress: data.shippingAddress,
      shippingCost: vendorOrders.length * 5,
      tax: vendorOrders.reduce((sum, vo) => sum + vo.tax, 0),
      discount: 0,
      status: OrderStatus.PENDING,
      timeline: [{
        status: OrderStatus.PENDING,
        date: new Date(),
        description: 'Order placed',
      }],
    });

    return order;
  }

  async findById(orderId: string) {
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async findByUserId(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      this.orderModel.find({ userId: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.orderModel.countDocuments({ userId: new Types.ObjectId(userId) }),
    ]);

    return { data: orders, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findByVendorId(vendorId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      this.orderModel.find({ 'vendorOrders.vendorId': new Types.ObjectId(vendorId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.orderModel.countDocuments({ 'vendorOrders.vendorId': new Types.ObjectId(vendorId) }),
    ]);

    return { data: orders, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findAllOrders(page = 1, limit = 20, status?: string, paymentStatus?: string) {
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {};

    if (status) {
      filter.status = status;
    }

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    const [orders, total] = await Promise.all([
      this.orderModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.orderModel.countDocuments(filter),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateStatus(orderId: string, status: OrderStatus, vendorId?: string, note?: string) {
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (vendorId) {
      const vendorOrderIndex = order.vendorOrders.findIndex(
        vo => vo.vendorId.toString() === vendorId
      );

      if (vendorOrderIndex === -1) {
        throw new BadRequestException('Order does not belong to this vendor');
      }

      order.vendorOrders[vendorOrderIndex].status = status;
      
      if (status === OrderStatus.DELIVERED) {
        order.vendorOrders[vendorOrderIndex].deliveredAt = new Date();
      }
    } else {
      order.status = status;
    }

    order.timeline.push({
      status,
      date: new Date(),
      description: `Status updated to ${status}`,
      note,
    });

    if (status === OrderStatus.DELIVERED) {
      order.deliveredAt = new Date();
    }

    await order.save();

    if (vendorId && (status === OrderStatus.DELIVERED || status === OrderStatus.CONFIRMED)) {
      await this.updateVendorStats(vendorId);
    }

    return order;
  }

  async updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus, transactionId?: string) {
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    order.paymentStatus = paymentStatus;
    if (transactionId) {
      order.transactionId = transactionId;
    }

    if (paymentStatus === PaymentStatus.COMPLETED) {
      order.status = OrderStatus.CONFIRMED;
      order.vendorOrders.forEach(vo => {
        vo.status = OrderStatus.CONFIRMED;
      });
      order.timeline.push({
        status: OrderStatus.CONFIRMED,
        date: new Date(),
        description: 'Payment confirmed, order processing',
      });
    }

    await order.save();
    return order;
  }

  async cancelOrder(orderId: string, reason: string) {
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.paymentStatus === PaymentStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel paid orders. Please request a refund instead.');
    }

    order.status = OrderStatus.CANCELLED;
    order.cancelledAt = new Date();
    order.cancellationReason = reason;
    order.timeline.push({
      status: OrderStatus.CANCELLED,
      date: new Date(),
      description: 'Order cancelled',
      note: reason,
    });

    await order.save();
    return order;
  }

  async getVendorOrderStats(vendorId: string) {
    const pipeline = [
      { $match: { 'vendorOrders.vendorId': new Types.ObjectId(vendorId) } },
      { $unwind: '$vendorOrders' },
      { $match: { 'vendorOrders.vendorId': new Types.ObjectId(vendorId) } },
      {
        $group: {
          _id: '$vendorOrders.status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$vendorOrders.total' },
        },
      },
    ];

    const stats = await this.orderModel.aggregate(pipeline);

    const result = {
      pending: { count: 0, amount: 0 },
      confirmed: { count: 0, amount: 0 },
      processing: { count: 0, amount: 0 },
      shipped: { count: 0, amount: 0 },
      delivered: { count: 0, amount: 0 },
    };

    stats.forEach(s => {
      const status = String(s._id).toLowerCase();
      if (result[status as keyof typeof result]) {
        result[status as keyof typeof result] = { count: s.count, amount: s.totalAmount };
      }
    });

    return result;
  }

  private async updateVendorStats(vendorId: string) {
    const stats = await this.getVendorOrderStats(vendorId);
    
    await this.prisma.vendor.update({
      where: { id: vendorId },
      data: {
        totalOrders: Object.values(stats).reduce((sum, s: any) => sum + s.count, 0),
        totalSales: Object.values(stats).reduce((sum, s: any) => sum + s.amount, 0),
      },
    });
  }

  async getOrderTimeline(orderId: string) {
    const order = await this.orderModel.findById(orderId).select('timeline');
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order.timeline;
  }
}
