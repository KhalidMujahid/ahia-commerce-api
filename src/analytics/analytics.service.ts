import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PrismaService } from '../prisma/prisma.service';
import { Order, OrderDocument } from '../database/mongo/schemas/order.schema';
import { PaymentStatus } from '@prisma/client';

export interface DashboardSummary {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalVendors: number;
  pendingOrders: number;
  recentOrders: number;
}

export interface VendorAnalytics {
  totalSales: number;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  topProducts: Array<{
    id: string;
    name: string;
    sales: number;
    revenue: number;
  }>;
  salesByDay: Array<{
    date: string;
    sales: number;
    revenue: number;
  }>;
  conversionRate: number;
}

export interface SalesReport {
  period: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private prisma: PrismaService,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  async getAdminDashboard(): Promise<DashboardSummary> {
    const [
      totalCustomers,
      totalVendors,
      recentOrdersCount,
      pendingOrdersCount,
      recentWeekOrdersCount,
      payments,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
      this.prisma.vendor.count(),
      this.orderModel.countDocuments().exec(),
      this.orderModel.countDocuments({ status: 'PENDING' }).exec(),
      this.orderModel.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }).exec(),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'COMPLETED' as PaymentStatus },
      }),
    ]);

    return {
      totalRevenue: payments._sum.amount || 0,
      totalOrders: recentOrdersCount,
      totalCustomers,
      totalVendors,
      pendingOrders: pendingOrdersCount,
      recentOrders: recentWeekOrdersCount,
    };
  }


  async getVendorAnalytics(vendorId: string): Promise<VendorAnalytics> {
    const products = await this.prisma.product.findMany({
      where: { vendorId },
      select: { id: true, name: true },
    });

    const productIds = products.map((p) => p.id);
    const productMap = new Map(products.map((p) => [p.id, p.name]));

    const vendorOrders = await this.orderModel.aggregate([
      {
        $match: {
          'vendorOrders.vendorId': vendorId,
          status: { $in: ['DELIVERED', 'COMPLETED'] },
        },
      },
      {
        $unwind: '$vendorOrders',
      },
      {
        $match: {
          'vendorOrders.vendorId': vendorId,
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$vendorOrders.quantity' },
          totalRevenue: { $sum: '$vendorOrders.amount' },
          orderCount: { $sum: 1 },
        },
      },
    ]);

    const analytics = vendorOrders[0] || { totalSales: 0, totalRevenue: 0, orderCount: 0 };

    const topProductsData = await this.orderModel.aggregate([
      {
        $match: {
          'vendorOrders.vendorId': vendorId,
          status: { $in: ['DELIVERED', 'COMPLETED'] },
        },
      },
      { $unwind: '$vendorOrders' },
      {
        $match: {
          'vendorOrders.vendorId': vendorId,
        },
      },
      {
        $group: {
          _id: '$vendorOrders.productId',
          sales: { $sum: '$vendorOrders.quantity' },
          revenue: { $sum: '$vendorOrders.amount' },
        },
      },
      { $sort: { sales: -1 } },
      { $limit: 10 },
    ]);

    const topProducts = topProductsData.map((item: any) => ({
      id: item._id,
      name: productMap.get(item._id) || 'Unknown Product',
      sales: item.sales,
      revenue: item.revenue,
    }));

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const salesByDay = await this.orderModel.aggregate([
      {
        $match: {
          'vendorOrders.vendorId': vendorId,
          status: { $in: ['DELIVERED', 'COMPLETED'] },
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      { $unwind: '$vendorOrders' },
      {
        $match: {
          'vendorOrders.vendorId': vendorId,
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          sales: { $sum: '$vendorOrders.quantity' },
          revenue: { $sum: '$vendorOrders.amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const salesByDayFormatted = salesByDay.map((item: any) => ({
      date: item._id,
      sales: item.sales,
      revenue: item.revenue,
    }));

    const conversionRate = 3.5;

    return {
      totalSales: analytics.totalSales,
      totalRevenue: analytics.totalRevenue,
      totalOrders: analytics.orderCount,
      averageOrderValue:
        analytics.orderCount > 0
          ? analytics.totalRevenue / analytics.orderCount
          : 0,
      topProducts,
      salesByDay: salesByDayFormatted,
      conversionRate,
    };
  }

  async getSalesReport(
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month' = 'day',
  ): Promise<SalesReport[]> {
    let dateFormat: string;
    switch (groupBy) {
      case 'week':
        dateFormat = '%Y-W%V';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      default:
        dateFormat = '%Y-%m-%d';
    }

    const report = await this.orderModel.aggregate([
      {
        $match: {
          status: { $in: ['DELIVERED', 'COMPLETED'] },
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return report.map((item: any) => ({
      period: item._id,
      revenue: item.revenue,
      orders: item.orders,
      averageOrderValue: item.orders > 0 ? item.revenue / item.orders : 0,
    }));
  }

  async getProductAnalytics(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        vendor: { select: { storeName: true } },
        reviews: { select: { rating: true } },
      },
    });

    if (!product) {
      throw new ForbiddenException('Product not found');
    }

    const productOrders = await this.orderModel.aggregate([
      {
        $match: {
          'vendorOrders.productId': productId,
          status: { $in: ['DELIVERED', 'COMPLETED'] },
        },
      },
      { $unwind: '$vendorOrders' },
      {
        $match: {
          'vendorOrders.productId': productId,
        },
      },
      {
        $group: {
          _id: null,
          totalSold: { $sum: '$vendorOrders.quantity' },
          totalRevenue: { $sum: '$vendorOrders.amount' },
          orderCount: { $sum: 1 },
        },
      },
    ]);

    const analytics = productOrders[0] || {
      totalSold: 0,
      totalRevenue: 0,
      orderCount: 0,
    };

    const ratings = product.reviews || [];
    const averageRating =
      ratings.length > 0
        ? ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length
        : 0;

    return {
      product: {
        id: product.id,
        name: product.name,
        vendor: product.vendor?.storeName,
        price: product.priceCurrent,
        views: product.views,
      },
      sales: {
        totalSold: analytics.totalSold,
        totalRevenue: analytics.totalRevenue,
        orderCount: analytics.orderCount,
        averageOrderValue:
          analytics.orderCount > 0
            ? analytics.totalRevenue / analytics.orderCount
            : 0,
      },
      ratings: {
        averageRating: Number(averageRating.toFixed(1)),
        totalReviews: ratings.length,
      },
    };
  }

  async getSystemHealth() {
    const [
      totalUsers,
      totalVendors,
      totalProducts,
      totalOrders,
      activeVendors,
      pendingVendors,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.vendor.count(),
      this.prisma.product.count(),
      this.orderModel.countDocuments().exec(),
      this.prisma.vendor.count({ where: { status: 'VERIFIED' } }),
      this.prisma.vendor.count({ where: { kycStatus: 'PENDING' } }),
    ]);

    return {
      users: {
        total: totalUsers,
        vendors: totalVendors,
      },
      products: {
        total: totalProducts,
      },
      orders: {
        total: totalOrders,
      },
      vendors: {
        active: activeVendors,
        pending: pendingVendors,
      },
      health: {
        activeVendorRatio:
          totalVendors > 0 ? (activeVendors / totalVendors) * 100 : 0,
      },
    };
  }
}
