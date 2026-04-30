import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    productId: string;
    userId: string;
    rating: number;
    title?: string;
    comment?: string;
    images?: string[];
    orderId?: string;
    variantId?: string;
  }) {
    const product = await this.prisma.product.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const existingReview = await this.prisma.review.findFirst({
      where: {
        productId: data.productId,
        userId: data.userId,
      },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this product');
    }

    if (data.rating < 1 || data.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    let isVerifiedPurchase = false;
    if (data.orderId) {
      isVerifiedPurchase = true;
    }

    const review = await this.prisma.review.create({
      data: {
        productId: data.productId,
        userId: data.userId,
        rating: data.rating,
        title: data.title,
        comment: data.comment,
        images: data.images || [],
        orderId: data.orderId,
        variantId: data.variantId,
        isVerifiedPurchase,
        status: 'PENDING' as any,
      },
      include: {
        user: {
          select: { id: true, username: true, avatar: true },
        },
      },
    });

    await this.updateProductRating(data.productId);

    return review;
  }

  async findByProductId(productId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId, status: 'APPROVED' as any },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, username: true, avatar: true },
          },
        },
      }),
      this.prisma.review.count({
        where: { productId, status: 'APPROVED' as any },
      }),
    ]);

    const ratingDistribution = await this.prisma.review.groupBy({
      by: ['rating'],
      where: { productId, status: 'APPROVED' as any },
      _count: true,
    });

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingDistribution.forEach(r => {
      distribution[r.rating as keyof typeof distribution] = r._count;
    });

    const avgRating = await this.prisma.review.aggregate({
      where: { productId, status: 'APPROVED' as any },
      _avg: { rating: true },
    });

    return {
      data: reviews,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      summary: {
        averageRating: avgRating._avg.rating || 0,
        distribution,
        totalReviews: total,
      },
    };
  }

  async findAllForAdmin(page = 1, limit = 20, status?: string, productId?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (productId) {
      where.productId = productId;
    }

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, username: true, avatar: true },
          },
          product: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      data: reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateStatus(reviewId: string, status: string, rejectionReason?: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        status: status as any,
        moderatedAt: new Date(),
        rejectionReason,
      },
    });

    if (status === 'APPROVED') {
      await this.updateProductRating(review.productId);
    }

    return updated;
  }

  async markHelpful(reviewId: string) {
    return this.prisma.review.update({
      where: { id: reviewId },
      data: { helpfulCount: { increment: 1 } },
    });
  }

  async reportReview(reviewId: string, userId: string) {
    return this.prisma.review.update({
      where: { id: reviewId },
      data: { reportCount: { increment: 1 } },
    });
  }

  private async updateProductRating(productId: string) {
    const aggregation = await this.prisma.review.aggregate({
      where: { productId, status: 'APPROVED' as any },
      _avg: { rating: true },
      _count: true,
    });

    const avgRating = aggregation._avg.rating || 0;
    const reviewCount = aggregation._count || 0;

    await this.prisma.$executeRaw`
      UPDATE products 
      SET average_rating = ${avgRating}, review_count = ${reviewCount}
      WHERE id = ${productId}
    `;
  }

  async addQuestion(data: { productId: string; userId: string; question: string }) {
    return { message: 'Question added', data };
  }

  async answerQuestion(data: { questionId: string; vendorId: string; answer: string }) {
    return { message: 'Answer added', data };
  }
}
