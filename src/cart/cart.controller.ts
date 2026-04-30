import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto, RemoveCartItemDto } from './dto/cart.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user cart' })
  @ApiResponse({ status: 200, description: 'Returns the user cart' })
  async getCart(@Request() req) {
    return this.cartService.getCart(req.user.id);
  }

  @Get('summary')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get cart summary with vendor grouping' })
  @ApiResponse({ status: 200, description: 'Returns cart with items grouped by vendor' })
  async getCartSummary(@Request() req) {
    return this.cartService.getCartSummary(req.user.id);
  }

  @Get('count')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get cart item count' })
  @ApiResponse({ status: 200, description: 'Returns total item count in cart' })
  async getCartCount(@Request() req) {
    return { count: await this.cartService.getCartItemCount(req.user.id) };
  }

  @Post('items')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({ status: 201, description: 'Item added to cart' })
  async addItem(@Request() req, @Body() dto: AddToCartDto) {
    return this.cartService.addItem(req.user.id, dto);
  }

  @Put('items/:cartItemId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiResponse({ status: 200, description: 'Cart item updated' })
  async updateItem(
    @Request() req,
    @Param('cartItemId') cartItemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(req.user.id, cartItemId, dto);
  }

  @Delete('items/:cartItemId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiResponse({ status: 200, description: 'Item removed from cart' })
  async removeItem(@Request() req, @Param('cartItemId') cartItemId: string) {
    return this.cartService.removeItem(req.user.id, cartItemId);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Clear cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared' })
  async clearCart(@Request() req) {
    return this.cartService.clearCart(req.user.id);
  }
}
