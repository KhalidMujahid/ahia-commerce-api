import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/constants';
import { UserRole } from '../auth/constants';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review' })
  @ApiResponse({ status: 201, description: 'Review created' })
  async create(@Request() req: any, @Body() data: {
    productId: string;
    rating: number;
    title?: string;
    comment?: string;
    images?: string[];
    orderId?: string;
    variantId?: string;
  }) {
    return this.reviewsService.create({ ...data, userId: req.user.id });
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get product reviews' })
  @ApiResponse({ status: 200, description: 'Reviews retrieved' })
  async getProductReviews(
    @Param('productId') productId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewsService.findByProductId(productId, page || 1, limit || 20);
  }

  @Post(':id/helpful')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark review as helpful' })
  @ApiResponse({ status: 200, description: 'Review marked as helpful' })
  async markHelpful(@Param('id') id: string) {
    return this.reviewsService.markHelpful(id);
  }

  @Post(':id/report')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Report a review' })
  @ApiResponse({ status: 200, description: 'Review reported' })
  async reportReview(@Request() req: any, @Param('id') id: string) {
    return this.reviewsService.reportReview(id, req.user.id);
  }

  @Put(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve review (Admin)' })
  @ApiResponse({ status: 200, description: 'Review approved' })
  async approveReview(@Param('id') id: string) {
    return this.reviewsService.updateStatus(id, 'APPROVED');
  }

  @Put(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject review (Admin)' })
  @ApiResponse({ status: 200, description: 'Review rejected' })
  async rejectReview(@Param('id') id: string, @Body() data: { reason: string }) {
    return this.reviewsService.updateStatus(id, 'REJECTED', data.reason);
  }

  @Post('questions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ask a question about product' })
  @ApiResponse({ status: 201, description: 'Question added' })
  async askQuestion(@Request() req: any, @Body() data: { productId: string; question: string }) {
    return this.reviewsService.addQuestion({ ...data, userId: req.user.id });
  }

  @Post('questions/:id/answer')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Answer a question (Vendor)' })
  @ApiResponse({ status: 201, description: 'Answer added' })
  async answerQuestion(@Request() req: any, @Param('id') id: string, @Body() data: { answer: string }) {
    const vendor = req.user.vendor;
    if (!vendor) {
      throw new Error('You must have a vendor account');
    }
    return this.reviewsService.answerQuestion({ questionId: id, vendorId: vendor.id, answer: data.answer });
  }
}
